from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SanthaCollectionCreate(BaseModel):
    family_id: int
    family_name: str
    family_code: Optional[str] = None
    head_name: Optional[str] = None
    month: str
    year: int
    payment_date: Optional[str] = None
    amount: float
    payment_method: Optional[str] = "Cash"
    financial_account: Optional[str] = "Main Cash"
    allocation: Optional[str] = "Auto"
    reference_id: Optional[str] = None
    collector_name: Optional[str] = "Admin User"
    is_advance: Optional[bool] = False
    is_arrears: Optional[bool] = False
    advance_months: Optional[int] = 0
    advance_period: Optional[str] = None
    previous_balance: Optional[float] = 0.0
    remaining_balance: Optional[float] = 0.0
    notes: Optional[str] = None

class SanthaCollectionResponse(BaseModel):
    id: int
    receipt_no: str
    family_id: Optional[int] = None
    family_code: Optional[str] = None
    family_name: str
    head_name: Optional[str] = None
    month: str
    year: int
    payment_date: Optional[str] = None
    amount: float
    payment_method: str
    financial_account: Optional[str] = "Main Cash"
    allocation: Optional[str] = "Auto"
    reference_id: Optional[str] = None
    collector_name: str
    is_advance: bool
    is_arrears: bool
    advance_months: Optional[int] = 0
    advance_period: Optional[str] = None
    previous_balance: Optional[float] = 0.0
    remaining_balance: Optional[float] = 0.0
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class JumaCollectionCreate(BaseModel):
    contributor_type: Optional[str] = "Family"
    family_id: Optional[int] = None
    family_code: Optional[str] = None
    receipt_no: Optional[str] = None
    collection_date: Optional[str] = None
    donor_name: Optional[str] = None
    general_amount: Optional[float] = 0.0
    madrasa_amount: Optional[float] = 0.0
    ramadan_amount: Optional[float] = 0.0
    zakat_amount: Optional[float] = 0.0
    welfare_amount: Optional[float] = 0.0
    graveyard_amount: Optional[float] = 0.0
    other_amount: Optional[float] = 0.0
    cash_amount: Optional[float] = 0.0
    upi_amount: Optional[float] = 0.0
    paytm_amount: Optional[float] = 0.0
    bank_amount: Optional[float] = 0.0
    cheque_amount: Optional[float] = 0.0
    payment_method: Optional[str] = "Cash"
    amount: Optional[float] = 0.0
    status: Optional[str] = "Received"
    juma_type: Optional[str] = "1st Juma Prayer"
    counted_by: Optional[str] = "Masjid Committee"
    notes: Optional[str] = None

class JumaCollectionResponse(BaseModel):
    id: int
    contributor_type: Optional[str] = "Family"
    family_id: Optional[int] = None
    family_code: Optional[str] = None
    receipt_no: Optional[str] = None
    collection_date: Optional[str] = None
    donor_name: Optional[str] = None
    general_amount: Optional[float] = 0.0
    madrasa_amount: Optional[float] = 0.0
    ramadan_amount: Optional[float] = 0.0
    zakat_amount: Optional[float] = 0.0
    welfare_amount: Optional[float] = 0.0
    graveyard_amount: Optional[float] = 0.0
    other_amount: Optional[float] = 0.0
    cash_amount: Optional[float] = 0.0
    upi_amount: Optional[float] = 0.0
    paytm_amount: Optional[float] = 0.0
    bank_amount: Optional[float] = 0.0
    cheque_amount: Optional[float] = 0.0
    payment_method: Optional[str] = "Cash"
    amount: float
    status: Optional[str] = "Received"
    juma_type: Optional[str] = "1st Juma Prayer"
    counted_by: Optional[str] = "Masjid Committee"
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DonationCreate(BaseModel):
    contributor_type: Optional[str] = "Family"
    family_id: Optional[int] = None
    family_code: Optional[str] = None
    receipt_no: Optional[str] = None
    donor_name: str
    donor_mobile: Optional[str] = None
    category: Optional[str] = "General Donation"
    donation_date: Optional[str] = None
    general_amount: Optional[float] = 0.0
    madrasa_amount: Optional[float] = 0.0
    ramadan_amount: Optional[float] = 0.0
    zakat_amount: Optional[float] = 0.0
    welfare_amount: Optional[float] = 0.0
    graveyard_amount: Optional[float] = 0.0
    other_amount: Optional[float] = 0.0
    cash_amount: Optional[float] = 0.0
    upi_amount: Optional[float] = 0.0
    paytm_amount: Optional[float] = 0.0
    bank_amount: Optional[float] = 0.0
    cheque_amount: Optional[float] = 0.0
    amount: Optional[float] = 0.0
    payment_method: Optional[str] = "Cash"
    status: Optional[str] = "Received"
    notes: Optional[str] = None

class DonationResponse(BaseModel):
    id: int
    contributor_type: Optional[str] = "Family"
    family_id: Optional[int] = None
    family_code: Optional[str] = None
    receipt_no: str
    donor_name: str
    donor_mobile: Optional[str] = None
    category: str
    donation_date: Optional[str] = None
    general_amount: Optional[float] = 0.0
    madrasa_amount: Optional[float] = 0.0
    ramadan_amount: Optional[float] = 0.0
    zakat_amount: Optional[float] = 0.0
    welfare_amount: Optional[float] = 0.0
    graveyard_amount: Optional[float] = 0.0
    other_amount: Optional[float] = 0.0
    cash_amount: Optional[float] = 0.0
    upi_amount: Optional[float] = 0.0
    paytm_amount: Optional[float] = 0.0
    bank_amount: Optional[float] = 0.0
    cheque_amount: Optional[float] = 0.0
    amount: float
    payment_method: str
    notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
