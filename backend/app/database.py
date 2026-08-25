import logging
import urllib.parse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.engine import make_url
from app.config import settings

logger = logging.getLogger("masjid_app.database")

Base = declarative_base()

def ensure_database_exists():
    """Ensure the target PostgreSQL database exists. Creates it if missing."""
    try:
        url = make_url(settings.DATABASE_URL)
        target_db = url.database
        
        # Connect to default 'postgres' database to check/create target database
        postgres_url = url.set(database="postgres")
        engine_pg = create_engine(postgres_url, isolation_level="AUTOCOMMIT")
        
        with engine_pg.connect() as conn:
            result = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": target_db}
            )
            exists = result.scalar()
            if not exists:
                logger.info(f"Database '{target_db}' does not exist. Creating...")
                conn.execute(text(f'CREATE DATABASE "{target_db}"'))
                logger.info(f"Database '{target_db}' created successfully.")
            else:
                logger.info(f"Database '{target_db}' already exists.")
        engine_pg.dispose()
    except Exception as e:
        logger.warning(f"Could not check/create database via default connection: {e}")

# Initialize SQLAlchemy Engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def run_auto_migrations():
    """Run ALTER TABLE statements to add any newly defined columns to existing tables."""
    masjid_columns = [
        ("masjid_reg_id", "VARCHAR(100)"),
        ("whatsapp_number", "VARCHAR(20)"),
        ("website", "VARCHAR(255)"),
        ("area_locality", "VARCHAR(150)"),
        ("pincode", "VARCHAR(20)"),
        ("state", "VARCHAR(100)"),
        ("country", "VARCHAR(100) DEFAULT 'India'"),
        ("admin_name", "VARCHAR(150)"),
        ("admin_mobile", "VARCHAR(20)"),
        ("admin_email", "VARCHAR(150)"),
        ("admin_role", "VARCHAR(100)"),
        ("profile_photo", "TEXT"),
    ]
    
    family_columns = [
        ("first_name", "VARCHAR(150)"),
        ("last_name", "VARCHAR(150)"),
        ("gender", "VARCHAR(20) DEFAULT 'Male'"),
        ("dob", "VARCHAR(50)"),
        ("mobile_number", "VARCHAR(50)"),
        ("joining_date", "VARCHAR(50)"),
        ("relationship_type", "VARCHAR(100) DEFAULT 'Family Head'"),
        ("aadhar_ref", "VARCHAR(100)"),
        ("house_no", "VARCHAR(100)"),
        ("street", "VARCHAR(150)"),
        ("area", "VARCHAR(150) DEFAULT 'Main Street'"),
        ("city", "VARCHAR(100) DEFAULT 'Tenkasi'"),
        ("pin_code", "VARCHAR(20) DEFAULT '627811'"),
        ("landmark", "VARCHAR(150)"),
        ("monthly_santha", "DOUBLE PRECISION DEFAULT 500.0"),
        ("santha_due_day", "INTEGER DEFAULT 20"),
        ("collected_amount", "FLOAT DEFAULT 0.0"),
    ]


    family_member_columns = [
        ("member_code", "VARCHAR(100)"),
        ("gender", "VARCHAR(20) DEFAULT 'Male'"),
        ("dob", "VARCHAR(50)"),
        ("mobile_number", "VARCHAR(50)"),
        ("marital_status", "VARCHAR(50) DEFAULT 'Single'"),
        ("relationship_type", "VARCHAR(100) DEFAULT 'Family Head'"),
        ("status", "VARCHAR(50) DEFAULT 'Active'"),
        ("occupation", "VARCHAR(150)"),
        ("education", "VARCHAR(150)"),
        ("email", "VARCHAR(150)"),
        ("document_name", "VARCHAR(255)"),
    ]

    try:
        with engine.begin() as conn:
            for table in ["signup_requests", "masjids"]:
                for col_name, col_type in masjid_columns:
                    stmt = text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                    conn.execute(stmt)

            for col_name, col_type in family_columns:
                stmt = text(f"ALTER TABLE families ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            for col_name, col_type in family_member_columns:
                stmt = text(f"ALTER TABLE family_members ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            head_change_cols = [
                ("old_details", "TEXT"),
                ("new_details", "TEXT"),
                ("changed_by", "VARCHAR(150) DEFAULT 'Admin User'"),
            ]
            for col_name, col_type in head_change_cols:
                stmt = text(f"ALTER TABLE family_head_changes ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            func_cols = [
                ("function_no", "VARCHAR(50)"),
                ("family_id", "INTEGER"),
                ("function_type", "VARCHAR(150)"),
                ("member_name", "VARCHAR(150)"),
                ("contact_number", "VARCHAR(50)"),
                ("paid_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("balance", "DOUBLE PRECISION DEFAULT 0.0"),
                ("payment_method", "VARCHAR(50) DEFAULT 'Cash'"),
                ("receipt_no", "VARCHAR(50)"),
                ("formalities", "TEXT"),
                ("notes", "TEXT"),
            ]
            for col_name, col_type in func_cols:
                stmt = text(f"ALTER TABLE community_functions ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            santha_cols = [
                ("payment_date", "VARCHAR(50)"),
                ("financial_account", "VARCHAR(100) DEFAULT 'Main Cash'"),
                ("allocation", "VARCHAR(50) DEFAULT 'Auto'"),
                ("reference_id", "VARCHAR(150)"),
                ("advance_months", "INTEGER DEFAULT 0"),
                ("advance_period", "VARCHAR(150)"),
            ]
            for col_name, col_type in santha_cols:
                stmt = text(f"ALTER TABLE santha_collections ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            juma_cols = [
                ("contributor_type", "VARCHAR(50) DEFAULT 'Family'"),
                ("family_id", "INTEGER"),
                ("family_code", "VARCHAR(50)"),
                ("receipt_no", "VARCHAR(50)"),
                ("donor_name", "VARCHAR(150)"),
                ("general_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("madrasa_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("ramadan_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("zakat_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("welfare_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("graveyard_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("other_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("cash_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("upi_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("paytm_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("bank_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("cheque_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("payment_method", "VARCHAR(50) DEFAULT 'Cash'"),
                ("status", "VARCHAR(50) DEFAULT 'Received'"),
                ("juma_type", "VARCHAR(100) DEFAULT '1st Juma Prayer'"),
            ]
            for col_name, col_type in juma_cols:
                stmt = text(f"ALTER TABLE juma_collections ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            don_cols = [
                ("contributor_type", "VARCHAR(50) DEFAULT 'Family'"),
                ("family_id", "INTEGER"),
                ("family_code", "VARCHAR(50)"),
                ("donation_date", "VARCHAR(50)"),
                ("general_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("madrasa_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("ramadan_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("zakat_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("welfare_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("graveyard_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("other_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("cash_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("upi_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("paytm_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("bank_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("cheque_amount", "DOUBLE PRECISION DEFAULT 0.0"),
            ]
            for col_name, col_type in don_cols:
                stmt = text(f"ALTER TABLE donations ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            tenant_cols = [
                ("contact_person", "VARCHAR(150)"),
                ("email", "VARCHAR(150)"),
                ("door_no", "VARCHAR(50)"),
                ("street", "VARCHAR(150)"),
                ("city", "VARCHAR(100) DEFAULT 'Tenkasi'"),
                ("pin_code", "VARCHAR(20) DEFAULT '627811'"),
                ("govt_id", "VARCHAR(100)"),
                ("doc_notes", "TEXT"),
                ("monthly_rent", "DOUBLE PRECISION DEFAULT 0.0"),
                ("due_day", "VARCHAR(50) DEFAULT '5'"),
                ("security_deposit", "DOUBLE PRECISION DEFAULT 0.0"),
            ]
            for col_name, col_type in tenant_cols:
                stmt = text(f"ALTER TABLE tenants ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

        logger.info("Automatic schema column migrations applied successfully.")
    except Exception as e:
        logger.error(f"Error applying auto migrations: {e}")

def cleanup_dummy_families():
    """Remove legacy dummy seed families (F-0001 to F-0004) from PostgreSQL database."""
    try:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM family_head_changes WHERE family_id IN (SELECT id FROM families WHERE family_code IN ('F-0001', 'F-0002', 'F-0003', 'F-0004'));"))
            conn.execute(text("DELETE FROM family_members WHERE family_id IN (SELECT id FROM families WHERE family_code IN ('F-0001', 'F-0002', 'F-0003', 'F-0004'));"))
            conn.execute(text("DELETE FROM families WHERE family_code IN ('F-0001', 'F-0002', 'F-0003', 'F-0004');"))
        logger.info("Legacy dummy families cleaned up from PostgreSQL.")
    except Exception as e:
        logger.error(f"Error cleaning up dummy families: {e}")

def init_db():
    """Ensure DB exists, create all tables, run schema migrations, and clean dummy records."""
    ensure_database_exists()
    from app.models import admin, signup_request, masjid, otp, community  # noqa: F401
    Base.metadata.create_all(bind=engine)
    run_auto_migrations()
    cleanup_dummy_families()
    logger.info("Database tables verified/created successfully.")


