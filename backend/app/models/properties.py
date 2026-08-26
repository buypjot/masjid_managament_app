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


class RentCollection(Base):
    __tablename__ = "rent_collections"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    receipt_no = Column(String, unique=True, index=True, nullable=False)
    tenant_name = Column(String, nullable=False)
    shop = Column(String, nullable=True)
    month_year = Column(String, nullable=True)
    amount = Column(Float, default=0.0)
    payment_date = Column(String, nullable=True)
    payment_mode = Column(String, default="Cash")
    status = Column(String, default="Paid")
    created_at = Column(DateTime, default=datetime.utcnow)


class HallBooking(Base):
    __tablename__ = "hall_bookings"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    booking_id = Column(String, unique=True, index=True, nullable=False)
    applicant = Column(String, nullable=False)
    event = Column(String, nullable=False)
    booking_date = Column(String, nullable=True)
    time_slot = Column(String, nullable=True)
    total_fee = Column(Float, default=0.0)
    advance_paid = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    status = Column(String, default="Confirmed")
    created_at = Column(DateTime, default=datetime.utcnow)


class CookingVessel(Base):
    __tablename__ = "cooking_vessels"

    id = Column(Integer, primary_key=True, index=True)
    vessel_id = Column(String, unique=True, index=True, nullable=False)
    item_name = Column(String, nullable=False)
    capacity = Column(String, nullable=True)
    quantity = Column(Integer, default=1)
    available = Column(Integer, default=1)
    rental_rate_per_day = Column(Float, default=0.0)
    condition = Column(String, default="Excellent")
    created_at = Column(DateTime, default=datetime.utcnow)


class PropertyDocument(Base):
    __tablename__ = "property_documents"

    id = Column(Integer, primary_key=True, index=True)
    masjid_id = Column(Integer, ForeignKey("masjids.id"), nullable=True, index=True)
    doc_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=True)
    associated_property = Column(String, nullable=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True)
    upload_date = Column(String, nullable=True)
    file_type = Column(String, default="PDF Document")
    file_size = Column(String, default="1.0 MB")
    file_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="documents")
