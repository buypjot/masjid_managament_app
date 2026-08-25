from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from datetime import datetime
from app.database import Base

class SanthaCollection(Base):
    __tablename__ = "santha_collections"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String, nullable=False, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    family_code = Column(String, nullable=True)
    family_name = Column(String, nullable=False)
    head_name = Column(String, nullable=True)
    month = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    payment_date = Column(String, nullable=True)
    amount = Column(Float, default=0.0)
    payment_method = Column(String, default="Cash")
    financial_account = Column(String, default="Main Cash")
    allocation = Column(String, default="Auto")
    reference_id = Column(String, nullable=True)
    collector_name = Column(String, default="Admin User")
    is_advance = Column(Boolean, default=False)
    is_arrears = Column(Boolean, default=False)
    advance_months = Column(Integer, default=0)
    advance_period = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class JumaCollection(Base):
    __tablename__ = "juma_collections"

    id = Column(Integer, primary_key=True, index=True)
    contributor_type = Column(String, default="Family")  # "Family" or "Other Person"
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    family_code = Column(String, nullable=True)
    receipt_no = Column(String, nullable=True, index=True)
    collection_date = Column(String, nullable=False)
    donor_name = Column(String, nullable=True)
    
    # Category Breakdown
    general_amount = Column(Float, default=0.0)
    madrasa_amount = Column(Float, default=0.0)
    ramadan_amount = Column(Float, default=0.0)
    zakat_amount = Column(Float, default=0.0)
    welfare_amount = Column(Float, default=0.0)
    graveyard_amount = Column(Float, default=0.0)
    other_amount = Column(Float, default=0.0)
    
    # Payment Method Breakdown
    cash_amount = Column(Float, default=0.0)
    upi_amount = Column(Float, default=0.0)
    paytm_amount = Column(Float, default=0.0)
    bank_amount = Column(Float, default=0.0)
    cheque_amount = Column(Float, default=0.0)

    payment_method = Column(String, default="Cash")
    amount = Column(Float, default=0.0)
    status = Column(String, default="Received")
    juma_type = Column(String, default="1st Juma Prayer")
    counted_by = Column(String, default="Masjid Committee")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    contributor_type = Column(String, default="Family")  # "Family" or "Other Person"
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    family_code = Column(String, nullable=True)
    receipt_no = Column(String, nullable=False, index=True)
    donation_date = Column(String, nullable=True)
    donor_name = Column(String, nullable=False)
    donor_mobile = Column(String, nullable=True)
    category = Column(String, default="General Donation")
    
    # Category Breakdown
    general_amount = Column(Float, default=0.0)
    madrasa_amount = Column(Float, default=0.0)
    ramadan_amount = Column(Float, default=0.0)
    zakat_amount = Column(Float, default=0.0)
    welfare_amount = Column(Float, default=0.0)
    graveyard_amount = Column(Float, default=0.0)
    other_amount = Column(Float, default=0.0)

    # Payment Method Breakdown
    cash_amount = Column(Float, default=0.0)
    upi_amount = Column(Float, default=0.0)
    paytm_amount = Column(Float, default=0.0)
    bank_amount = Column(Float, default=0.0)
    cheque_amount = Column(Float, default=0.0)

    amount = Column(Float, default=0.0)
    payment_method = Column(String, default="Cash")
    notes = Column(Text, nullable=True)
    status = Column(String, default="Received")
    created_at = Column(DateTime, default=datetime.utcnow)
