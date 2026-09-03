from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import re

from app.database import get_db
from app.utils.security import get_current_user, get_current_masjid_id
from app.models.properties import (
    Property,
    PropertyUnit,
    Tenant,
    RentInvoice,
    RentCollection,
    HallBooking,
    VesselCategory,
    CookingVessel,
    PropertyDocument,
    AssetItem,
    AssetMaintenanceRecord,
    AssetDisposalRecord
)
from app.models.collections import Donation
from app.schemas.properties import (
    PropertyCreate,
    PropertyResponse,
    TenantCreate,
    TenantResponse,
    RentCollectionCreate,
    RentCollectionResponse,
    RentInvoiceResponse,
    ConfirmPaymentRequest,
    HallBookingCreate,
    HallBookingUpdate,
    HallBookingResponse,
    VesselCategoryCreate,
    VesselCategoryUpdate,
    VesselCategoryResponse,
    CookingVesselCreate,
    CookingVesselUpdate,
    CookingVesselResponse,
    PropertyDocumentCreate,
    PropertyDocumentResponse,
    AssetItemCreate,
    AssetItemResponse,
    AssetMaintenanceCreate,
    AssetMaintenanceUpdate,
    AssetMaintenanceResponse,
    AssetDisposalCreate,
    AssetDisposalResponse
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





# Helper utilities for month parsing and tracking
def parse_month_year(month_year_str: str) -> datetime:
    """Parses month year strings like 'August 2026', 'Aug 2026', '2026-08' into a datetime object (1st of month)."""
    if not month_year_str:
        return datetime.now().replace(day=1)
    
    clean_str = month_year_str.strip()
    for fmt in ("%B %Y", "%b %Y", "%Y-%m", "%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(clean_str, fmt).replace(day=1)
        except ValueError:
            pass
    return datetime.now().replace(day=1)

def get_next_month_str(month_year_str: str) -> str:
    """Given a month string like 'August 2026', returns 'September 2026'."""
    dt = parse_month_year(month_year_str)
    if dt.month == 12:
        next_dt = dt.replace(year=dt.year + 1, month=1, day=1)
    else:
        next_dt = dt.replace(month=dt.month + 1, day=1)
    return next_dt.strftime("%B %Y")


# ----------------------------------------------------
# TENANTS & RENT STATS ENDPOINTS
# ----------------------------------------------------
@router.get("/tenants/list", response_model=List[TenantResponse])
def get_tenants(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Fetch all tenants with associated property names and live rent payment status."""
    tenants = db.query(Tenant).filter(Tenant.masjid_id == masjid_id).order_by(Tenant.id.desc()).all()
    results = []
    now_month = datetime.now().strftime("%B %Y")

    for t in tenants:
        res = TenantResponse.from_orm(t)
        if t.property:
            res.property_name = t.property.property_name

        latest_paid_inv = db.query(RentInvoice).filter(
            (RentInvoice.masjid_id == masjid_id) | (RentInvoice.masjid_id == None),
            RentInvoice.tenant_id == t.id,
            RentInvoice.status == "Paid"
        ).order_by(RentInvoice.id.desc()).first()

        active_inv = get_or_generate_tenant_invoice(db, t, masjid_id)

        latest_col = db.query(RentCollection).filter(
            (RentCollection.masjid_id == masjid_id) | (RentCollection.masjid_id == None),
            (RentCollection.tenant_id == t.id) | (RentCollection.tenant_name == t.name)
        ).order_by(RentCollection.id.desc()).first()


        if latest_paid_inv:
            res.payment_status = "Completed"
            res.current_month_status = "Paid"
            res.paid_month = latest_paid_inv.for_month
            res.amount_paid = latest_paid_inv.amount_paid or t.monthly_rent or 0.0
            res.pending_amount = 0.0

            paid_dt = parse_month_year(latest_paid_inv.for_month)
            active_dt = parse_month_year(active_inv.for_month) if active_inv else paid_dt

            if active_inv and active_dt > paid_dt:
                res.next_due_month = active_inv.for_month
                res.next_due_amount = active_inv.total_amount
                res.next_due_date = active_inv.due_date
            else:
                next_month_str = get_next_month_str(latest_paid_inv.for_month)
                res.next_due_month = next_month_str
                res.next_due_amount = t.monthly_rent or 0.0
                res.next_due_date = active_inv.due_date if active_inv else None
        else:
            res.payment_status = "Pending"
            res.current_month_status = "Pending"
            res.current_month_name = active_inv.for_month if active_inv else now_month
            res.amount_paid = active_inv.amount_paid if active_inv else 0.0
            res.pending_amount = max(0.0, (active_inv.total_amount if active_inv else (t.monthly_rent or 0.0)) - (active_inv.amount_paid if active_inv else 0.0))
            res.paid_month = None
            res.next_due_month = active_inv.for_month if active_inv else now_month
            res.next_due_amount = active_inv.total_amount if active_inv else (t.monthly_rent or 0.0)
            res.next_due_date = active_inv.due_date if active_inv else None

        if latest_col:
            res.last_payment_date = latest_col.payment_date

        results.append(res)
    return results



@router.get("/rent-stats")
def get_rent_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    tenants = db.query(Tenant).filter((Tenant.masjid_id == masjid_id) | (Tenant.masjid_id == None)).all()
    
    collections = db.query(RentCollection).filter((RentCollection.masjid_id == masjid_id) | (RentCollection.masjid_id == None)).all()
    raw_collected = sum(c.amount for c in collections if c.amount)

    pending_tenants_count = 0
    completed_tenants_count = 0
    total_pending_rent = 0.0
    total_completed_rent = 0.0

    for t in tenants:
        active_inv = get_or_generate_tenant_invoice(db, t, masjid_id)
        latest_paid_inv = db.query(RentInvoice).filter(
            (RentInvoice.masjid_id == masjid_id) | (RentInvoice.masjid_id == None),
            RentInvoice.tenant_id == t.id,
            RentInvoice.status == "Paid"
        ).order_by(RentInvoice.id.desc()).first()

        if latest_paid_inv:
            completed_tenants_count += 1
            amt = latest_paid_inv.amount_paid or t.monthly_rent or 0.0
            total_completed_rent += amt
        else:
            pending_tenants_count += 1
            rem = max(0.0, (active_inv.total_amount if active_inv else (t.monthly_rent or 0.0)) - (active_inv.amount_paid if active_inv else 0.0))
            total_pending_rent += rem

    total_collected = max(raw_collected, total_completed_rent)
    total_properties = db.query(Property).filter(Property.masjid_id == masjid_id).count()

    return {
        "total_properties": total_properties,
        "total_collected": total_collected,
        "total_received": total_collected,
        "total_pending": total_pending_rent,
        "total_completed": total_completed_rent,
        "pending_count": pending_tenants_count,
        "completed_count": completed_tenants_count,
        "total_tenants": len(tenants),
        "pending_collections": pending_tenants_count
    }


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





@router.get("/tenants/{tenant_id}/history")
def get_tenant_history(
    tenant_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.masjid_id == masjid_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    collections = db.query(RentCollection).filter(
        RentCollection.masjid_id == masjid_id,
        (RentCollection.tenant_id == tenant.id) | (RentCollection.tenant_name == tenant.name)
    ).order_by(RentCollection.id.desc()).all()

    return {
        "tenant_id": tenant.id,
        "tenant_name": tenant.name,
        "history": collections
    }



@router.post("/tenants/list", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_in: TenantCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Add a new tenant and update assigned property/unit status."""
    tenant_data = tenant_in.dict()

    # Filter strictly to valid columns of Tenant model to prevent unexpected argument errors
    tenant_column_keys = set(Tenant.__table__.columns.keys())
    filtered_data = {k: v for k, v in tenant_data.items() if k in tenant_column_keys and k != 'id'}

    # Generate guaranteed unique tenant_code
    if not filtered_data.get("tenant_code"):
        base_count = db.query(Tenant).count() + 1
        code = f"TEN-{base_count:04d}"
        while db.query(Tenant).filter(Tenant.tenant_code == code).first():
            base_count += 1
            code = f"TEN-{base_count:04d}"
        filtered_data["tenant_code"] = code

    # Validate property_id if provided
    prop_name = None
    if filtered_data.get("property_id"):
        prop = db.query(Property).filter(Property.id == filtered_data["property_id"]).first()
        if not prop:
            filtered_data["property_id"] = None
        else:
            prop_name = prop.property_name

    db_tenant = Tenant(**filtered_data, masjid_id=masjid_id)
    db.add(db_tenant)

    # Update associated Property & PropertyUnit if assigned
    if filtered_data.get("property_id") and prop_name:
        prop = db.query(Property).filter(Property.id == filtered_data["property_id"]).first()
        if prop:
            prop.current_tenant = db_tenant.name
            if db_tenant.monthly_rent:
                prop.monthly_rent = db_tenant.monthly_rent
            if db_tenant.security_deposit:
                prop.deposit_amount = db_tenant.security_deposit

            if db_tenant.assigned_shop:
                unit = db.query(PropertyUnit).filter(
                    PropertyUnit.property_id == prop.id,
                    PropertyUnit.unit_no == db_tenant.assigned_shop
                ).first()
                if unit:
                    unit.availability = "Occupied"
                    unit.tenant_name = db_tenant.name
                    if db_tenant.monthly_rent:
                        unit.rent_amount = db_tenant.monthly_rent

    db.commit()
    db.refresh(db_tenant)

    # Auto-generate initial RentInvoice so tenant is ready for Rent Collection
    try:
        get_or_generate_tenant_invoice(db, db_tenant, masjid_id)
    except Exception as inv_err:
        db.rollback()
        print("Auto-generate initial tenant invoice warning:", inv_err)

    res = TenantResponse.from_orm(db_tenant)
    res.property_name = prop_name
    return res


def generate_next_invoice_no(db: Session, year: int) -> str:
    """
    Generate a guaranteed unique invoice number in format 'RENT-YYYY-XXX' across PostgreSQL.
    """
    all_invoices = db.query(RentInvoice.invoice_no).all()
    max_num = 0
    for (inv_code,) in all_invoices:
        if inv_code:
            match = re.search(r'RENT-\d+-(\d+)', inv_code, re.IGNORECASE)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num

    total_count = db.query(RentInvoice).count()
    next_num = max(max_num + 1, total_count + 1)

    candidate = f"RENT-{year}-{next_num:03d}"
    while db.query(RentInvoice).filter(RentInvoice.invoice_no == candidate).first() is not None:
        next_num += 1
        candidate = f"RENT-{year}-{next_num:03d}"

    return candidate


def generate_next_receipt_no(db: Session) -> str:
    """
    Generate a guaranteed unique receipt number in format 'RCPT-XXXX' across PostgreSQL.
    """
    all_collections = db.query(RentCollection.receipt_no).all()
    max_num = 0
    for (rcpt_code,) in all_collections:
        if rcpt_code:
            match = re.search(r'RCPT-(?:2026-)?(\d+)', rcpt_code, re.IGNORECASE)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num

    total_count = db.query(RentCollection).count()
    next_num = max(max_num + 1, total_count + 1, 1001)

    candidate = f"RCPT-{next_num:04d}"
    while db.query(RentCollection).filter(RentCollection.receipt_no == candidate).first() is not None:
        next_num += 1
        candidate = f"RCPT-{next_num:04d}"

    return candidate


# Helper to get or generate current invoice for a tenant
def get_or_generate_tenant_invoice(db: Session, tenant: Tenant, masjid_id: int):
    # Find latest paid invoice for tenant
    latest_paid = db.query(RentInvoice).filter(
        RentInvoice.masjid_id == masjid_id,
        RentInvoice.tenant_id == tenant.id,
        RentInvoice.status == "Paid"
    ).order_by(RentInvoice.id.desc()).first()

    # Find existing active pending/overdue invoice for tenant
    invoice = db.query(RentInvoice).filter(
        RentInvoice.masjid_id == masjid_id,
        RentInvoice.tenant_id == tenant.id,
        RentInvoice.status.in_(["Pending", "Overdue", "Partial", "Upcoming"])
    ).order_by(RentInvoice.id.desc()).first()

    # If there is a paid invoice, ensure any pending invoice is for a SUBSEQUENT month
    if latest_paid and invoice:
        paid_dt = parse_month_year(latest_paid.for_month)
        inv_dt = parse_month_year(invoice.for_month)
        if inv_dt <= paid_dt:
            next_month_str = get_next_month_str(latest_paid.for_month)
            dt_next = parse_month_year(next_month_str)
            invoice.for_month = next_month_str
            invoice.invoice_date = dt_next.strftime("01 %b %Y")
            
            due_day_digits = "".join(filter(str.isdigit, str(tenant.due_day or "5"))) or "5"
            due_day_int = min(max(int(due_day_digits), 1), 28)
            due_date_dt = datetime(dt_next.year, dt_next.month, due_day_int)
            invoice.due_date = due_date_dt.strftime(f"{due_day_int:02d} %b %Y")
            invoice.status = "Pending"
            invoice.amount_paid = 0.0
            db.commit()
            db.refresh(invoice)

    if not invoice:
        now = datetime.now()
        if latest_paid and latest_paid.for_month:
            month_name = get_next_month_str(latest_paid.for_month)
            dt_month = parse_month_year(month_name)
        else:
            last_inv = db.query(RentInvoice).filter(
                RentInvoice.masjid_id == masjid_id,
                RentInvoice.tenant_id == tenant.id
            ).order_by(RentInvoice.id.desc()).first()
            if last_inv and last_inv.for_month:
                month_name = get_next_month_str(last_inv.for_month)
                dt_month = parse_month_year(month_name)
            else:
                month_name = now.strftime("%B %Y")
                dt_month = now.replace(day=1)
                if tenant.agreement_start:
                    try:
                        dt = datetime.strptime(tenant.agreement_start.strip(), "%Y-%m-%d")
                        month_name = dt.strftime("%B %Y")
                        dt_month = dt.replace(day=1)
                    except Exception:
                        pass

        inv_no = generate_next_invoice_no(db, dt_month.year)
        prop_name = tenant.property.property_name if tenant.property else "Commercial Complex"
        inv_date = dt_month.strftime("01 %b %Y")

        due_day_digits = "".join(filter(str.isdigit, str(tenant.due_day or "5"))) or "5"
        due_day_int = min(max(int(due_day_digits), 1), 28)
        due_date_dt = datetime(dt_month.year, dt_month.month, due_day_int)
        due_date = due_date_dt.strftime(f"{due_day_int:02d} %b %Y")

        init_status = "Pending"
        if now.date() > due_date_dt.date():
            init_status = "Overdue"

        try:
            invoice = RentInvoice(
                masjid_id=masjid_id,
                invoice_no=inv_no,
                tenant_id=tenant.id,
                tenant_name=tenant.name,
                property_name=prop_name,
                assigned_shop=tenant.assigned_shop or "Unit 01",
                for_month=month_name,
                invoice_date=inv_date,
                due_date=due_date,
                rent_amount=tenant.monthly_rent or 0.0,
                late_fee=0.0,
                other_charges=0.0,
                total_amount=tenant.monthly_rent or 0.0,
                amount_paid=0.0,
                status=init_status
            )
            db.add(invoice)
            db.commit()
            db.refresh(invoice)
        except Exception as inv_gen_err:
            db.rollback()
            raise inv_gen_err

    return invoice








@router.get("/tenants/{tenant_id}/detail")
def get_tenant_rent_detail(
    tenant_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.masjid_id == masjid_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    prop = tenant.property
    prop_name = prop.property_name if prop else "Commercial Complex"

    # Get active invoice
    active_invoice = get_or_generate_tenant_invoice(db, tenant, masjid_id)

    # Get collection history
    collections = db.query(RentCollection).filter(
        RentCollection.masjid_id == masjid_id,
        (RentCollection.tenant_id == tenant.id) | (RentCollection.tenant_name == tenant.name)
    ).order_by(RentCollection.id.desc()).all()

    # Get all invoices
    invoices = db.query(RentInvoice).filter(
        RentInvoice.masjid_id == masjid_id,
        (RentInvoice.tenant_id == tenant.id) | (RentInvoice.tenant_name == tenant.name)
    ).order_by(RentInvoice.id.desc()).all()

    # Calculate summary / balance
    total_received = sum(c.amount for c in collections)
    rent_rate = tenant.monthly_rent or 0.0
    total_rent_till_date = sum(inv.total_amount for inv in invoices) if invoices else rent_rate
    pending_amount = max(0.0, active_invoice.total_amount - (active_invoice.amount_paid or 0.0)) if active_invoice.status != "Paid" else 0.0
    
    last_col = collections[0] if collections else None
    last_payment = f"{last_col.payment_date} (₹{last_col.amount:,.0f})" if last_col else "N/A"
    
    return {
        "tenant": {
            "id": tenant.id,
            "tenant_code": tenant.tenant_code,
            "name": tenant.name,
            "phone": tenant.phone or "N/A",
            "email": tenant.email or "N/A",
            "property_name": prop_name,
            "assigned_shop": tenant.assigned_shop or "N/A",
            "monthly_rent": tenant.monthly_rent or 0.0,
            "security_deposit": tenant.security_deposit or 0.0,
            "rent_type": "Monthly",
            "due_date": f"{tenant.due_day or '5'}th of every month",
            "due_day": tenant.due_day or "5",
            "lease_period": f"{tenant.agreement_start or '01 Apr 2026'} - {tenant.agreement_end or '31 Mar 2027'}",
            "status": tenant.status or "Active"
        },
        "summary": {
            "total_rent_till_date": total_rent_till_date,
            "total_received": total_received,
            "pending_amount": pending_amount,
            "next_due_date": active_invoice.due_date,
            "last_payment": last_payment
        },
        "active_invoice": {
            "id": active_invoice.id,
            "invoice_no": active_invoice.invoice_no,
            "for_month": active_invoice.for_month,
            "invoice_date": active_invoice.invoice_date,
            "due_date": active_invoice.due_date,
            "rent_amount": active_invoice.rent_amount,
            "late_fee": active_invoice.late_fee,
            "other_charges": active_invoice.other_charges,
            "total_amount": active_invoice.total_amount,
            "amount_paid": active_invoice.amount_paid,
            "status": active_invoice.status
        },
        "invoices": [
            {
                "id": inv.id,
                "invoice_no": inv.invoice_no,
                "for_month": inv.for_month,
                "invoice_date": inv.invoice_date,
                "due_date": inv.due_date,
                "total_amount": inv.total_amount,
                "amount_paid": inv.amount_paid,
                "status": inv.status
            } for inv in invoices
        ],
        "history": [
            {
                "id": col.id,
                "receipt_no": col.receipt_no,
                "invoice_no": col.invoice_no or active_invoice.invoice_no,
                "month_year": col.month_year or active_invoice.for_month,
                "payment_date": col.payment_date,
                "amount": col.amount,
                "payment_mode": col.payment_mode,
                "reference_no": col.reference_no,
                "notes": col.notes,
                "status": col.status
            } for col in collections
        ]
    }


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
        col_in.receipt_no = generate_next_receipt_no(db)

    db_col = RentCollection(**col_in.dict(), masjid_id=masjid_id)
    db.add(db_col)
    db.commit()
    db.refresh(db_col)
    return db_col


@router.post("/collections/confirm-payment")
def confirm_rent_payment(
    req: ConfirmPaymentRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)

    tenant = db.query(Tenant).filter(Tenant.id == req.tenant_id, Tenant.masjid_id == masjid_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    invoice = None
    if req.invoice_id:
        invoice = db.query(RentInvoice).filter(RentInvoice.id == req.invoice_id, RentInvoice.masjid_id == masjid_id).first()

    if not invoice:
        invoice = get_or_generate_tenant_invoice(db, tenant, masjid_id)

    # Prevent duplicate payment on fully paid invoice
    if invoice.status == "Paid" and (invoice.amount_paid or 0.0) >= invoice.total_amount:
        # Check if there is a next invoice available
        next_invoice = get_or_generate_tenant_invoice(db, tenant, masjid_id)
        if next_invoice and next_invoice.id != invoice.id:
            invoice = next_invoice
        else:
            raise HTTPException(status_code=400, detail="This invoice has already been fully paid.")

    # Generate receipt number
    receipt_no = generate_next_receipt_no(db)

    # Create RentCollection record
    db_col = RentCollection(
        masjid_id=masjid_id,
        receipt_no=receipt_no,
        invoice_id=invoice.id,
        invoice_no=invoice.invoice_no,
        tenant_id=tenant.id,
        tenant_name=tenant.name,
        shop=tenant.assigned_shop or "Shop",
        month_year=invoice.for_month,
        amount=req.amount_received,
        payment_date=req.payment_date,
        payment_mode=req.payment_method,
        reference_no=req.reference_no,
        notes=req.notes,
        send_sms=req.send_sms,
        send_whatsapp=req.send_whatsapp,
        status="Paid"
    )
    db.add(db_col)

    # Update Invoice status
    invoice.amount_paid = (invoice.amount_paid or 0.0) + req.amount_received
    if invoice.amount_paid >= invoice.total_amount:
        invoice.status = "Paid"
    else:
        invoice.status = "Partial"

    db.commit()
    db.refresh(db_col)
    db.refresh(invoice)

    # Automatically generate / prepare the next month's invoice if current invoice is fully paid
    next_inv = None
    if invoice.status == "Paid":
        next_inv = get_or_generate_tenant_invoice(db, tenant, masjid_id)

    return {
        "success": True,
        "message": f"Payment recorded successfully for {invoice.for_month}!",
        "receipt_no": db_col.receipt_no,
        "collection_id": db_col.id,
        "invoice_status": invoice.status,
        "paid_month": invoice.for_month,
        "next_due_month": next_inv.for_month if next_inv else None
    }




# ----------------------------------------------------
# HALL BOOKINGS ENDPOINTS
# ----------------------------------------------------
@router.get("/hall-bookings/list", response_model=List[HallBookingResponse])
def get_hall_bookings(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Fetch all hall bookings with tenant isolation."""
    return db.query(HallBooking).filter(
        (HallBooking.masjid_id == masjid_id) | (HallBooking.masjid_id == None)
    ).order_by(HallBooking.id.desc()).all()


@router.post("/hall-bookings/list", response_model=HallBookingResponse, status_code=status.HTTP_201_CREATED)
def create_hall_booking(
    hb_in: HallBookingCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Create a hall booking based on reference form fields."""
    count = db.query(HallBooking).filter(
        (HallBooking.masjid_id == masjid_id) | (HallBooking.masjid_id == None)
    ).count()

    year_suffix = datetime.now().strftime("%y")
    default_booking_id = f"HLB-{year_suffix}-{count + 1:02d}"
    booking_id_str = hb_in.booking_id if (hb_in.booking_id and hb_in.booking_id.strip() and not hb_in.booking_id.startswith("HB-")) else default_booking_id
    booking_no_str = default_booking_id

    hall_charge = float(hb_in.hall_charge or 0.0)
    cleaning_charge = float(hb_in.cleaning_charge or 0.0)
    other_charge = float(hb_in.other_charge or 0.0)
    advance_paid = float(hb_in.advance_paid or 0.0)

    total_charge = hall_charge + cleaning_charge + other_charge
    if total_charge == 0.0 and hb_in.total_fee:
        total_charge = float(hb_in.total_fee)

    balance = max(0.0, total_charge - advance_paid)
    person_name = hb_in.booking_person or hb_in.applicant or "Guest"

    db_hb = HallBooking(
        masjid_id=masjid_id,
        booking_id=booking_id_str,
        booking_no=booking_no_str,
        hall_name=hb_in.hall_name or "Marriage Hall",
        booking_for=hb_in.booking_for or "Family",
        booking_person=person_name,
        applicant=person_name,
        contact_number=hb_in.contact_number,
        booking_date=hb_in.booking_date,
        start_time=hb_in.start_time,
        end_time=hb_in.end_time,
        time_slot=f"{hb_in.start_time or ''} - {hb_in.end_time or ''}".strip(" -"),
        function_type=hb_in.function_type or hb_in.event or "Marriage",
        event=hb_in.function_type or hb_in.event or "Marriage",
        status=hb_in.status or "Confirmed",
        hall_charge=hall_charge,
        cleaning_charge=cleaning_charge,
        other_charge=other_charge,
        total_charge=total_charge,
        total_fee=total_charge,
        advance_paid=advance_paid,
        balance=balance,
        needs_cooking_vessels=bool(hb_in.needs_cooking_vessels),
        notes=hb_in.notes,
        document_url=hb_in.document_url,
        family_id=hb_in.family_id,
        family_member_id=hb_in.family_member_id,
        family_name=hb_in.family_name,
        member_name=hb_in.member_name
    )
    db.add(db_hb)
    db.commit()
    db.refresh(db_hb)
    return db_hb


@router.get("/hall-bookings/{booking_id}", response_model=HallBookingResponse)
def get_hall_booking_detail(
    booking_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    booking = db.query(HallBooking).filter(
        HallBooking.id == booking_id,
        (HallBooking.masjid_id == masjid_id) | (HallBooking.masjid_id == None)
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Hall booking record not found.")
    return booking


@router.put("/hall-bookings/{booking_id}", response_model=HallBookingResponse)
def update_hall_booking(
    booking_id: int,
    hb_in: HallBookingUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    booking = db.query(HallBooking).filter(
        HallBooking.id == booking_id,
        (HallBooking.masjid_id == masjid_id) | (HallBooking.masjid_id == None)
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Hall booking record not found.")

    update_data = hb_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(booking, field, val)

    hall_charge = float(booking.hall_charge or 0.0)
    cleaning_charge = float(booking.cleaning_charge or 0.0)
    other_charge = float(booking.other_charge or 0.0)
    advance_paid = float(booking.advance_paid or 0.0)
    booking.total_charge = hall_charge + cleaning_charge + other_charge
    booking.total_fee = booking.total_charge
    booking.balance = max(0.0, booking.total_charge - advance_paid)

    if booking.booking_person:
        booking.applicant = booking.booking_person
    if booking.function_type:
        booking.event = booking.function_type

    db.commit()
    db.refresh(booking)
    return booking


@router.patch("/hall-bookings/{booking_id}/status", response_model=HallBookingResponse)
def update_hall_booking_status(
    booking_id: int,
    status_str: str = Query(..., alias="status"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    booking = db.query(HallBooking).filter(
        HallBooking.id == booking_id,
        (HallBooking.masjid_id == masjid_id) | (HallBooking.masjid_id == None)
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Hall booking record not found.")

    booking.status = status_str
    db.commit()
    db.refresh(booking)
    return booking


@router.delete("/hall-bookings/{booking_id}")
def delete_hall_booking(
    booking_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    booking = db.query(HallBooking).filter(
        HallBooking.id == booking_id,
        (HallBooking.masjid_id == masjid_id) | (HallBooking.masjid_id == None)
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Hall booking record not found.")

    db.delete(booking)
    db.commit()
    return {"message": f"Hall booking #{booking_id} deleted successfully."}



# ----------------------------------------------------
# VESSEL CATEGORY ENDPOINTS
# ----------------------------------------------------
@router.get("/vessel-categories/list", response_model=List[VesselCategoryResponse])
def get_vessel_categories(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    categories = db.query(VesselCategory).filter(
        (VesselCategory.masjid_id == masjid_id) | (VesselCategory.masjid_id == None)
    ).order_by(VesselCategory.id.asc()).all()

    result = []
    for cat in categories:
        vessel_count = db.query(CookingVessel).filter(CookingVessel.category_id == cat.id).count()
        cat_dict = {
            "id": cat.id,
            "category_id": cat.category_id or f"CAT-{cat.id:03d}",
            "category_name": cat.category_name,
            "description": cat.description or "",
            "status": cat.status or "Active",
            "vessels_count": vessel_count,
            "created_at": cat.created_at
        }
        result.append(cat_dict)
    return result


@router.post("/vessel-categories/list", response_model=VesselCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_vessel_category(
    cat_in: VesselCategoryCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    existing = db.query(VesselCategory).filter(
        (VesselCategory.masjid_id == masjid_id) | (VesselCategory.masjid_id == None),
        VesselCategory.category_name.ilike(cat_in.category_name.strip())
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A category named '{cat_in.category_name}' already exists."
        )

    count = db.query(VesselCategory).filter(
        (VesselCategory.masjid_id == masjid_id) | (VesselCategory.masjid_id == None)
    ).count()
    generated_id = cat_in.category_id or f"CAT-{count + 1:03d}"

    db_cat = VesselCategory(
        masjid_id=masjid_id,
        category_id=generated_id,
        category_name=cat_in.category_name.strip(),
        description=cat_in.description,
        status=cat_in.status or "Active"
    )
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return {
        "id": db_cat.id,
        "category_id": db_cat.category_id,
        "category_name": db_cat.category_name,
        "description": db_cat.description or "",
        "status": db_cat.status,
        "vessels_count": 0,
        "created_at": db_cat.created_at
    }


@router.get("/vessel-categories/{cat_id}", response_model=VesselCategoryResponse)
def get_vessel_category_detail(
    cat_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    cat = db.query(VesselCategory).filter(
        VesselCategory.id == cat_id,
        (VesselCategory.masjid_id == masjid_id) | (VesselCategory.masjid_id == None)
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
    
    vessel_count = db.query(CookingVessel).filter(CookingVessel.category_id == cat.id).count()
    return {
        "id": cat.id,
        "category_id": cat.category_id or f"CAT-{cat.id:03d}",
        "category_name": cat.category_name,
        "description": cat.description or "",
        "status": cat.status or "Active",
        "vessels_count": vessel_count,
        "created_at": cat.created_at
    }


@router.put("/vessel-categories/{cat_id}", response_model=VesselCategoryResponse)
def update_vessel_category(
    cat_id: int,
    cat_in: VesselCategoryUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    cat = db.query(VesselCategory).filter(
        VesselCategory.id == cat_id,
        (VesselCategory.masjid_id == masjid_id) | (VesselCategory.masjid_id == None)
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    if cat_in.category_name:
        cat.category_name = cat_in.category_name.strip()
    if cat_in.description is not None:
        cat.description = cat_in.description
    if cat_in.status:
        cat.status = cat_in.status

    db.commit()
    db.refresh(cat)

    # Sync category_name in linked vessels
    db.query(CookingVessel).filter(CookingVessel.category_id == cat.id).update(
        {CookingVessel.category_name: cat.category_name}, synchronize_session=False
    )
    db.commit()

    vessel_count = db.query(CookingVessel).filter(CookingVessel.category_id == cat.id).count()
    return {
        "id": cat.id,
        "category_id": cat.category_id or f"CAT-{cat.id:03d}",
        "category_name": cat.category_name,
        "description": cat.description or "",
        "status": cat.status or "Active",
        "vessels_count": vessel_count,
        "created_at": cat.created_at
    }


@router.delete("/vessel-categories/{cat_id}")
def delete_vessel_category(
    cat_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    cat = db.query(VesselCategory).filter(
        VesselCategory.id == cat_id,
        (VesselCategory.masjid_id == masjid_id) | (VesselCategory.masjid_id == None)
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    linked_vessels_count = db.query(CookingVessel).filter(CookingVessel.category_id == cat.id).count()
    if linked_vessels_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category '{cat.category_name}' because {linked_vessels_count} vessel(s) are assigned to it. Please reassign or delete those vessels first."
        )

    db.delete(cat)
    db.commit()
    return {"message": f"Category '{cat.category_name}' deleted successfully."}


# ----------------------------------------------------
# COOKING VESSELS ENDPOINTS
# ----------------------------------------------------
@router.get("/vessels/list", response_model=List[CookingVesselResponse])
def get_cooking_vessels(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    vessels = db.query(CookingVessel).filter(
        (CookingVessel.masjid_id == masjid_id) | (CookingVessel.masjid_id == None)
    ).order_by(CookingVessel.id.desc()).all()

    # Enhance category_name from joined category relationship if available
    for v in vessels:
        if v.category_rel and v.category_rel.category_name:
            v.category_name = v.category_rel.category_name
        if not v.item_name:
            v.item_name = v.vessel_name
        if not v.rental_rate_per_day and v.rental_amount:
            v.rental_rate_per_day = v.rental_amount
        if not v.quantity and v.total_quantity:
            v.quantity = v.total_quantity
        if not v.available and v.available_quantity is not None:
            v.available = v.available_quantity
    return vessels


@router.post("/vessels/list", response_model=CookingVesselResponse, status_code=status.HTTP_201_CREATED)
def create_cooking_vessel(
    cv_in: CookingVesselCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    
    all_vessels = db.query(CookingVessel).all()
    max_vsl_num = 0
    max_ves_num = 0
    for v in all_vessels:
        if v.vessel_id and v.vessel_id.startswith("VSL-"):
            try:
                n = int(v.vessel_id.replace("VSL-", ""))
                if n > max_vsl_num:
                    max_vsl_num = n
            except ValueError:
                pass
        if v.vessel_code and v.vessel_code.startswith("VES-"):
            try:
                n = int(v.vessel_code.replace("VES-", ""))
                if n > max_ves_num:
                    max_ves_num = n
            except ValueError:
                pass

    v_id = cv_in.vessel_id or f"VSL-{max_vsl_num + 1:03d}"
    v_code = cv_in.vessel_code or f"VES-{max_ves_num + 1:03d}"
    v_name = cv_in.vessel_name or cv_in.item_name or "Cooking Vessel"


    cat_name = cv_in.category_name
    if cv_in.category_id:
        category = db.query(VesselCategory).filter(VesselCategory.id == cv_in.category_id).first()
        if category:
            cat_name = category.category_name

    tot_qty = cv_in.total_quantity if cv_in.total_quantity is not None else (cv_in.quantity or 1)
    avail_qty = cv_in.available_quantity if cv_in.available_quantity is not None else tot_qty
    rent_amt = cv_in.rental_amount if cv_in.rental_amount is not None else (cv_in.rental_rate_per_day or 0.0)

    db_cv = CookingVessel(
        masjid_id=masjid_id,
        vessel_id=v_id,
        vessel_code=v_code,
        vessel_name=v_name,
        item_name=v_name,
        category_id=cv_in.category_id,
        category_name=cat_name or "Cooking Pots",
        capacity=cv_in.capacity,
        total_quantity=tot_qty,
        quantity=tot_qty,
        available_quantity=avail_qty,
        available=avail_qty,
        condition=cv_in.condition or "Good",
        available_for_rent=bool(cv_in.available_for_rent),
        rental_amount=rent_amt,
        rental_rate_per_day=rent_amt,
        rental_unit=cv_in.rental_unit or "Per Day",
        status=cv_in.status or "Available",
        notes=cv_in.notes,
        document_url=cv_in.document_url
    )
    db.add(db_cv)
    db.commit()
    db.refresh(db_cv)
    return db_cv


@router.get("/vessels/{vessel_id}", response_model=CookingVesselResponse)
def get_cooking_vessel_detail(
    vessel_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    vessel = db.query(CookingVessel).filter(
        CookingVessel.id == vessel_id,
        (CookingVessel.masjid_id == masjid_id) | (CookingVessel.masjid_id == None)
    ).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Cooking vessel not found.")
    return vessel


@router.put("/vessels/{vessel_id}", response_model=CookingVesselResponse)
def update_cooking_vessel(
    vessel_id: int,
    cv_in: CookingVesselUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    vessel = db.query(CookingVessel).filter(
        CookingVessel.id == vessel_id,
        (CookingVessel.masjid_id == masjid_id) | (CookingVessel.masjid_id == None)
    ).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Cooking vessel not found.")

    update_data = cv_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(vessel, field, val)

    if cv_in.vessel_name:
        vessel.item_name = cv_in.vessel_name
    if cv_in.total_quantity is not None:
        vessel.quantity = cv_in.total_quantity
        if cv_in.available_quantity is None:
            vessel.available_quantity = cv_in.total_quantity
            vessel.available = cv_in.total_quantity
    if cv_in.available_quantity is not None:
        vessel.available = cv_in.available_quantity
    if cv_in.rental_amount is not None:
        vessel.rental_rate_per_day = cv_in.rental_amount

    if cv_in.category_id:
        category = db.query(VesselCategory).filter(VesselCategory.id == cv_in.category_id).first()
        if category:
            vessel.category_name = category.category_name

    db.commit()
    db.refresh(vessel)
    return vessel


@router.patch("/vessels/{vessel_id}/status", response_model=CookingVesselResponse)
def update_cooking_vessel_status(
    vessel_id: int,
    status_str: str = Query(..., alias="status"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    vessel = db.query(CookingVessel).filter(
        CookingVessel.id == vessel_id,
        (CookingVessel.masjid_id == masjid_id) | (CookingVessel.masjid_id == None)
    ).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Cooking vessel not found.")

    vessel.status = status_str
    db.commit()
    db.refresh(vessel)
    return vessel


@router.delete("/vessels/{vessel_id}")
def delete_cooking_vessel(
    vessel_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    vessel = db.query(CookingVessel).filter(
        CookingVessel.id == vessel_id,
        (CookingVessel.masjid_id == masjid_id) | (CookingVessel.masjid_id == None)
    ).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Cooking vessel not found.")

    db.delete(vessel)
    db.commit()
    return {"message": f"Cooking vessel '{vessel.vessel_name}' deleted successfully."}



# ----------------------------------------------------
# PROPERTY DOCUMENTS ENDPOINTS
# ----------------------------------------------------
@router.get("/documents/list", response_model=List[PropertyDocumentResponse])
def get_property_documents(
    category: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    
    # Auto-seed initial sample documents if database is empty for this masjid
    existing_count = db.query(PropertyDocument).filter(PropertyDocument.masjid_id == masjid_id).count()
    if existing_count == 0:
        sample_docs = [
            # 1. Property Creation Documents
            PropertyDocument(
                masjid_id=masjid_id,
                doc_id="DOC-01",
                title="Title Deed & Land Ownership Certificate",
                category="Property Documents",
                associated_property="Commercial Complex - Main St",
                upload_date="2026-01-15",
                file_type="PDF Document",
                file_size="3.2 MB"
            ),
            PropertyDocument(
                masjid_id=masjid_id,
                doc_id="DOC-02",
                title="Municipal Building Approval & Blueprint",
                category="Property Documents",
                associated_property="Commercial Complex - Main St",
                upload_date="2026-01-20",
                file_type="PDF Document",
                file_size="4.5 MB"
            ),
            # 2. Tenant Creation Documents
            PropertyDocument(
                masjid_id=masjid_id,
                doc_id="DOC-03",
                title="Tenant Government ID & Aadhar Proof",
                category="Tenant Documents",
                associated_property="Commercial Complex (Shop 101)",
                associated_tenant="Bismillah Traders",
                upload_date="2026-02-01",
                file_type="JPG Image",
                file_size="1.4 MB"
            ),
            PropertyDocument(
                masjid_id=masjid_id,
                doc_id="DOC-04",
                title="GST Registration & Business License Proof",
                category="Tenant Documents",
                associated_property="Commercial Complex (Shop 102)",
                associated_tenant="Al-Rahman Enterprise",
                upload_date="2026-02-10",
                file_type="PDF Document",
                file_size="1.8 MB"
            ),
            # 3. Rental Agreement Documents
            PropertyDocument(
                masjid_id=masjid_id,
                doc_id="DOC-05",
                title="Commercial Lease Agreement Deed (2025-2027)",
                category="Rental Agreement Documents",
                associated_property="Commercial Complex (Shop 101)",
                associated_tenant="Bismillah Traders",
                upload_date="2026-02-01",
                file_type="PDF Document",
                file_size="2.8 MB"
            ),
            PropertyDocument(
                masjid_id=masjid_id,
                doc_id="DOC-06",
                title="Tenancy Agreement Renewal & Deposit Receipt",
                category="Rental Agreement Documents",
                associated_property="Commercial Complex (Shop 102)",
                associated_tenant="Al-Rahman Enterprise",
                upload_date="2026-02-10",
                file_type="PDF Document",
                file_size="2.1 MB"
            ),
            # 4. Rent Collection Documents
            PropertyDocument(
                masjid_id=masjid_id,
                doc_id="DOC-07",
                title="Rent Payment Receipt #RC-2026-081",
                category="Rent Collection Documents",
                associated_property="Commercial Complex (Shop 101)",
                associated_tenant="Bismillah Traders",
                upload_date="2026-08-05",
                file_type="PDF Receipt",
                file_size="420 KB"
            ),
            PropertyDocument(
                masjid_id=masjid_id,
                doc_id="DOC-08",
                title="Bank Monthly Santha & Rent Deposit Slip",
                category="Rent Collection Documents",
                associated_property="Commercial Complex (Shop 102)",
                associated_tenant="Al-Rahman Enterprise",
                upload_date="2026-08-06",
                file_type="PNG Image",
                file_size="780 KB"
            ),
        ]
        db.add_all(sample_docs)
        db.commit()

    query = db.query(PropertyDocument).filter(PropertyDocument.masjid_id == masjid_id)
    if category:
        query = query.filter(PropertyDocument.category == category)
    
    return query.order_by(PropertyDocument.id.desc()).all()


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


@router.delete("/documents/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property_document(
    id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    doc = db.query(PropertyDocument).filter(PropertyDocument.id == id, PropertyDocument.masjid_id == masjid_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return None


# ----------------------------------------------------
# ASSET MANAGEMENT ENDPOINTS
# ----------------------------------------------------
@router.get("/assets/list", response_model=List[AssetItemResponse])
def get_assets(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    return db.query(AssetItem).filter(AssetItem.masjid_id == masjid_id).order_by(AssetItem.id.desc()).all()


@router.post("/assets/list", response_model=AssetItemResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_in: AssetItemCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    if not asset_in.asset_code or asset_in.asset_code.startswith("AST-"):
        count = db.query(AssetItem).filter(AssetItem.masjid_id == masjid_id).count()
        year_suffix = datetime.now().strftime("%y")
        asset_in.asset_code = f"ASST-{year_suffix}-{count + 1:02d}"

    db_asset = AssetItem(**asset_in.dict(), masjid_id=masjid_id)
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset


@router.delete("/assets/clear-sample", status_code=status.HTTP_200_OK)
def clear_sample_assets(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    db.query(AssetItem).filter(
        AssetItem.masjid_id == masjid_id,
        AssetItem.asset_name.in_([
            "Sound System & Wireless Microphones",
            "Central Air Conditioner 5-Ton Unit",
            "15 KVA Standby Diesel Generator",
            "Persian Velvet Carpet Roll (50m)",
            "Legacy CRT Monitor & Display Unit"
        ])
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "Sample dummy assets removed successfully"}


@router.delete("/assets/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    asset = db.query(AssetItem).filter(AssetItem.id == id, AssetItem.masjid_id == masjid_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(asset)
    db.commit()
    return None


@router.get("/assets/maintenance/list", response_model=List[AssetMaintenanceResponse])
def get_asset_maintenances(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    return db.query(AssetMaintenanceRecord).filter(AssetMaintenanceRecord.masjid_id == masjid_id).order_by(AssetMaintenanceRecord.id.desc()).all()


@router.post("/assets/maintenance/list", response_model=AssetMaintenanceResponse, status_code=status.HTTP_201_CREATED)
def create_asset_maintenance(
    mnt_in: AssetMaintenanceCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    if not mnt_in.maintenance_code:
        count = db.query(AssetMaintenanceRecord).filter(AssetMaintenanceRecord.masjid_id == masjid_id).count()
        mnt_in.maintenance_code = f"MNT-{count + 1:03d}"

    db_mnt = AssetMaintenanceRecord(**mnt_in.dict(), masjid_id=masjid_id)
    db.add(db_mnt)

    # Check related Asset and update status if completion checkbox selected or status Completed
    if mnt_in.asset_id:
        target_asset = db.query(AssetItem).filter(AssetItem.id == mnt_in.asset_id, AssetItem.masjid_id == masjid_id).first()
        if target_asset:
            if mnt_in.completed or mnt_in.status == "Completed":
                target_asset.status = "Good"
                target_asset.condition = "Good"
                if mnt_in.next_due_date:
                    target_asset.next_maintenance = mnt_in.next_due_date
            elif mnt_in.status in ["In Progress", "Scheduled"]:
                target_asset.status = "Needs Service"

    db.commit()
    db.refresh(db_mnt)
    return db_mnt


@router.get("/assets/maintenance/{id}", response_model=AssetMaintenanceResponse)
def get_asset_maintenance_detail(
    id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    rec = db.query(AssetMaintenanceRecord).filter(AssetMaintenanceRecord.id == id, AssetMaintenanceRecord.masjid_id == masjid_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return rec


@router.put("/assets/maintenance/{id}", response_model=AssetMaintenanceResponse)
def update_asset_maintenance(
    id: int,
    mnt_in: AssetMaintenanceUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    rec = db.query(AssetMaintenanceRecord).filter(AssetMaintenanceRecord.id == id, AssetMaintenanceRecord.masjid_id == masjid_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Maintenance record not found")

    update_data = mnt_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rec, field, value)

    # Update related asset status if completed
    if rec.asset_id:
        target_asset = db.query(AssetItem).filter(AssetItem.id == rec.asset_id, AssetItem.masjid_id == masjid_id).first()
        if target_asset:
            if rec.completed or rec.status == "Completed":
                target_asset.status = "Good"
                target_asset.condition = "Good"
                if rec.next_due_date:
                    target_asset.next_maintenance = rec.next_due_date
            elif rec.status in ["In Progress", "Scheduled"]:
                target_asset.status = "Needs Service"

    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/assets/maintenance/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset_maintenance(
    id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    rec = db.query(AssetMaintenanceRecord).filter(AssetMaintenanceRecord.id == id, AssetMaintenanceRecord.masjid_id == masjid_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Maintenance record not found")

    db.delete(rec)
    db.commit()
    return None


@router.get("/assets/disposals/list", response_model=List[AssetDisposalResponse])
def get_asset_disposals(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    return db.query(AssetDisposalRecord).filter(AssetDisposalRecord.masjid_id == masjid_id).order_by(AssetDisposalRecord.id.desc()).all()


@router.post("/assets/dispose", response_model=AssetDisposalResponse, status_code=status.HTTP_201_CREATED)
def create_asset_disposal(
    disp_in: AssetDisposalCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)

    # 1. Validate target asset if asset_id is provided
    target_asset = None
    if disp_in.asset_id:
        target_asset = db.query(AssetItem).filter(AssetItem.id == disp_in.asset_id, AssetItem.masjid_id == masjid_id).first()
    elif disp_in.asset_code:
        target_asset = db.query(AssetItem).filter(AssetItem.asset_code == disp_in.asset_code, AssetItem.masjid_id == masjid_id).first()

    if target_asset and target_asset.status == "Disposed":
        raise HTTPException(status_code=400, detail="This asset has already been disposed.")

    # 2. Auto-generate disposal_no if missing
    if not disp_in.disposal_no or disp_in.disposal_no.startswith("DISP-"):
        count = db.query(AssetDisposalRecord).filter(AssetDisposalRecord.masjid_id == masjid_id).count()
        year_suffix = datetime.now().strftime("%y")
        disp_in.disposal_no = f"DEP-{year_suffix}-{count + 1:02d}"

    # 3. Calculate net_disposal_amount and create disposal record
    disp_data = disp_in.dict()
    disp_data['net_disposal_amount'] = (disp_in.sale_amount or disp_in.scrap_amount or 0.0) - (disp_in.disposal_expenses or 0.0)
    
    db_disp = AssetDisposalRecord(**disp_data, masjid_id=masjid_id, status="Completed")
    db.add(db_disp)

    # 4. Update asset status if target_asset exists
    if target_asset:
        target_asset.status = "Disposed"
        target_asset.condition = "Disposed"
        target_asset.disposal_no = disp_in.disposal_no
        target_asset.disposal_date = disp_in.disposal_date
        target_asset.disposal_reason = disp_in.dispose_reason
        target_asset.disposal_type = disp_in.disposal_type
        target_asset.sale_amount = disp_in.sale_amount or disp_in.scrap_amount or 0.0

    # 5. Income / Accounting Integration
    # If sale disposal with sale_amount > 0 or demolition with recovery treatment == 'Record as Other Income'
    income_amt = 0.0
    if disp_in.disposal_type == "Sale" and (disp_in.sale_amount or 0) > 0:
        income_amt = float(disp_in.sale_amount)
    elif disp_in.disposal_type == "Demolish" and disp_in.recovery_treatment == "Record as Other Income" and (disp_in.scrap_amount or 0) > 0:
        income_amt = float(disp_in.scrap_amount)

    if income_amt > 0:
        # Create Donation / Income record
        donation_count = db.query(Donation).filter(Donation.masjid_id == masjid_id).count()
        rec_no = f"REC-DISP-{donation_count + 1:03d}"
        
        income_rec = Donation(
            masjid_id=masjid_id,
            contributor_type="Other Person",
            receipt_no=rec_no,
            donation_date=disp_in.disposal_date or datetime.utcnow().strftime("%Y-%m-%d"),
            donor_name=disp_in.buyer_name or "Asset Scrap Buyer",
            category="Asset Sale / Disposal",
            other_amount=income_amt,
            amount=income_amt,
            payment_method=disp_in.payment_method or "Cash",
            notes=f"Asset Disposal Income: {disp_in.asset_name} ({disp_in.disposal_no})",
            status="Received"
        )
        db.add(income_rec)

    db.commit()
    db.refresh(db_disp)
    return db_disp
