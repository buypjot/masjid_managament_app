from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class SignupRequestDetail(BaseModel):
    id: int
    mobile_number: str
    masjid_name: str
    street: str
    city: str
    email: str
    status: str
    
    masjid_reg_id: Optional[str] = None
    whatsapp_number: Optional[str] = None
    website: Optional[str] = None
    area_locality: Optional[str] = None
    pincode: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    admin_name: Optional[str] = None
    admin_mobile: Optional[str] = None
    admin_email: Optional[str] = None
    admin_role: Optional[str] = None

    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SignupStatusUpdate(BaseModel):
    status: str  # approved, rejected
    admin_notes: Optional[str] = None

class MasjidResponse(BaseModel):
    id: int
    masjid_name: str
    mobile_number: str
    street: str
    city: str
    email: str
    status: str

    masjid_reg_id: Optional[str] = None
    whatsapp_number: Optional[str] = None
    website: Optional[str] = None
    area_locality: Optional[str] = None
    pincode: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    admin_name: Optional[str] = None
    admin_mobile: Optional[str] = None
    admin_email: Optional[str] = None
    admin_role: Optional[str] = None

    created_at: datetime

    class Config:
        from_attributes = True
