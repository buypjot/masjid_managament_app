from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    property_number = Column(String, unique=True, index=True, nullable=False)
    property_name = Column(String, nullable=False)
    property_type = Column(String, default="Commercial Complex")
    
    # Address details
    door_house_no = Column(String, nullable=True)
    street = Column(String, nullable=True)
    area = Column(String, nullable=True)
    city = Column(String, default="Tenkasi")
    pin_code = Column(String, default="627811")
    
    status = Column(String, default="Active")
    number_of_units = Column(Integer, default=1)
    
    # Rental Configurations
    rent_frequency = Column(String, default="Monthly")
    default_due_date = Column(String, default="5")
    security_deposit = Column(String, default="Yes")
    
    # Aggregate summaries
    current_tenant = Column(String, default="Vacant")
    monthly_rent = Column(Float, default=0.0)
    deposit_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    units = relationship("PropertyUnit", back_populates="property", cascade="all, delete-orphan")
    tenants = relationship("Tenant", back_populates="property")
    documents = relationship("PropertyDocument", back_populates="property", cascade="all, delete-orphan")


class PropertyUnit(Base):
    __tablename__ = "property_units"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    unit_no = Column(String, nullable=False)
    door_no = Column(String, nullable=True)
    floor = Column(String, default="Ground Floor")
    area_sqft = Column(String, default="500")
    availability = Column(String, default="Available") # Available, Occupied, Reserved, Maintenance
    rent_amount = Column(Float, default=0.0)
    tenant_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="units")


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    tenant_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    contact_person = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    door_no = Column(String, nullable=True)
    street = Column(String, nullable=True)
    city = Column(String, default="Tenkasi")
    pin_code = Column(String, default="627811")
    govt_id = Column(String, nullable=True)
    doc_notes = Column(Text, nullable=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True)
    assigned_shop = Column(String, nullable=True)
    monthly_rent = Column(Float, default=0.0)
    due_day = Column(String, default="5")
    security_deposit = Column(Float, default=0.0)
    agreement_start = Column(String, nullable=True)
    agreement_end = Column(String, nullable=True)
    advance_paid = Column(Float, default=0.0)
    status = Column(String, default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="tenants")


class RentInvoice(Base):
    __tablename__ = "rent_invoices"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    invoice_no = Column(String, unique=True, index=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    tenant_name = Column(String, nullable=False)
    property_name = Column(String, nullable=True)
    assigned_shop = Column(String, nullable=True)
    for_month = Column(String, nullable=False) # e.g. "August 2026"
    invoice_date = Column(String, nullable=True) # e.g. "01 Aug 2026"
    due_date = Column(String, nullable=True) # e.g. "05 Aug 2026"
    rent_amount = Column(Float, default=0.0)
    late_fee = Column(Float, default=0.0)
    other_charges = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    amount_paid = Column(Float, default=0.0)
    status = Column(String, default="Pending") # Pending, Paid, Overdue, Partial
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", backref="invoices")


class RentCollection(Base):
    __tablename__ = "rent_collections"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    receipt_no = Column(String, unique=True, index=True, nullable=False)
    invoice_id = Column(Integer, ForeignKey("rent_invoices.id"), nullable=True, index=True)
    invoice_no = Column(String, nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    tenant_name = Column(String, nullable=False)
    shop = Column(String, nullable=True)
    month_year = Column(String, nullable=True)
    amount = Column(Float, default=0.0)
    payment_date = Column(String, nullable=True)
    payment_mode = Column(String, default="Cash")
    reference_no = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    send_sms = Column(Boolean, default=True)
    send_whatsapp = Column(Boolean, default=True)
    status = Column(String, default="Paid")
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", backref="collections")
    invoice = relationship("RentInvoice", backref="payments")



class HallBooking(Base):
    __tablename__ = "hall_bookings"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    booking_id = Column(String, unique=True, index=True, nullable=False)
    booking_no = Column(String, nullable=True)
    hall_name = Column(String, default="Marriage Hall")
    booking_for = Column(String, default="Family")
    booking_person = Column(String, nullable=True)
    applicant = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    booking_date = Column(String, nullable=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    time_slot = Column(String, nullable=True)
    function_type = Column(String, nullable=True)
    event = Column(String, nullable=True)
    status = Column(String, default="Confirmed")
    hall_charge = Column(Float, default=0.0)
    cleaning_charge = Column(Float, default=0.0)
    other_charge = Column(Float, default=0.0)
    total_charge = Column(Float, default=0.0)
    total_fee = Column(Float, default=0.0)
    advance_paid = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    needs_cooking_vessels = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    document_url = Column(String, nullable=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True, index=True)
    family_member_id = Column(Integer, ForeignKey("family_members.id"), nullable=True, index=True)
    family_name = Column(String, nullable=True)
    member_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)





class VesselCategory(Base):
    __tablename__ = "vessel_categories"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    category_id = Column(String, index=True, nullable=True)
    category_name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String, default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    vessels = relationship("CookingVessel", back_populates="category_rel")


class CookingVessel(Base):
    __tablename__ = "cooking_vessels"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    vessel_id = Column(String, index=True, nullable=False)
    vessel_code = Column(String, nullable=True)
    vessel_name = Column(String, nullable=False)
    item_name = Column(String, nullable=True)
    category_id = Column(Integer, ForeignKey("vessel_categories.id"), nullable=True, index=True)
    category_name = Column(String, nullable=True)
    capacity = Column(String, nullable=True)
    total_quantity = Column(Integer, default=1)
    quantity = Column(Integer, default=1)
    available_quantity = Column(Integer, default=1)
    available = Column(Integer, default=1)
    condition = Column(String, default="Good")
    available_for_rent = Column(Boolean, default=True)
    rental_amount = Column(Float, default=0.0)
    rental_rate_per_day = Column(Float, default=0.0)
    rental_unit = Column(String, default="Per Day")
    status = Column(String, default="Available")
    notes = Column(Text, nullable=True)
    document_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category_rel = relationship("VesselCategory", back_populates="vessels")



class PropertyDocument(Base):
    __tablename__ = "property_documents"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    doc_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=True) # E.g., 'Property Documents', 'Tenant Documents', 'Rental Agreement Documents', 'Rent Collection Documents'
    associated_property = Column(String, nullable=True)
    associated_tenant = Column(String, nullable=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    upload_date = Column(String, nullable=True)
    file_type = Column(String, default="PDF Document")
    file_size = Column(String, default="1.0 MB")
    file_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="documents")


class AssetItem(Base):
    __tablename__ = "asset_items"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    asset_code = Column(String, unique=True, index=True, nullable=False)
    asset_name = Column(String, nullable=False)
    category = Column(String, default="Generator")
    brand_model = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    location = Column(String, default="Prayer Hall")
    condition = Column(String, default="Good") # Good, Needs Service, Under Repair, Inactive, Disposed
    status = Column(String, default="Good") # Good, Needs Service, Under Repair, Inactive, Disposed
    purchase_date = Column(String, nullable=True)

    # Purchase Details
    supplier = Column(String, nullable=True)
    invoice_number = Column(String, nullable=True)
    invoice_date = Column(String, nullable=True)
    quantity = Column(Integer, default=1)
    unit_cost = Column(Float, default=0.0)
    purchase_cost = Column(Float, default=0.0)
    tax_gst = Column(Float, default=0.0)
    other_charges = Column(Float, default=0.0)
    total_invoice_amount = Column(Float, default=0.0)
    paid_from = Column(String, default="General Fund")
    payment_ref = Column(String, nullable=True)

    # Purchase Invoice & Notes
    invoice_doc_url = Column(String, nullable=True)
    invoice_notes = Column(Text, nullable=True)

    # Warranty
    warranty_available = Column(String, default="No")
    warranty_expiry = Column(String, nullable=True)
    warranty_provider = Column(String, nullable=True)

    # Maintenance Schedule
    maintenance_frequency = Column(String, default="1 Month")
    next_maintenance = Column(String, nullable=True)
    maintenance_required = Column(String, default="Yes")

    # Documents
    other_doc_url = Column(String, nullable=True)

    # Disposal Summary
    disposal_no = Column(String, nullable=True)
    disposal_date = Column(String, nullable=True)
    disposal_reason = Column(Text, nullable=True)
    disposal_type = Column(String, nullable=True)
    sale_amount = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)


