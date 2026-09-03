import os
from pydantic_settings import BaseSettings
from typing import List, Union

class Settings(BaseSettings):
    APP_NAME: str = "Masjid Management System API"
    ENV: str = "development"
    PORT: int = 8011
    
    # PostgreSQL Configuration
    DATABASE_URL: str = "postgresql://postgres:Sr%40983683@localhost:5432/Masjiddesk"
    
    # Initial Admin Credentials
    ADMIN_USERNAME: str = "Admin"
    ADMIN_PASSWORD: str = "Sr@983683"
    
    # Webhook Configuration
    SIGNUP_WEBHOOK_URL: str = "https://cliq.zoho.com/api/v2/channelsbyname/webhookmessage/message?zapikey=1001.1082b3c2c08375718988a789389d3023.f0cb869525a1dc04ecab779149be5af4"
    WEBHOOK_BOT_NAME: str = "Majid_New_Member"
    
    # OTP / WhatsApp Configuration
    OTP_PROVIDER: str = "whatsapp"
    OTP_API_URL: str = "https://waapi.buypapps.com/v1/message/send-message"
    OTP_API_KEY: str = "6a936b34e8c1946bdb327d93a61dcfb5a8e18ad0d24a9c2ffc7668f129ed557d8eaac8b77b7e8d62b6ac1a15415a36a31a0ea4626e67e7d2748909b4eb5e0f94"
    OTP_TEMPLATE_NAME: str = "buyp_play_zone"
    OTP_EXPIRY_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    
    # JWT Authentication Configuration
    JWT_SECRET: str = "masjid_management_system_super_secret_jwt_key_2026_buyp"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440  # 24 hours
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "https://masjid.amandesk.com",
        "https://masjith.amandesk.com",
        "http://masjid.amandesk.com",
        "http://masjith.amandesk.com",
        "http://192.168.10.131:9017",
        "http://localhost:9017",
        "http://127.0.0.1:9017",
        "http://localhost:3000"
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
