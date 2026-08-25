from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Family(Base):
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, index=True)

    family_code = Column(String, unique=True, index=True, nullable=False)
    family_name = Column(String, nullable=False)
    head_name = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    gender = Column(String, default="Male")
    dob = Column(String, nullable=True)
    mobile_number = Column(String, nullable=True)
    joining_date = Column(String, nullable=True)
    relationship_type = Column(String, default="Family Head")
    aadhar_ref = Column(String, nullable=True)
    
    # Address Details
    house_no = Column(String, nullable=True)
    street = Column(String, nullable=True)
    area = Column(String, default="Main Street")
    city = Column(String, default="Tenkasi")
    pin_code = Column(String, default="627811")
    landmark = Column(String, nullable=True)

    member_count = Column(Integer, default=1)
    monthly_santha = Column(Float, default=500.0)
    santha_due_day = Column(Integer, default=20)
    pending_amount = Column(Float, default=0.0)
    collected_amount = Column(Float, default=0.0)
    is_poor_family = Column(Boolean, default=False)
    status = Column(String, default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)


    members = relationship("FamilyMember", back_populates="family", cascade="all, delete-orphan")



class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    member_code = Column(String, index=True, nullable=True)
    full_name = Column(String, nullable=False)
    gender = Column(String, default="Male")
    dob = Column(String, nullable=True)
    mobile_number = Column(String, nullable=True)
    marital_status = Column(String, default="Single")
    relationship_type = Column(String, default="Family Head")
    status = Column(String, default="Active")
    occupation = Column(String, nullable=True)
    education = Column(String, nullable=True)
    email = Column(String, nullable=True)
    document_name = Column(String, nullable=True)
    is_head = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    family = relationship("Family", back_populates="members")



class FamilyHeadChange(Base):
    __tablename__ = "family_head_changes"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    family_name = Column(String, nullable=False)
    old_head = Column(String, nullable=False)
    new_head = Column(String, nullable=False)
    reason = Column(String, nullable=True)
    old_details = Column(Text, nullable=True)
    new_details = Column(Text, nullable=True)
    changed_by = Column(String, default="Admin User")
    changed_at = Column(DateTime, default=datetime.utcnow)


class MemberRequest(Base):
    __tablename__ = "member_requests"

    id = Column(Integer, primary_key=True, index=True)
    family_name = Column(String, nullable=False)
    member_name = Column(String, nullable=False)
    request_type = Column(String, default="Add Member")
    details = Column(Text, nullable=True)
    status = Column(String, default="Pending")
    requested_at = Column(DateTime, default=datetime.utcnow)


class CommunityFunction(Base):
    __tablename__ = "community_functions"

    id = Column(Integer, primary_key=True, index=True)
    function_no = Column(String, nullable=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    family_name = Column(String, nullable=False)
    function_type = Column(String, nullable=True)
    function_title = Column(String, nullable=True)
    member_name = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    event_date = Column(String, nullable=True)
    amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    payment_method = Column(String, default="Cash")
    receipt_no = Column(String, nullable=True)
    formalities = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="Paid")
    created_at = Column(DateTime, default=datetime.utcnow)
