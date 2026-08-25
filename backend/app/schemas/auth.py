from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime

class SignupCreate(BaseModel):
    mobile_number: str = Field(..., description="Mobile number with country code")
    masjid_name: str = Field(..., min_length=2, max_length=150)
    street: str = Field(..., min_length=2, max_length=255)
    city: str = Field(..., min_length=2, max_length=100)
    email: EmailStr

    # Extended optional fields matching signup UI
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

    @field_validator("mobile_number")
    def validate_mobile(cls, v):
        cleaned = "".join(filter(str.isdigit, v))
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError("Mobile number must be between 10 and 15 digits.")
        return cleaned

class SignupResponse(BaseModel):
    id: int
    mobile_number: str
    masjid_name: str
    street: str
    city: str
    email: str
    status: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

class AdminLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_info: Optional[dict] = None

class SendOTPRequest(BaseModel):
    mobile_number: str

    @field_validator("mobile_number")
    def validate_mobile(cls, v):
        cleaned = "".join(filter(str.isdigit, v))
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError("Mobile number must be between 10 and 15 digits.")
        return cleaned

class VerifyOTPRequest(BaseModel):
    mobile_number: str
    otp_code: str = Field(..., min_length=4, max_length=8)

    @field_validator("mobile_number")
    def validate_mobile(cls, v):
        cleaned = "".join(filter(str.isdigit, v))
        return cleaned

class ProfileUpdate(BaseModel):
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None
    admin_role: Optional[str] = None
    admin_mobile: Optional[str] = None
    masjid_name: Optional[str] = None
    city: Optional[str] = None
    profile_photo: Optional[str] = None

