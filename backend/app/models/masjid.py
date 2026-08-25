import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from app.database import Base

class Masjid(Base):
    __tablename__ = "masjids"

    id = Column(Integer, primary_key=True, index=True)
    masjid_name = Column(String(150), nullable=False, index=True)
    mobile_number = Column(String(20), unique=True, nullable=False, index=True)
    street = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    email = Column(String(150), nullable=False)
    
    # Extended fields
    masjid_reg_id = Column(String(100), nullable=True)
    whatsapp_number = Column(String(20), nullable=True)
    website = Column(String(255), nullable=True)
    area_locality = Column(String(150), nullable=True)
    pincode = Column(String(20), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default="India", nullable=True)
    admin_name = Column(String(150), nullable=True)
    admin_mobile = Column(String(20), nullable=True)
    admin_email = Column(String(150), nullable=True)
    admin_role = Column(String(100), nullable=True)
    profile_photo = Column(Text, nullable=True)

    status = Column(String(20), default="active", nullable=False)
    signup_request_id = Column(Integer, ForeignKey("signup_requests.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
