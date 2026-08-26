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
    """Attach the tenant ownership field to community/collection/property ORM models."""
    global TENANT_MODELS
    from app.models.community import (
        Family, FamilyMember, FamilyHeadChange, MemberRequest, CommunityFunction
    )
    from app.models.collections import SanthaCollection, JumaCollection, Donation
    from app.models.properties import (
        Property, PropertyUnit, Tenant, RentCollection, HallBooking, CookingVessel, PropertyDocument
    )

    TENANT_MODELS = (
        Family, FamilyMember, FamilyHeadChange, MemberRequest, CommunityFunction,
        SanthaCollection, JumaCollection, Donation,
        Property, PropertyUnit, Tenant, RentCollection, HallBooking, CookingVessel, PropertyDocument
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
    _REGISTERED = True
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
                    lambda cls, tid=tenant_id: cls.masjid_id == tid,
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
    """Create tenant columns and safely backfill legacy records across all tables."""
    tables = [
        "families",
        "family_members",
        "family_head_changes",
        "member_requests",
        "community_functions",
        "santha_collections",
        "juma_collections",
        "donations",
        "properties",
        "property_units",
        "tenants",
        "rent_collections",
        "hall_bookings",
        "cooking_vessels",
        "property_documents",
    ]

    timestamp_columns = {
        "families": "created_at",
        "family_members": "created_at",
        "family_head_changes": "changed_at",
        "member_requests": "requested_at",
        "community_functions": "created_at",
        "santha_collections": "created_at",
        "juma_collections": "created_at",
        "donations": "created_at",
        "properties": "created_at",
        "property_units": "created_at",
        "tenants": "created_at",
        "rent_collections": "created_at",
        "hall_bookings": "created_at",
        "cooking_vessels": "created_at",
        "property_documents": "created_at",
    }

    with engine.begin() as conn:
        # Always complete the schema changes before attempting the data backfill.
        for table in tables:
            conn.execute(text(
                f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS masjid_id INTEGER"
            ))
            conn.execute(text(
                f"CREATE INDEX IF NOT EXISTS ix_{table}_masjid_id ON {table} (masjid_id)"
            ))

        earliest = conn.execute(text(
            "SELECT id FROM masjids ORDER BY id ASC LIMIT 1"
        )).scalar()

        if earliest is None:
            logger.warning("No Masjid accounts exist; tenant columns were created but no legacy rows were assigned.")
            return

        # Assign ownership using each table's timestamp column.
        for table, timestamp_column in timestamp_columns.items():
            conn.execute(text(f"""
                UPDATE {table} AS row_data
                SET masjid_id = COALESCE(
                    (
                        SELECT m.id
                        FROM masjids AS m
                        WHERE m.created_at <= row_data.{timestamp_column}
                        ORDER BY m.created_at DESC
                        LIMIT 1
                    ),
                    :earliest_masjid_id
                )
                WHERE row_data.masjid_id IS NULL
            """), {"earliest_masjid_id": earliest})

        # Make family-related legacy records agree with their family tenant.
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

        # Keep result deterministic for orphaned legacy rows.
        for table in tables:
            conn.execute(text(f"""
                UPDATE {table}
                SET masjid_id = :earliest_masjid_id
                WHERE masjid_id IS NULL
            """), {"earliest_masjid_id": earliest})

    logger.info("Tenant/account isolation schema and legacy ownership migration applied.")
