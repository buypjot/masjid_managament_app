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
    payment_status: Optional[str] = "Pending"
    current_month_status: Optional[str] = "Pending"
    current_month_name: Optional[str] = None
    paid_month: Optional[str] = None
    next_due_month: Optional[str] = None
    next_due_amount: Optional[float] = 0.0
    next_due_date: Optional[str] = None
    amount_paid: Optional[float] = 0.0
    pending_amount: Optional[float] = 0.0
    last_payment_date: Optional[str] = None

    class Config:
        from_attributes = True



# Rent Collection Schemas
class RentCollectionBase(BaseModel):
    receipt_no: Optional[str] = None
    invoice_id: Optional[int] = None
    invoice_no: Optional[str] = None
    tenant_id: Optional[int] = None
    tenant_name: str
    shop: Optional[str] = None
    month_year: Optional[str] = None
    amount: float
    payment_date: Optional[str] = None
    payment_mode: Optional[str] = "Cash"
    reference_no: Optional[str] = None
    notes: Optional[str] = None
    send_sms: Optional[bool] = True
    send_whatsapp: Optional[bool] = True
    status: Optional[str] = "Paid"

class RentCollectionCreate(RentCollectionBase):
    pass

class RentCollectionResponse(RentCollectionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Rent Invoice Schemas
class RentInvoiceBase(BaseModel):
    invoice_no: str
    tenant_id: Optional[int] = None
    tenant_name: str
    property_name: Optional[str] = None
    assigned_shop: Optional[str] = None
    for_month: str
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    rent_amount: float
    late_fee: Optional[float] = 0.0
    other_charges: Optional[float] = 0.0
    total_amount: float
    amount_paid: Optional[float] = 0.0
    status: Optional[str] = "Pending"

class RentInvoiceCreate(RentInvoiceBase):
    pass

class RentInvoiceResponse(RentInvoiceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Confirm Payment Request Schema
class ConfirmPaymentRequest(BaseModel):
    tenant_id: int
    invoice_id: Optional[int] = None
    amount_received: float
    payment_date: str
    payment_method: str
    reference_no: Optional[str] = None
    notes: Optional[str] = None
    send_sms: Optional[bool] = True
    send_whatsapp: Optional[bool] = True



# Hall Booking Schemas
class HallBookingBase(BaseModel):
    booking_id: Optional[str] = None
    booking_no: Optional[str] = None
    hall_name: Optional[str] = "Marriage Hall"
    booking_for: Optional[str] = "Family"
    booking_person: Optional[str] = None
    applicant: Optional[str] = None
    contact_number: Optional[str] = None
    booking_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    time_slot: Optional[str] = None
    function_type: Optional[str] = "Marriage"
    event: Optional[str] = "Marriage"
    status: Optional[str] = "Draft"
    hall_charge: Optional[float] = 0.0
    cleaning_charge: Optional[float] = 0.0
    other_charge: Optional[float] = 0.0
    total_charge: Optional[float] = 0.0
    total_fee: Optional[float] = 0.0
    advance_paid: Optional[float] = 0.0
    balance: Optional[float] = 0.0
    needs_cooking_vessels: Optional[bool] = False
    notes: Optional[str] = None
    document_url: Optional[str] = None
    family_id: Optional[int] = None
    family_member_id: Optional[int] = None
    family_name: Optional[str] = None   
    member_name: Optional[str] = None

class HallBookingCreate(HallBookingBase):
    pass

class HallBookingUpdate(BaseModel):
    hall_name: Optional[str] = None
    booking_for: Optional[str] = None
    booking_person: Optional[str] = None
    contact_number: Optional[str] = None
    booking_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    function_type: Optional[str] = None
    status: Optional[str] = None
    hall_charge: Optional[float] = None
    cleaning_charge: Optional[float] = None
    other_charge: Optional[float] = None
    advance_paid: Optional[float] = None
    needs_cooking_vessels: Optional[bool] = None
    notes: Optional[str] = None
    family_id: Optional[int] = None
    family_member_id: Optional[int] = None
    family_name: Optional[str] = None
    member_name: Optional[str] = None


class HallBookingResponse(HallBookingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True



# Vessel Category Schemas
class VesselCategoryBase(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    description: Optional[str] = None
    status: Optional[str] = "Active"

class VesselCategoryCreate(VesselCategoryBase):
    pass

class VesselCategoryUpdate(BaseModel):
    category_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class VesselCategoryResponse(VesselCategoryBase):
    id: int
    vessels_count: Optional[int] = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Cooking Vessel Schemas
class CookingVesselBase(BaseModel):
    vessel_id: Optional[str] = None
    vessel_code: Optional[str] = None
    vessel_name: Optional[str] = None
    item_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    capacity: Optional[str] = None
    total_quantity: Optional[int] = 1
    quantity: Optional[int] = 1
    available_quantity: Optional[int] = 1
    available: Optional[int] = 1
    condition: Optional[str] = "Good"
    available_for_rent: Optional[bool] = True
    rental_amount: Optional[float] = 0.0
    rental_rate_per_day: Optional[float] = 0.0
    rental_unit: Optional[str] = "Per Day"
    status: Optional[str] = "Available"
    notes: Optional[str] = None
    document_url: Optional[str] = None

class CookingVesselCreate(CookingVesselBase):
    pass

class CookingVesselUpdate(BaseModel):
    vessel_code: Optional[str] = None
    vessel_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    total_quantity: Optional[int] = None
    available_quantity: Optional[int] = None
    condition: Optional[str] = None
    available_for_rent: Optional[bool] = None
    rental_amount: Optional[float] = None
    rental_unit: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    document_url: Optional[str] = None

class CookingVesselResponse(CookingVesselBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True



# Property Document Schemas
class PropertyDocumentBase(BaseModel):
    doc_id: Optional[str] = None
    title: str
    category: Optional[str] = "Property Documents"
    associated_property: Optional[str] = None
    associated_tenant: Optional[str] = None
    property_id: Optional[int] = None
    tenant_id: Optional[int] = None
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


# Asset Schemas
class AssetItemBase(BaseModel):
    asset_code: Optional[str] = None
    asset_name: str
    category: Optional[str] = "Generator"
    brand_model: Optional[str] = None
    serial_number: Optional[str] = None
    barcode: Optional[str] = None
    location: Optional[str] = "Prayer Hall"
    condition: Optional[str] = "Good"
    status: Optional[str] = "Good"
    purchase_date: Optional[str] = None

    # Purchase Details
    supplier: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    quantity: Optional[int] = 1
    unit_cost: Optional[float] = 0.0
    purchase_cost: Optional[float] = 0.0
    tax_gst: Optional[float] = 0.0
    other_charges: Optional[float] = 0.0
    total_invoice_amount: Optional[float] = 0.0
    paid_from: Optional[str] = "General Fund"
    payment_ref: Optional[str] = None

    # Purchase Invoice & Notes
    invoice_doc_url: Optional[str] = None
    invoice_notes: Optional[str] = None

    # Warranty
    warranty_available: Optional[str] = "No"
    warranty_expiry: Optional[str] = None
    warranty_provider: Optional[str] = None

    # Maintenance Schedule
    maintenance_frequency: Optional[str] = "1 Month"
    next_maintenance: Optional[str] = None
    maintenance_required: Optional[str] = "Yes"

    # Documents
    other_doc_url: Optional[str] = None

    # Disposal Summary
    disposal_no: Optional[str] = None
    disposal_date: Optional[str] = None
    disposal_reason: Optional[str] = None
    disposal_type: Optional[str] = None
    sale_amount: Optional[float] = 0.0

class AssetItemCreate(AssetItemBase):
    pass

class AssetItemResponse(AssetItemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class AssetDisposalBase(BaseModel):
    disposal_no: Optional[str] = None
    asset_id: Optional[int] = None
    asset_code: Optional[str] = None
    asset_name: str
    disposal_date: str
    dispose_reason: Optional[str] = None
    disposal_type: str = "Demolish"
    sale_amount: Optional[float] = 0.0
    buyer_name: Optional[str] = None
    sale_ref_no: Optional[str] = None
    income_fund: Optional[str] = "General Fund"
    payment_method: Optional[str] = "Cash"
    transaction_ref: Optional[str] = None
    scrap_amount: Optional[float] = 0.0
    recovery_treatment: Optional[str] = "No Income"
    disposal_expenses: Optional[float] = 0.0
    net_disposal_amount: Optional[float] = 0.0
    disposal_notes: Optional[str] = None
    document_url: Optional[str] = None

class AssetDisposalCreate(AssetDisposalBase):
    pass

class AssetDisposalResponse(AssetDisposalBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AssetMaintenanceBase(BaseModel):
    maintenance_code: Optional[str] = None
    asset_id: Optional[int] = None
    asset_code: Optional[str] = None
    asset_name: str
    maintenance_type: Optional[str] = "Preventive"
    service_provider: Optional[str] = None
    service_date: Optional[str] = None
    next_due_date: Optional[str] = None
    status: Optional[str] = "Scheduled"

    # Work Details
    work_details: Optional[str] = None
    technician_notes: Optional[str] = None

    # Payment
    maintenance_cost: Optional[float] = 0.0
    cost: Optional[float] = 0.0
    payment_status: Optional[str] = "Unpaid"
    paid_from: Optional[str] = "General Fund"
    payment_method: Optional[str] = "Cash"
    amount_paid: Optional[float] = 0.0
    transaction_ref: Optional[str] = None

    # Completion
    completed: Optional[bool] = False
    document_url: Optional[str] = None

class AssetMaintenanceCreate(AssetMaintenanceBase):
    pass

class AssetMaintenanceUpdate(AssetMaintenanceBase):
    pass

class AssetMaintenanceResponse(AssetMaintenanceBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
