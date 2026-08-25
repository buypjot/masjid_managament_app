import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db, SessionLocal
from app.models.admin import Admin
from app.utils.security import hash_password
from app.routers import auth_router, admin_router, masjid_router, community_router, collections_router, properties_router

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("masjid_app")

app = FastAPI(
    title=settings.APP_NAME,
    description="Masjid Income, Expense & Collection Management System API (Phase 1)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Allow all origins dynamically using regex to fully support preflight OPTIONS and credentials
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def seed_admin_user():
    """Seeds default admin user if not exists."""
    db = SessionLocal()
    try:
        admin = db.query(Admin).filter(Admin.username == settings.ADMIN_USERNAME).first()
        if not admin:
            logger.info(f"Seeding default Admin user '{settings.ADMIN_USERNAME}'...")
            hashed_pwd = hash_password(settings.ADMIN_PASSWORD)
            new_admin = Admin(
                username=settings.ADMIN_USERNAME,
                hashed_password=hashed_pwd
            )
            db.add(new_admin)
            db.commit()
            logger.info("Admin user seeded successfully.")
        else:
            logger.info(f"Admin user '{settings.ADMIN_USERNAME}' already exists.")
    except Exception as e:
        logger.error(f"Error seeding admin user: {e}")
        db.rollback()
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    logger.info("Initializing database schema...")
    try:
        init_db()
        seed_admin_user()
    except Exception as e:
        logger.error(f"Error during startup database init: {e}")

@app.get("/")
def read_root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "docs": "/docs",
        "phase": 1
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Include API Routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(masjid_router)
app.include_router(community_router)
app.include_router(collections_router)
app.include_router(properties_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
