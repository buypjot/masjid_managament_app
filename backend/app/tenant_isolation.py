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
    """Attach masjid_id to the community/collections models without changing their business fields."""
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

        tenant_types = TENANT_MODELS
        for obj in session.new:
            if isinstance(obj, tenant_types):
                obj.masjid_id = tenant_id

        for obj in session.dirty:
            if isinstance(obj, tenant_types):
                current_id = getattr(obj, "masjid_id", None)
                if current_id is None:
                    obj.masjid_id = tenant_id
                elif int(current_id) != int(tenant_id):
                    raise PermissionError("Cross-account data modification is not permitted.")

    _REGISTERED = True


def migrate_tenant_columns(engine):
    """Add tenant columns to existing PostgreSQL tables and safely assign legacy rows."""
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
        for table in tables:
            conn.execute(text(
                f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS masjid_id INTEGER"
            ))
            conn.execute(text(
                f"CREATE INDEX IF NOT EXISTS ix_{table}_masjid_id ON {table} (masjid_id)"
            ))

        # Existing data was created before account ownership existed. Associate each
        # legacy row with the latest Masjid account that existed at the row's creation
        # time. This preserves the original account's data while leaving newly-created
        # accounts clean. New writes are stamped automatically by before_flush above.
        for table in tables:
            conn.execute(text(f"""
                UPDATE {table} AS row_data
                SET masjid_id = COALESCE(
                    (
                        SELECT m.id
                        FROM masjids AS m
                        WHERE m.created_at <= row_data.created_at
                        ORDER BY m.created_at DESC
                        LIMIT 1
                    ),
                    (SELECT m2.id FROM masjids AS m2 ORDER BY m2.created_at ASC LIMIT 1)
                )
                WHERE row_data.masjid_id IS NULL
            """))

    logger.info("Tenant/account isolation schema and legacy ownership migration applied.")
