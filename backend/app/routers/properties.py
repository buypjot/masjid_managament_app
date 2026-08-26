from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.utils.security import get_current_user, get_current_masjid_id
from app.models.properties import (
    Property,
    PropertyUnit,
    Tenant,
    RentCollection,
    HallBooking,
    CookingVessel,
    PropertyDocument
)
from app.schemas.properties import (
    PropertyCreate,
    PropertyResponse,
    TenantCreate,
    TenantResponse,
    RentCollectionCreate,
    RentCollectionResponse,
    HallBookingCreate,
    HallBookingResponse,
    CookingVesselCreate,
    CookingVesselResponse,
    PropertyDocumentCreate,
    PropertyDocumentResponse
)

router = APIRouter(prefix="/api/properties", tags=["Properties & Assets"])

# ----------------------------------------------------
# PROPERTIES & UNITS ENDPOINTS
# ----------------------------------------------------
@router.get("", response_model=List[PropertyResponse])
def get_properties(
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Fetch all properties with nested units."""
    query = db.query(Property).filter(Property.masjid_id == masjid_id)
    if search:
        query = query.filter(
            Property.property_name.ilike(f"%{search}%") |
            Property.property_number.ilike(f"%{search}%") |
            Property.property_type.ilike(f"%{search}%")
        )
    return query.order_by(Property.id.desc()).all()


@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property(
    prop_in: PropertyCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Create a new property along with its individual units."""
    # Generate auto code if not provided
    if not prop_in.property_number:
        count = db.query(Property).filter(Property.masjid_id == masjid_id).count()
        prop_in.property_number = f"PROP-{count + 1:03d}"

    # Check for existing code
    existing = db.query(Property).filter(Property.property_number == prop_in.property_number, Property.masjid_id == masjid_id).first()
    if existing:
        count = db.query(Property).filter(Property.masjid_id == masjid_id).count()
        prop_in.property_number = f"PROP-{count + 10:03d}"

    db_property = Property(
        masjid_id=masjid_id,
        property_number=prop_in.property_number,
        property_name=prop_in.property_name,
        property_type=prop_in.property_type,
        door_house_no=prop_in.door_house_no,
        street=prop_in.street,
        area=prop_in.area,
        city=prop_in.city or "Tenkasi",
        pin_code=prop_in.pin_code or "627811",
        status=prop_in.status or "Active",
        number_of_units=len(prop_in.units) if prop_in.units else prop_in.number_of_units or 1,
        rent_frequency=prop_in.rent_frequency or "Monthly",
        default_due_date=prop_in.default_due_date or "5",
        security_deposit=prop_in.security_deposit or "Yes",
        current_tenant=prop_in.current_tenant or "Vacant",
        monthly_rent=prop_in.monthly_rent if prop_in.monthly_rent is not None else 0.0,
        deposit_amount=prop_in.deposit_amount if prop_in.deposit_amount is not None else 0.0
    )

    db.add(db_property)
    db.commit()
    db.refresh(db_property)

    # Insert Units if provided
    if prop_in.units:
        for u in prop_in.units:
            db_unit = PropertyUnit(
                masjid_id=masjid_id,
                property_id=db_property.id,
                unit_no=u.unit_no,
                door_no=u.door_no or prop_in.door_house_no,
                floor=u.floor or "Ground Floor",
                area_sqft=u.area_sqft or "500",
                availability=u.availability or "Available",
                rent_amount=u.rent_amount if u.rent_amount is not None else 0.0,
                tenant_name=u.tenant_name
            )
            db.add(db_unit)
        db.commit()
        db.refresh(db_property)

    return db_property


@router.get("/{prop_id}", response_model=PropertyResponse)
def get_property_by_id(
    prop_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Fetch single property by ID."""
    db_prop = db.query(Property).filter(Property.id == prop_id, Property.masjid_id == masjid_id).first()
    if not db_prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return db_prop


@router.delete("/{prop_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    prop_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Delete a property."""
    db_prop = db.query(Property).filter(Property.id == prop_id, Property.masjid_id == masjid_id).first()
    if not db_prop:
        raise HTTPException(status_code=404, detail="Property not found")
    db.delete(db_prop)
    db.commit()
    return None


# ----------------------------------------------------
# TENANTS ENDPOINTS
# ----------------------------------------------------
@router.get("/tenants/list", response_model=List[TenantResponse])
def get_tenants(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Fetch all tenants with associated property names."""
    tenants = db.query(Tenant).filter(Tenant.masjid_id == masjid_id).order_by(Tenant.id.desc()).all()
    results = []
    for t in tenants:
        res = TenantResponse.from_orm(t)
        if t.property:
            res.property_name = t.property.property_name
        results.append(res)
    return results


@router.post("/tenants/list", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_in: TenantCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Add a new tenant and update assigned property/unit status."""
    if not tenant_in.tenant_code:
        count = db.query(Tenant).filter(Tenant.masjid_id == masjid_id).count()
        tenant_in.tenant_code = f"TEN-{count + 1:04d}"

    db_tenant = Tenant(**tenant_in.dict(), masjid_id=masjid_id)
    db.add(db_tenant)

    prop_name = None
    # Update associated Property & PropertyUnit if assigned
    if tenant_in.property_id:
        prop = db.query(Property).filter(Property.id == tenant_in.property_id, Property.masjid_id == masjid_id).first()
        if prop:
            prop_name = prop.property_name
            prop.current_tenant = tenant_in.name
            if tenant_in.monthly_rent:
                prop.monthly_rent = tenant_in.monthly_rent
            if tenant_in.security_deposit:
                prop.deposit_amount = tenant_in.security_deposit

            # If specific unit was assigned, update unit availability
            if tenant_in.assigned_shop:
                unit = db.query(PropertyUnit).filter(
                    PropertyUnit.property_id == prop.id,
                    PropertyUnit.unit_no == tenant_in.assigned_shop
                ).first()
                if unit:
                    unit.availability = "Occupied"
                    unit.tenant_name = tenant_in.name
                    if tenant_in.monthly_rent:
                        unit.rent_amount = tenant_in.monthly_rent

    db.commit()
    db.refresh(db_tenant)
    res = TenantResponse.from_orm(db_tenant)
    res.property_name = prop_name
    return res


# ----------------------------------------------------
# RENT COLLECTIONS ENDPOINTS
# ----------------------------------------------------
@router.get("/collections/list", response_model=List[RentCollectionResponse])
def get_rent_collections(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Fetch rent collection history."""
    return db.query(RentCollection).filter(RentCollection.masjid_id == masjid_id).order_by(RentCollection.id.desc()).all()


@router.post("/collections/list", response_model=RentCollectionResponse, status_code=status.HTTP_201_CREATED)
def create_rent_collection(
    col_in: RentCollectionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Record a rent collection payment."""
    if not col_in.receipt_no:
        count = db.query(RentCollection).filter(RentCollection.masjid_id == masjid_id).count()
        col_in.receipt_no = f"RCP-2026-{count + 101:03d}"

    db_col = RentCollection(**col_in.dict(), masjid_id=masjid_id)
    db.add(db_col)
    db.commit()
    db.refresh(db_col)
    return db_col


# ----------------------------------------------------
# HALL BOOKINGS ENDPOINTS
# ----------------------------------------------------
@router.get("/hall-bookings/list", response_model=List[HallBookingResponse])
def get_hall_bookings(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Fetch hall bookings."""
    return db.query(HallBooking).filter(HallBooking.masjid_id == masjid_id).order_by(HallBooking.id.desc()).all()


@router.post("/hall-bookings/list", response_model=HallBookingResponse, status_code=status.HTTP_201_CREATED)
def create_hall_booking(
    hb_in: HallBookingCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Create a hall booking."""
    if not hb_in.booking_id:
        count = db.query(HallBooking).filter(HallBooking.masjid_id == masjid_id).count()
        hb_in.booking_id = f"HB-{count + 901:03d}"

    db_hb = HallBooking(**hb_in.dict(), masjid_id=masjid_id)
    db.add(db_hb)
    db.commit()
    db.refresh(db_hb)
    return db_hb


# ----------------------------------------------------
# COOKING VESSELS ENDPOINTS
# ----------------------------------------------------
@router.get("/vessels/list", response_model=List[CookingVesselResponse])
def get_cooking_vessels(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Fetch cooking vessels inventory."""
    return db.query(CookingVessel).filter(CookingVessel.masjid_id == masjid_id).order_by(CookingVessel.id.desc()).all()


@router.post("/vessels/list", response_model=CookingVesselResponse, status_code=status.HTTP_201_CREATED)
def create_cooking_vessel(
    cv_in: CookingVesselCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Add cooking vessel to inventory."""
    if not cv_in.vessel_id:
        count = db.query(CookingVessel).filter(CookingVessel.masjid_id == masjid_id).count()
        cv_in.vessel_id = f"CVS-{count + 1:02d}"

    db_cv = CookingVessel(**cv_in.dict(), masjid_id=masjid_id)
    db.add(db_cv)
    db.commit()
    db.refresh(db_cv)
    return db_cv


# ----------------------------------------------------
# PROPERTY DOCUMENTS ENDPOINTS
# ----------------------------------------------------
@router.get("/documents/list", response_model=List[PropertyDocumentResponse])
def get_property_documents(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Fetch property documents."""
    return db.query(PropertyDocument).filter(PropertyDocument.masjid_id == masjid_id).order_by(PropertyDocument.id.desc()).all()


@router.post("/documents/list", response_model=PropertyDocumentResponse, status_code=status.HTTP_201_CREATED)
def create_property_document(
    doc_in: PropertyDocumentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Add a property document record."""
    if not doc_in.doc_id:
        count = db.query(PropertyDocument).filter(PropertyDocument.masjid_id == masjid_id).count()
        doc_in.doc_id = f"DOC-{count + 1:02d}"

    db_doc = PropertyDocument(**doc_in.dict(), masjid_id=masjid_id)
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc
