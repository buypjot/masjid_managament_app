from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class FamilyCreate(BaseModel):
    family_code: Optional[str] = None
    family_name: Optional[str] = None
    head_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = "Male"
    dob: Optional[str] = None
    mobile_number: Optional[str] = None
    joining_date: Optional[str] = None
    relationship_type: Optional[str] = "Family Head"
    aadhar_ref: Optional[str] = None
    
    # Address
    house_no: Optional[str] = "12/4"
    street: Optional[str] = "Main Street"
    area: Optional[str] = "East Area"
    city: Optional[str] = "Tenkasi"
    pin_code: Optional[str] = "627811"
    landmark: Optional[str] = "Near Masjid"

    member_count: Optional[int] = 1
    monthly_santha: Optional[float] = 500.0
    santha_due_day: Optional[int] = 10
    previous_paid: Optional[float] = 0.0
    initial_paid: Optional[float] = 0.0
    pending_amount: Optional[float] = 0.0
    collected_amount: Optional[float] = 0.0
    is_poor_family: Optional[bool] = False
    status: Optional[str] = "Active"


class FamilyResponse(BaseModel):
    id: int
    family_code: str
    family_name: str
    head_name: str
    joining_date: Optional[str] = None
    member_count: int
    area: str
    monthly_santha: float
    santha_due_day: Optional[int] = 10
    pending_amount: float
    collected_amount: Optional[float] = 0.0
    is_poor_family: bool
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class FamilyMemberCreate(BaseModel):
    family_id: int
    full_name: str
    member_code: Optional[str] = None
    gender: Optional[str] = "Male"
    dob: Optional[str] = None
    mobile_number: Optional[str] = None
    marital_status: Optional[str] = "Single"
    relationship_type: Optional[str] = "Son"
    status: Optional[str] = "Active"
    occupation: Optional[str] = None
    education: Optional[str] = None
    email: Optional[str] = None
    document_name: Optional[str] = None

class FamilyMemberUpdate(BaseModel):
    family_id: Optional[int] = None
    full_name: Optional[str] = None
    member_code: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    mobile_number: Optional[str] = None
    marital_status: Optional[str] = None
    relationship_type: Optional[str] = None
    status: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    email: Optional[str] = None
    document_name: Optional[str] = None
    is_head: Optional[bool] = None


class FamilyMemberResponse(BaseModel):
    id: int
    family_id: int
    member_code: Optional[str]
    full_name: str
    gender: Optional[str]
    dob: Optional[str]
    mobile_number: Optional[str]
    marital_status: Optional[str]
    relationship_type: Optional[str]
    status: Optional[str]
    occupation: Optional[str]
    education: Optional[str]
    email: Optional[str]
    document_name: Optional[str]
    is_head: bool

    class Config:
        from_attributes = True


class FamilyHeadChangeCreate(BaseModel):
    family_id: int
    new_head: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = "Male"
    dob: Optional[str] = None
    mobile_number: Optional[str] = None
    joining_date: Optional[str] = None
    relationship_type: Optional[str] = "Family Head"
    aadhar_ref: Optional[str] = None
    house_no: Optional[str] = None
    street: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    pin_code: Optional[str] = None
    landmark: Optional[str] = None
    monthly_santha: Optional[float] = None
    status: Optional[str] = "Active"
    reason: Optional[str] = "Family Head & Detail Update"

class FamilyHeadChangeResponse(BaseModel):
    id: int
    family_id: int
    family_name: str
    old_head: str
    new_head: str
    reason: Optional[str] = None
    old_details: Optional[str] = None
    new_details: Optional[str] = None
    changed_by: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True


class CommunityStats(BaseModel):
    total_families: int
    total_members: int
    poor_families: int
    new_this_month: int

class CommunityFunctionCreate(BaseModel):
    family_id: Optional[int] = None
    family_name: str
    function_type: Optional[str] = "Marriage Function"
    function_title: Optional[str] = None
    member_name: Optional[str] = None
    contact_number: Optional[str] = None
    event_date: Optional[str] = None
    amount: float = 0.0
    paid_amount: float = 0.0
    payment_method: Optional[str] = "Cash"
    receipt_no: Optional[str] = None
    formalities: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "Draft"

class CommunityFunctionResponse(BaseModel):
    id: int
    function_no: Optional[str] = None
    family_id: Optional[int] = None
    family_name: str
    function_type: Optional[str] = None
    function_title: Optional[str] = None
    member_name: Optional[str] = None
    contact_number: Optional[str] = None
    event_date: Optional[str] = None
    amount: float = 0.0
    paid_amount: float = 0.0
    balance: float = 0.0
    payment_method: Optional[str] = None
    receipt_no: Optional[str] = None
    formalities: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
