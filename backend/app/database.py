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

            rent_collection_cols = [
                ("tenant_id", "INTEGER"),
                ("invoice_id", "INTEGER"),
                ("invoice_no", "VARCHAR(100)"),
                ("receipt_no", "VARCHAR(100)"),
                ("tenant_name", "VARCHAR(150)"),
                ("shop", "VARCHAR(150)"),
                ("month_year", "VARCHAR(100)"),
                ("amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("payment_date", "VARCHAR(50)"),
                ("payment_mode", "VARCHAR(50) DEFAULT 'Cash'"),
                ("reference_no", "VARCHAR(150)"),
                ("notes", "TEXT"),
                ("send_sms", "BOOLEAN DEFAULT TRUE"),
                ("send_whatsapp", "BOOLEAN DEFAULT TRUE"),
                ("status", "VARCHAR(50) DEFAULT 'Paid'"),
            ]
            for col_name, col_type in rent_collection_cols:
                stmt = text(f"ALTER TABLE rent_collections ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            rent_invoice_cols = [
                ("invoice_no", "VARCHAR(100)"),
                ("tenant_id", "INTEGER"),
                ("tenant_name", "VARCHAR(150)"),
                ("property_name", "VARCHAR(150)"),
                ("assigned_shop", "VARCHAR(150)"),
                ("for_month", "VARCHAR(100)"),
                ("invoice_date", "VARCHAR(50)"),
                ("due_date", "VARCHAR(50)"),
                ("rent_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("late_fee", "DOUBLE PRECISION DEFAULT 0.0"),
                ("other_charges", "DOUBLE PRECISION DEFAULT 0.0"),
                ("total_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("amount_paid", "DOUBLE PRECISION DEFAULT 0.0"),
                ("status", "VARCHAR(50) DEFAULT 'Pending'"),
            ]
            for col_name, col_type in rent_invoice_cols:
                stmt = text(f"ALTER TABLE rent_invoices ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            hall_booking_cols = [
                ("booking_id", "VARCHAR(100)"),
                ("booking_no", "VARCHAR(50)"),
                ("hall_name", "VARCHAR(150) DEFAULT 'Marriage Hall'"),
                ("booking_for", "VARCHAR(100) DEFAULT 'Family'"),
                ("booking_person", "VARCHAR(150)"),
                ("applicant", "VARCHAR(150)"),
                ("contact_number", "VARCHAR(50)"),
                ("booking_date", "VARCHAR(50)"),
                ("start_time", "VARCHAR(50)"),
                ("end_time", "VARCHAR(50)"),
                ("time_slot", "VARCHAR(100)"),
                ("function_type", "VARCHAR(150) DEFAULT 'Marriage'"),
                ("event", "VARCHAR(150) DEFAULT 'Marriage'"),
                ("status", "VARCHAR(50) DEFAULT 'Confirmed'"),
                ("hall_charge", "DOUBLE PRECISION DEFAULT 0.0"),
                ("cleaning_charge", "DOUBLE PRECISION DEFAULT 0.0"),
                ("other_charge", "DOUBLE PRECISION DEFAULT 0.0"),
                ("total_charge", "DOUBLE PRECISION DEFAULT 0.0"),
                ("total_fee", "DOUBLE PRECISION DEFAULT 0.0"),
                ("advance_paid", "DOUBLE PRECISION DEFAULT 0.0"),
                ("balance", "DOUBLE PRECISION DEFAULT 0.0"),
                ("needs_cooking_vessels", "BOOLEAN DEFAULT FALSE"),
                ("notes", "TEXT"),
                ("document_url", "VARCHAR(255)"),
                ("family_id", "INTEGER"),
                ("family_member_id", "INTEGER"),
                ("family_name", "VARCHAR(150)"),
                ("member_name", "VARCHAR(150)"),
            ]
            vessel_category_cols = [
                ("category_id", "VARCHAR(100)"),
                ("category_name", "VARCHAR(150)"),
                ("description", "TEXT"),
                ("status", "VARCHAR(50) DEFAULT 'Active'"),
                ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ]
            for col_name, col_type in vessel_category_cols:
                stmt = text(f"ALTER TABLE vessel_categories ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            vessel_cols = [
                ("vessel_id", "VARCHAR(100)"),
                ("vessel_code", "VARCHAR(100)"),
                ("vessel_name", "VARCHAR(150)"),
                ("item_name", "VARCHAR(150)"),
                ("category_id", "INTEGER"),
                ("category_name", "VARCHAR(150)"),
                ("capacity", "VARCHAR(100)"),
                ("total_quantity", "INTEGER DEFAULT 1"),
                ("quantity", "INTEGER DEFAULT 1"),
                ("available_quantity", "INTEGER DEFAULT 1"),
                ("available", "INTEGER DEFAULT 1"),
                ("condition", "VARCHAR(50) DEFAULT 'Good'"),
                ("available_for_rent", "BOOLEAN DEFAULT TRUE"),
                ("rental_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("rental_rate_per_day", "DOUBLE PRECISION DEFAULT 0.0"),
                ("rental_unit", "VARCHAR(50) DEFAULT 'Per Day'"),
                ("status", "VARCHAR(50) DEFAULT 'Available'"),
                ("notes", "TEXT"),
                ("document_url", "VARCHAR(255)"),
                ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ]
            for col_name, col_type in vessel_cols:
                stmt = text(f"ALTER TABLE cooking_vessels ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            asset_item_cols = [
                ("brand_model", "VARCHAR(150)"),
                ("serial_number", "VARCHAR(150)"),
                ("barcode", "VARCHAR(150)"),
                ("supplier", "VARCHAR(150)"),
                ("invoice_number", "VARCHAR(150)"),
                ("invoice_date", "VARCHAR(50)"),
                ("quantity", "INTEGER DEFAULT 1"),
                ("unit_cost", "DOUBLE PRECISION DEFAULT 0.0"),
                ("tax_gst", "DOUBLE PRECISION DEFAULT 0.0"),
                ("other_charges", "DOUBLE PRECISION DEFAULT 0.0"),
                ("total_invoice_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("paid_from", "VARCHAR(100) DEFAULT 'General Fund'"),
                ("payment_ref", "VARCHAR(150)"),
                ("invoice_doc_url", "TEXT"),
                ("invoice_notes", "TEXT"),
                ("warranty_available", "VARCHAR(20) DEFAULT 'No'"),
                ("warranty_provider", "VARCHAR(150)"),
                ("maintenance_frequency", "VARCHAR(50) DEFAULT '1 Month'"),
                ("next_maintenance", "VARCHAR(50)"),
                ("maintenance_required", "VARCHAR(20) DEFAULT 'Yes'"),
                ("other_doc_url", "TEXT"),
                ("disposal_no", "VARCHAR(100)"),
                ("disposal_type", "VARCHAR(100)"),
                ("sale_amount", "DOUBLE PRECISION DEFAULT 0.0"),
            ]
            for col_name, col_type in asset_item_cols:
                stmt = text(f"ALTER TABLE asset_items ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            doc_cols = [
                ("category", "VARCHAR(100)"),
                ("associated_property", "VARCHAR(150)"),
                ("associated_tenant", "VARCHAR(150)"),
                ("property_id", "INTEGER"),
                ("tenant_id", "INTEGER"),
            ]
            for col_name, col_type in doc_cols:
                stmt = text(f"ALTER TABLE property_documents ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            maintenance_cols = [
                ("asset_code", "VARCHAR(100)"),
                ("work_details", "TEXT"),
                ("technician_notes", "TEXT"),
                ("maintenance_cost", "DOUBLE PRECISION DEFAULT 0.0"),
                ("payment_status", "VARCHAR(50) DEFAULT 'Unpaid'"),
                ("paid_from", "VARCHAR(100) DEFAULT 'General Fund'"),
                ("payment_method", "VARCHAR(50) DEFAULT 'Cash'"),
                ("amount_paid", "DOUBLE PRECISION DEFAULT 0.0"),
                ("transaction_ref", "VARCHAR(150)"),
                ("completed", "BOOLEAN DEFAULT FALSE"),
                ("document_url", "TEXT"),
                ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ]
            for col_name, col_type in maintenance_cols:
                stmt = text(f"ALTER TABLE asset_maintenance_records ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            disposal_cols = [
                ("disposal_expenses", "DOUBLE PRECISION DEFAULT 0.0"),
                ("net_disposal_amount", "DOUBLE PRECISION DEFAULT 0.0"),
                ("disposal_notes", "TEXT"),
            ]
            for col_name, col_type in disposal_cols:
                stmt = text(f"ALTER TABLE asset_disposals ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                conn.execute(stmt)

            # Clean up dummy sample assets from PostgreSQL if any exist
            conn.execute(text("""
                DELETE FROM asset_items 
                WHERE asset_name IN (
                    'Sound System & Wireless Microphones', 
                    'Central Air Conditioner 5-Ton Unit', 
                    '15 KVA Standby Diesel Generator', 
                    'Persian Velvet Carpet Roll (50m)', 
                    'Legacy CRT Monitor & Display Unit'
                );
            """))
            conn.execute(text("""
                DELETE FROM asset_maintenance_records 
                WHERE maintenance_code IN ('MNT-001', 'MNT-002', 'MNT-003');
            """))

        logger.info("Automatic schema column migrations applied successfully.")
    except Exception as e:
        logger.error(f"Error applying auto migrations: {e}")

def create_database_views():
    """Create SQL views for combined vessel and category queries."""
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE OR REPLACE VIEW v_cooking_vessels_with_category AS
                SELECT 
                    v.id,
                    v.masjid_id,
                    v.vessel_id,
                    v.vessel_code,
                    v.vessel_name,
                    v.category_id,
                    COALESCE(c.category_name, v.category_name, 'Cooking Vessels') AS category_name,
                    v.total_quantity,
                    v.available_quantity,
                    v.condition,
                    v.available_for_rent,
                    v.rental_amount,
                    v.rental_unit,
                    v.status,
                    v.notes,
                    v.document_url,
                    v.created_at
                FROM cooking_vessels v
                LEFT JOIN vessel_categories c ON v.category_id = c.id;
            """))
        logger.info("SQL view v_cooking_vessels_with_category verified/created.")
    except Exception as e:
        logger.warning(f"Could not create database views: {e}")

def seed_vessels_and_categories():
    """Pre-seed default categories and realistic sample vessel inventory if database is empty."""
    from app.models.properties import VesselCategory, CookingVessel
    db = SessionLocal()
    try:
        # 1. Seed categories if empty
        cat_count = db.query(VesselCategory).count()
        if cat_count == 0:
            default_categories = [
                {"id": 1, "category_id": "CAT-001", "category_name": "Cooking Pots", "description": "Large pots, degs and cauldrons for cooking"},
                {"id": 2, "category_id": "CAT-002", "category_name": "Kadai", "description": "Biryani and frying kadais"},
                {"id": 3, "category_id": "CAT-003", "category_name": "Rice Cooking Vessels", "description": "Rice boiling and steaming pots"},
                {"id": 4, "category_id": "CAT-004", "category_name": "Serving Vessels", "description": "Trays, large buckets and pans for food distribution"},
                {"id": 5, "category_id": "CAT-005", "category_name": "Plates", "description": "Dinner and feast plates"},
                {"id": 6, "category_id": "CAT-006", "category_name": "Bowls", "description": "Gravy and dessert bowls"},
                {"id": 7, "category_id": "CAT-007", "category_name": "Spoons", "description": "Catering and serving spoons"},
                {"id": 8, "category_id": "CAT-008", "category_name": "Glasses", "description": "Water and beverage glasses"},
                {"id": 9, "category_id": "CAT-009", "category_name": "Food Serving Containers", "description": "Insulated and stainless steel food containers"},
                {"id": 10, "category_id": "CAT-010", "category_name": "Water Containers", "description": "Drums and large water storage vessels"},
                {"id": 11, "category_id": "CAT-011", "category_name": "Catering Vessels", "description": "Specialized event and catering equipment"},
                {"id": 12, "category_id": "CAT-012", "category_name": "Other", "description": "Miscellaneous cooking assets"}
            ]
            for cat_data in default_categories:
                cat = VesselCategory(**cat_data)
                db.add(cat)
            db.commit()
            logger.info("Baseline vessel categories seeded successfully.")

        # 2. Seed vessels if empty
        vessel_count = db.query(CookingVessel).count()
        if vessel_count == 0:
            sample_vessels = [
                {
                    "vessel_id": "VSL-001",
                    "vessel_code": "VES-001",
                    "vessel_name": "Large Deg/Biryani Pot (100kg)",
                    "item_name": "Large Deg/Biryani Pot (100kg)",
                    "category_id": 1,
                    "category_name": "Cooking Pots",
                    "total_quantity": 12,
                    "quantity": 12,
                    "available_quantity": 8,
                    "available": 8,
                    "condition": "Good",
                    "available_for_rent": True,
                    "rental_amount": 500.0,
                    "rental_rate_per_day": 500.0,
                    "rental_unit": "Per Day",
                    "status": "Available",
                    "notes": "Stored in Main Kitchen Storage Block A."
                },
                {
                    "vessel_id": "VSL-002",
                    "vessel_code": "VES-002",
                    "vessel_name": "Medium Deg (50kg)",
                    "item_name": "Medium Deg (50kg)",
                    "category_id": 1,
                    "category_name": "Cooking Pots",
                    "total_quantity": 20,
                    "quantity": 20,
                    "available_quantity": 16,
                    "available": 16,
                    "condition": "Good",
                    "available_for_rent": True,
                    "rental_amount": 350.0,
                    "rental_rate_per_day": 350.0,
                    "rental_unit": "Per Day",
                    "status": "Available",
                    "notes": "Stored in Main Kitchen Storage Block A."
                },
                {
                    "vessel_id": "VSL-003",
                    "vessel_code": "VES-003",
                    "vessel_name": "Big Serving Trays & Buckets",
                    "item_name": "Big Serving Trays & Buckets",
                    "category_id": 4,
                    "category_name": "Serving Vessels",
                    "total_quantity": 30,
                    "quantity": 30,
                    "available_quantity": 30,
                    "available": 30,
                    "condition": "New",
                    "available_for_rent": True,
                    "rental_amount": 100.0,
                    "rental_rate_per_day": 100.0,
                    "rental_unit": "Per Day",
                    "status": "Available",
                    "notes": "Stainless steel serving buckets."
                },
                {
                    "vessel_id": "VSL-004",
                    "vessel_code": "VES-004",
                    "vessel_name": "Heavy Duty Biryani Kadai",
                    "item_name": "Heavy Duty Biryani Kadai",
                    "category_id": 2,
                    "category_name": "Kadai",
                    "total_quantity": 15,
                    "quantity": 15,
                    "available_quantity": 12,
                    "available": 12,
                    "condition": "Good",
                    "available_for_rent": True,
                    "rental_amount": 250.0,
                    "rental_rate_per_day": 250.0,
                    "rental_unit": "Per Day",
                    "status": "Available",
                    "notes": "Cast iron heavy duty kadai."
                },
                {
                    "vessel_id": "VSL-005",
                    "vessel_code": "VES-005",
                    "vessel_name": "Steel Rice Boiler Pot",
                    "item_name": "Steel Rice Boiler Pot",
                    "category_id": 3,
                    "category_name": "Rice Cooking Vessels",
                    "total_quantity": 10,
                    "quantity": 10,
                    "available_quantity": 10,
                    "available": 10,
                    "condition": "Good",
                    "available_for_rent": True,
                    "rental_amount": 400.0,
                    "rental_rate_per_day": 400.0,
                    "rental_unit": "Per Day",
                    "status": "Available",
                    "notes": "High capacity rice boiler."
                }
            ]
            for v_data in sample_vessels:
                vessel = CookingVessel(**v_data)
                db.add(vessel)
            logger.info("Baseline cooking vessels inventory seeded successfully.")

        db.execute(text("SELECT setval('vessel_categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM vessel_categories));"))
        db.execute(text("SELECT setval('cooking_vessels_id_seq', (SELECT COALESCE(MAX(id), 1) FROM cooking_vessels));"))
        db.commit()

        logger.info("Vessel primary key sequences synchronized.")
    except Exception as e:
        logger.error(f"Error seeding vessels/categories: {e}")
    finally:
        db.close()


def cleanup_dummy_families():
    """Remove legacy dummy seed families (F-0001 to F-0004) from PostgreSQL database."""
    try:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM santha_collections WHERE family_id IN (SELECT id FROM families WHERE family_code IN ('F-0001', 'F-0002', 'F-0003', 'F-0004'));"))
            conn.execute(text("DELETE FROM family_head_changes WHERE family_id IN (SELECT id FROM families WHERE family_code IN ('F-0001', 'F-0002', 'F-0003', 'F-0004'));"))
            conn.execute(text("DELETE FROM family_members WHERE family_id IN (SELECT id FROM families WHERE family_code IN ('F-0001', 'F-0002', 'F-0003', 'F-0004'));"))
            conn.execute(text("DELETE FROM families WHERE family_code IN ('F-0001', 'F-0002', 'F-0003', 'F-0004');"))
        logger.info("Legacy dummy families cleaned up from PostgreSQL.")
    except Exception as e:
        logger.error(f"Error cleaning up dummy families: {e}")


def init_db():
    """Ensure DB exists, create all tables, run schema migrations, and clean dummy records."""
    ensure_database_exists()
    from app.models import admin, signup_request, masjid, otp, community, properties  # noqa: F401
    Base.metadata.create_all(bind=engine)
    run_auto_migrations()
    create_database_views()
    cleanup_dummy_families()
    seed_vessels_and_categories()
    logger.info("Database tables verified/created successfully.")