class AssetMaintenanceRecord(Base):
    __tablename__ = "asset_maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    maintenance_code = Column(String, unique=True, index=True, nullable=False)
    asset_id = Column(Integer, ForeignKey("asset_items.id"), nullable=True)
    asset_code = Column(String, nullable=True)
    asset_name = Column(String, nullable=False)
    maintenance_type = Column(String, default="Preventive")
    service_provider = Column(String, nullable=True)
    service_date = Column(String, nullable=True)
    next_due_date = Column(String, nullable=True)
    status = Column(String, default="Scheduled")
    
    # Work Details
    work_details = Column(Text, nullable=True)
    technician_notes = Column(Text, nullable=True)

    # Payment
    maintenance_cost = Column(Float, default=0.0)
    cost = Column(Float, default=0.0)
    payment_status = Column(String, default="Unpaid")
    paid_from = Column(String, default="General Fund")
    payment_method = Column(String, default="Cash")
    amount_paid = Column(Float, default=0.0)
    transaction_ref = Column(String, nullable=True)

    # Completion
    completed = Column(Boolean, default=False)
    document_url = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AssetDisposalRecord(Base):
    __tablename__ = "asset_disposals"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    disposal_no = Column(String, unique=True, index=True, nullable=False)
    asset_id = Column(Integer, ForeignKey("asset_items.id"), nullable=True)
    asset_code = Column(String, nullable=True)
    asset_name = Column(String, nullable=False)
    disposal_date = Column(String, nullable=False)
    dispose_reason = Column(Text, nullable=True)
    disposal_type = Column(String, nullable=False) # Demolish, Sale
    sale_amount = Column(Float, default=0.0)
    buyer_name = Column(String, nullable=True)
    sale_ref_no = Column(String, nullable=True)
    income_fund = Column(String, default="General Fund")
    payment_method = Column(String, default="Cash")
    transaction_ref = Column(String, nullable=True)
    scrap_amount = Column(Float, default=0.0)
    recovery_treatment = Column(String, default="No Income") # No Income, Record as Other Income
    
    # Financial Calculation
    disposal_expenses = Column(Float, default=0.0)
    net_disposal_amount = Column(Float, default=0.0)
    disposal_notes = Column(Text, nullable=True)

    document_url = Column(String, nullable=True)
    status = Column(String, default="Completed")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
