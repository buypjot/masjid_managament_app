from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Property Unit Schemas
class PropertyUnitBase(BaseModel):
    unit_no: str
    door_no: Optional[str] = None
    floor: Optional[str] = "Ground Floor"
    area_sqft: Optional[str] = "500"
    availability: Optional[str] = "Available"
    rent_amount: Optional[float] = 0.0
    tenant_name: Optional[str] = None

class PropertyUnitCreate(PropertyUnitBase):
    pass

class PropertyUnitResponse(PropertyUnitBase):
    id: int
    property_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Property Schemas
class PropertyBase(BaseModel):
    property_number: Optional[str] = None
    property_name: str
    property_type: Optional[str] = "Commercial Complex"
    door_house_no: Optional[str] = None
    street: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = "Tenkasi"
    pin_code: Optional[str] = "627811"
    status: Optional[str] = "Active"
    number_of_units: Optional[int] = 1
    rent_frequency: Optional[str] = "Monthly"
    default_due_date: Optional[str] = "5"
    security_deposit: Optional[str] = "Yes"
    current_tenant: Optional[str] = "Vacant"
    monthly_rent: Optional[float] = 0.0
    deposit_amount: Optional[float] = 0.0

class PropertyCreate(PropertyBase):
    units: Optional[List[PropertyUnitCreate]] = []

class PropertyResponse(PropertyBase):
    id: int
    created_at: datetime
    units: List[PropertyUnitResponse] = []

    class Config:
        from_attributes = True


# Tenant Schemas
class TenantBase(BaseModel):
    tenant_code: Optional[str] = None
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    door_no: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = "Tenkasi"
    pin_code: Optional[str] = "627811"
    govt_id: Optional[str] = None
    doc_notes: Optional[str] = None
    property_id: Optional[int] = None
    property_name: Optional[str] = None
    assigned_shop: Optional[str] = None
    monthly_rent: Optional[float] = 0.0
    due_day: Optional[str] = "5"
    security_deposit: Optional[float] = 0.0
    agreement_start: Optional[str] = None
    agreement_end: Optional[str] = None
    advance_paid: Optional[float] = 0.0
    status: Optional[str] = "Active"

class TenantCreate(TenantBase):
    pass

class TenantResponse(TenantBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Rent Collection Schemas
class RentCollectionBase(BaseModel):
    receipt_no: Optional[str] = None
    tenant_name: str
    shop: Optional[str] = None
    month_year: Optional[str] = None
    amount: float
    payment_date: Optional[str] = None
    payment_mode: Optional[str] = "Cash"
    status: Optional[str] = "Paid"

class RentCollectionCreate(RentCollectionBase):
    pass

class RentCollectionResponse(RentCollectionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Hall Booking Schemas
class HallBookingBase(BaseModel):
    booking_id: Optional[str] = None
    applicant: str
    event: str
    booking_date: Optional[str] = None
    time_slot: Optional[str] = None
    total_fee: float
    advance_paid: Optional[float] = 0.0
    balance: Optional[float] = 0.0
    status: Optional[str] = "Confirmed"

class HallBookingCreate(HallBookingBase):
    pass

class HallBookingResponse(HallBookingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Cooking Vessel Schemas
class CookingVesselBase(BaseModel):
    vessel_id: Optional[str] = None
    item_name: str
    capacity: Optional[str] = None
    quantity: Optional[int] = 1
    available: Optional[int] = 1
    rental_rate_per_day: Optional[float] = 0.0
    condition: Optional[str] = "Excellent"

class CookingVesselCreate(CookingVesselBase):
    pass

class CookingVesselResponse(CookingVesselBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Property Document Schemas
class PropertyDocumentBase(BaseModel):
    doc_id: Optional[str] = None
    title: str
    category: Optional[str] = None
    associated_property: Optional[str] = None
    property_id: Optional[int] = None
    upload_date: Optional[str] = None
    file_type: Optional[str] = "PDF Document"
    file_size: Optional[str] = "1.0 MB"
    file_url: Optional[str] = None

class PropertyDocumentCreate(PropertyDocumentBase):
    pass

class PropertyDocumentResponse(PropertyDocumentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
