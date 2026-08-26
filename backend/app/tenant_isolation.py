import logging
from contextvars import ContextVar
from sqlalchemy import Column, ForeignKey, Integer, text
from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria

logger = logging.getLogger("masjid_app.tenant")

_current_tenant_id = ContextVar("current_tenant_id", default=None)

TENANT_MODELS = ()
_REGISTERED = False


def set_current_tenant(tenant_id):
    return _current_tenant_id.set(int(tenant_id) if tenant_id is not None else None)


def reset_current_tenant(token):
    _current_tenant_id.reset(token)


def get_current_tenant():
    return _current_tenant_id.get()


def attach_tenant_columns():
    """Attach the tenant ownership field to community/collection ORM models."""
    global TENANT_MODELS
    from app.models.community import (
        Family, FamilyMember, FamilyHeadChange, MemberRequest, CommunityFunction
    )
    from app.models.collections import SanthaCollection, JumaCollection, Donation

    TENANT_MODELS = (
        Family, FamilyMember, FamilyHeadChange, MemberRequest, CommunityFunction,
        SanthaCollection, JumaCollection, Donation,
    )

    for model in TENANT_MODELS:
        if "masjid_id" not in model.__table__.c:
            setattr(
                model,
                "masjid_id",
                Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True),
            )


def register_tenant_events():
    """Automatically filter and stamp tenant-owned ORM records for authenticated users."""
    global _REGISTERED
    if _REGISTERED:
        return

    @event.listens_for(Session, "do_orm_execute")
    def _apply_tenant_filter(execute_state):
        tenant_id = get_current_tenant()
        if tenant_id is None or not execute_state.is_select:
            return

        statement = execute_state.statement
        for model in TENANT_MODELS:
            statement = statement.options(
                with_loader_criteria(
                    model,
                    lambda cls, tenant_id=tenant_id: cls.masjid_id == tenant_id,
                    include_aliases=True,
                )
            )
        execute_state.statement = statement

    @event.listens_for(Session, "before_flush")
    def _stamp_tenant_records(session, flush_context, instances):
        tenant_id = get_current_tenant()
        if tenant_id is None:
            return

        for obj in session.new:
            if isinstance(obj, TENANT_MODELS):
                obj.masjid_id = tenant_id

        for obj in session.dirty:
            if isinstance(obj, TENANT_MODELS):
                current_id = getattr(obj, "masjid_id", None)
                if current_id is None:
                    obj.masjid_id = tenant_id
                elif int(current_id) != int(tenant_id):
                    raise PermissionError("Cross-account data modification is not permitted.")


def migrate_tenant_columns(engine):
    """Create tenant columns and backfill legacy rows without assuming every table has created_at.

    The previous migration used row_data.created_at for every table. That is invalid for
    family_head_changes (which uses changed_at) and caused the whole transaction to roll
    back, so none of the masjid_id columns were actually created. The application then
    queried a column that did not exist and returned HTTP 500.
    """
    tables = [
        "families",
        "family_members",
        "family_head_changes",
        "member_requests",
        "community_functions",
        "santha_collections",
        "juma_collections",
        "donations",
    ]

    with engine.begin() as conn:
        # Schema changes are completed first. Do not combine them with a backfill that
        # can fail because one legacy table has a different timestamp column.
        for table in tables:
            conn.execute(text(
                f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS masjid_id INTEGER"
            ))
            conn.execute(text(
                f"CREATE INDEX IF NOT EXISTS ix_{table}_masjid_id ON {table} (masjid_id)"
            ))

        # Legacy data predates tenant ownership. There is no reliable account id on those
        # rows, so use the original/earliest Masjid account as the safe fallback instead
        # of guessing from table-specific timestamps. New rows are always stamped from
        # the authenticated JWT by before_flush above.
        earliest = conn.execute(text(
            "SELECT id FROM masjids ORDER BY id ASC LIMIT 1"
        )).scalar()

        if earliest is not None:
            for table in tables:
                conn.execute(text(
                    f"UPDATE {table} SET masjid_id = :masjid_id WHERE masjid_id IS NULL"
                ), {"masjid_id": earliest})

        # Where a legacy row references a family, inherit the family tenant. This keeps
        # related historical records together when more than one tenant already existed.
        dependent_tables = [
            "family_members",
            "family_head_changes",
            "community_functions",
            "santha_collections",
            "juma_collections",
            "donations",
        ]
        for table in dependent_tables:
            conn.execute(text(f"""
                UPDATE {table} AS child
                SET masjid_id = family.masjid_id
                FROM families AS family
                WHERE child.family_id = family.id
                  AND child.masjid_id IS DISTINCT FROM family.masjid_id
            """))

    logger.info("Tenant/account isolation schema and legacy ownership migration applied.")
