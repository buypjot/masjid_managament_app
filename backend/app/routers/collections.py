from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.utils.security import get_current_user, get_current_masjid_id
from app.models.collections import SanthaCollection, JumaCollection, Donation
import json
from app.models.community import Family, FamilyHeadChange
from app.schemas.collections import (
    SanthaCollectionCreate,
    SanthaCollectionResponse,
    JumaCollectionCreate,
    JumaCollectionResponse,
    DonationCreate,
    DonationResponse
)

router = APIRouter(prefix="/api/collections", tags=["Collections Management"])

def calculate_family_santha_arrears(
    family: Family, 
    collections: list, 
    as_of_date: Optional[str] = None
) -> dict:
    """
    Sequence: Joining Date → Due Day → Applicable Due Dates → Total Amount Due → Existing Payment History → Total Paid → Outstanding / Remaining Balance
    """
    month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    
    target_dt = datetime.now()
    if as_of_date:
        as_of_str = str(as_of_date).strip()
        try:
            if "T" in as_of_str:
                as_of_str = as_of_str.split("T")[0]
            if "-" in as_of_str:
                parts = as_of_str.split("-")
                target_dt = datetime(int(parts[0]), int(parts[1]), int(parts[2]))
            elif "/" in as_of_str:
                parts = as_of_str.split("/")
                target_dt = datetime(int(parts[2]), int(parts[1]), int(parts[0]))
        except Exception:
            pass

    target_year = target_dt.year
    target_month = target_dt.month
    target_day = target_dt.day

    monthly_rate = float(family.monthly_santha) if family.monthly_santha is not None else 500.0
    due_day = int(family.santha_due_day) if family.santha_due_day is not None else 10

    joining_year = target_year
    joining_month = target_month
    joining_day = 1

    j_date = family.joining_date
    if j_date:
        j_str = str(j_date).strip()
        try:
            if "-" in j_str:
                parts = j_str.split("-")
                if len(parts[0]) == 4:
                    joining_year = int(parts[0])
                    joining_month = int(parts[1])
                    if len(parts) >= 3:
                        joining_day = int(parts[2])
                elif len(parts[2]) == 4:
                    joining_year = int(parts[2])
                    joining_month = int(parts[1])
                    joining_day = int(parts[0])
            elif "/" in j_str:
                parts = j_str.split("/")
                if len(parts[2]) == 4:
                    joining_year = int(parts[2])
                    joining_month = int(parts[1])
                    joining_day = int(parts[0])
        except Exception:
            pass
    elif family.created_at:
        joining_year = family.created_at.year
        joining_month = family.created_at.month
        joining_day = family.created_at.day

    due_months_count = 0
    total_months_elapsed = 0
    month_breakdown = []

    fam_cols = [c for c in collections if c.family_id == family.id]
    total_paid = sum(float(c.amount or 0.0) for c in fam_cols)
    running_paid = total_paid

    curr_y = joining_year
    curr_m = joining_month

    while True:
        if curr_y > target_year or (curr_y == target_year and curr_m > target_month):
            break

        total_months_elapsed += 1
        m_name = f"{month_names[curr_m - 1]} {curr_y}"
        
        is_past_month = (curr_y < target_year) or (curr_y == target_year and curr_m < target_month)
        is_current_month = (curr_y == target_year and curr_m == target_month)
        
        if is_past_month:
            is_due = True
        elif is_current_month:
            is_due = (target_day >= due_day)
        else:
            is_due = False

        if is_due:
            due_months_count += 1

        if running_paid >= monthly_rate:
            m_status = "Paid"
            m_paid = monthly_rate
            m_pending = 0.0
            running_paid -= monthly_rate
        elif running_paid > 0:
            m_status = "Partially Paid"
            m_paid = running_paid
            m_pending = monthly_rate - running_paid
            running_paid = 0.0
        else:
            m_status = "Due" if is_due else "Not Due Yet"
            m_paid = 0.0
            m_pending = monthly_rate if is_due else 0.0

        month_breakdown.append({
            "month": m_name,
            "year": curr_y,
            "month_num": curr_m,
            "due_amount": monthly_rate,
            "paid_amount": m_paid,
            "pending_amount": m_pending,
            "is_due": is_due,
            "status": m_status
        })

        curr_m += 1
        if curr_m > 12:
            curr_m = 1
            curr_y += 1

    required_santha = due_months_count * monthly_rate
    pending_arrears = max(0.0, required_santha - total_paid)
    advance_amount = max(0.0, total_paid - required_santha)
    months_overdue = int(pending_arrears // monthly_rate) if monthly_rate > 0 else 0
    advance_months = int(advance_amount // monthly_rate) if monthly_rate > 0 else 0

    if required_santha == 0:
        payment_status = "Paid"
    elif pending_arrears == 0:
        payment_status = "Paid"
    elif total_paid > 0:
        payment_status = "Partially Paid"
    else:
        payment_status = "Due"

    joining_date_formatted = f"{joining_day:02d} {month_names[joining_month - 1][:3]} {joining_year}" if family.joining_date else f"{month_names[joining_month - 1]} {joining_year}"

    return {
        "family_id": family.id,
        "family_code": family.family_code or f"F-{family.id:04d}",
        "family_name": family.family_name,
        "head_name": family.head_name or family.family_name,
        "monthly_santha": monthly_rate,
        "monthly_rate": monthly_rate,
        "due_day": due_day,
        "joining_date": joining_date_formatted,
        "joining_year": joining_year,
        "joining_month": joining_month,
        "joining_day": joining_day,
        "target_date": target_dt.strftime("%Y-%m-%d"),
        "applicable_months": total_months_elapsed,
        "due_months_count": due_months_count,
        "required_santha": required_santha,
        "total_paid": total_paid,
        "pending_arrears": pending_arrears,
        "outstanding_amount": pending_arrears,
        "advance_amount": advance_amount,
        "months_overdue": months_overdue,
        "advance_months": advance_months,
        "payment_status": payment_status,
        "suggested_collection_amount": pending_arrears if pending_arrears > 0 else monthly_rate,
        "month_breakdown": month_breakdown
    }


@router.get("/santha-overview")
async def get_santha_overview(
    month: Optional[str] = "August",
    year: Optional[int] = 2026,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """
    Get live Santha Collection metrics and family ledger breakdown directly from PostgreSQL database.
    NO dummy or mock data used.
    """
    families = db.query(Family).filter(Family.masjid_id == masjid_id).all()
    collections = db.query(SanthaCollection).filter(SanthaCollection.masjid_id == masjid_id).all()

    total_families_count = len(families)
    total_monthly_due = sum((f.monthly_santha or 500.0) for f in families)

    month_collections = [c for c in collections if c.month == month and c.year == year]
    month_collected_amount = sum(c.amount for c in month_collections)
    collection_rate = (month_collected_amount / total_monthly_due * 100.0) if total_monthly_due > 0 else 0.0

    families_with_arrears = 0
    total_arrears_amount = 0.0

    target_year = year or 2026
    month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    target_month_num = 9
    if month and month in month_names:
        target_month_num = month_names.index(month) + 1
    as_of_str = f"{target_year}-{target_month_num:02d}-28"

    ledger_items = []
    for f in families:
        calc = calculate_family_santha_arrears(f, collections, as_of_date=as_of_str)
        
        fam_collections = [c for c in collections if c.family_id == f.id]
        month_paid = sum(c.amount for c in fam_collections if c.month == month and c.year == year)

        if calc["pending_arrears"] > 0:
            families_with_arrears += 1
            total_arrears_amount += calc["pending_arrears"]

        due_day_val = f.santha_due_day or 10
        today_dt = datetime.now()
        if today_dt.day <= due_day_val:
            next_due = datetime(today_dt.year, today_dt.month, due_day_val)
        else:
            nm = today_dt.month + 1 if today_dt.month < 12 else 1
            ny = today_dt.year if today_dt.month < 12 else today_dt.year + 1
            next_due = datetime(ny, nm, due_day_val)
        next_due_str = next_due.strftime("%d %b %Y")

        ledger_items.append({
            "family_id": f.id,
            "family_code": f.family_code or f"F-{f.id:04d}",
            "family_name": f.family_name,
            "head_name": f.head_name or f.family_name,
            "period": f"{month[:3]} {year}",
            "monthly_santha": f.monthly_santha or 200.0,
            "due_day": due_day_val,
            "due": calc["required_santha"],
            "paid": calc["total_paid"],
            "balance": calc["pending_arrears"],
            "status": calc["payment_status"],
            "total_paid": calc["total_paid"],
            "joining_date": calc["joining_date"],
            "applicable_months": calc["applicable_months"],
            "required_santha": calc["required_santha"],
            "next_due_date": next_due_str
        })

    advance_collections = [c for c in collections if c.is_advance or c.allocation == "Advance"]
    total_advance_amount = sum(c.amount for c in advance_collections)
    advance_families_count = len(set(c.family_id for c in advance_collections if c.family_id))

    return {
        "summary": {
            "due_amount": total_monthly_due,
            "total_families": total_families_count,
            "collected_amount": month_collected_amount,
            "collection_rate": round(collection_rate, 1),
            "arrears_amount": total_arrears_amount,
            "arrears_families": families_with_arrears,
            "advance_amount": total_advance_amount,
            "advance_families": advance_families_count
        },
        "families": ledger_items
    }

@router.get("/santha", response_model=List[SanthaCollectionResponse])
async def get_santha_collections(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Retrieve all recorded Santha collections."""
    records = db.query(SanthaCollection).filter(SanthaCollection.masjid_id == masjid_id).order_by(SanthaCollection.id.desc()).all()
    return records

@router.post("/santha", response_model=SanthaCollectionResponse)
async def create_santha_collection(
    payload: SanthaCollectionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Record a new Santha payment for a family and save to PostgreSQL database."""
    try:
        count = db.query(SanthaCollection).filter(SanthaCollection.masjid_id == masjid_id).count()
        year_suffix = datetime.now().strftime("%y")
        date_str = datetime.now().strftime("%Y%m%d")

        default_rcp = f"SANT-{year_suffix}-{count + 1:02d}"
        rcp_code = payload.receipt_no if (payload.receipt_no and payload.receipt_no.strip()) else default_rcp

        is_adv = payload.is_advance or (payload.allocation == "Advance")
        is_arr = payload.is_arrears or (payload.allocation == "Specific")

        default_ref = f"TXN-{date_str}-{count + 1:02d}"
        ref_id = payload.reference_id if (payload.reference_id and payload.reference_id.strip() and not payload.reference_id.startswith("TXN-202")) else default_ref

        # Get existing family collections to calculate previous balance
        existing_cols = db.query(SanthaCollection).filter(SanthaCollection.masjid_id == masjid_id).all()
        fam_obj = db.query(Family).filter(Family.id == payload.family_id, Family.masjid_id == masjid_id).first()
        
        prev_balance = 0.0
        if fam_obj:
            calc_before = calculate_family_santha_arrears(fam_obj, existing_cols, as_of_date=payload.payment_date)
            prev_balance = calc_before["pending_arrears"]
        
        rem_balance = max(0.0, prev_balance - payload.amount)

        new_rec = SanthaCollection(
            masjid_id=masjid_id,
            receipt_no=rcp_code,
            family_id=payload.family_id,
            family_code=payload.family_code or f"F-{payload.family_id:04d}",
            family_name=payload.family_name,
            head_name=payload.head_name or payload.family_name,
            month=payload.month,
            year=payload.year,
            payment_date=payload.payment_date or datetime.now().strftime("%Y-%m-%d"),
            amount=payload.amount,
            payment_method=payload.payment_method or "Cash",
            financial_account=payload.financial_account or "Main Cash",
            allocation=payload.allocation or "Auto",
            reference_id=ref_id,
            collector_name=payload.collector_name or "Admin User",
            is_advance=is_adv,
            is_arrears=is_arr,
            advance_months=payload.advance_months or 0,
            advance_period=payload.advance_period or f"{payload.month} {payload.year}",
            previous_balance=prev_balance,
            remaining_balance=rem_balance,
            notes=payload.notes
        )

        db.add(new_rec)

        # Update family collection totals & log audit record to FamilyHeadChange
        fam_obj = db.query(Family).filter(Family.id == payload.family_id, Family.masjid_id == masjid_id).first()
        old_head_name = fam_obj.head_name if fam_obj else (payload.head_name or payload.family_name)
        if fam_obj:
            fam_obj.collected_amount = (fam_obj.collected_amount or 0.0) + payload.amount
            if fam_obj.pending_amount and fam_obj.pending_amount > 0:
                fam_obj.pending_amount = max(0.0, fam_obj.pending_amount - payload.amount)

        pmt_dt = datetime.utcnow()
        if payload.payment_date:
            try:
                pmt_dt = datetime.strptime(payload.payment_date.strip(), "%Y-%m-%d %H:%M")
            except Exception:
                try:
                    pmt_dt = datetime.strptime(payload.payment_date.strip(), "%Y-%m-%d")
                except Exception:
                    pmt_dt = datetime.utcnow()

        head_log = FamilyHeadChange(
            masjid_id=masjid_id,
            family_id=payload.family_id,
            family_name=payload.family_name,
            old_head=old_head_name,
            new_head=old_head_name,
            reason=f"Santha Collection Payment — ₹{payload.amount:,.0f} ({rcp_code})",
            old_details=json.dumps({
                "head_name": old_head_name,
                "monthly_santha": fam_obj.monthly_santha if fam_obj else 500.0,
                "status": fam_obj.status if fam_obj else "Active",
                "area": fam_obj.area if fam_obj else "Tenkasi"
            }),
            new_details=json.dumps({
                "head_name": old_head_name,
                "collected_amount": payload.amount,
                "receipt_no": rcp_code,
                "payment_method": payload.payment_method or "Cash",
                "financial_account": payload.financial_account or "Main Cash",
                "month_year": f"{payload.month} {payload.year}",
                "reference_id": ref_id,
                "payment_date": payload.payment_date or datetime.now().strftime("%Y-%m-%d %H:%M")
            }),
            changed_by=payload.collector_name or "Admin User",
            changed_at=pmt_dt
        )
        db.add(head_log)

        db.commit()
        db.refresh(new_rec)
        return new_rec
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record Santha collection: {str(e)}")

@router.get("/santha-arrears")
async def get_santha_arrears(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """List families with pending/overdue Santha arrears based on Joining Date."""
    families = db.query(Family).filter(Family.masjid_id == masjid_id).all()
    collections = db.query(SanthaCollection).filter(SanthaCollection.masjid_id == masjid_id).all()
    arrears_list = []
    
    for f in families:
        calc = calculate_family_santha_arrears(f, collections)

        if calc["pending_arrears"] > 0:
            arrears_list.append({
                "family_id": f.id,
                "family_code": f.family_code or f"F-{f.id:04d}",
                "family_name": f.family_name,
                "head_name": f.head_name or f.family_name,
                "mobile_number": f.mobile_number or "—",
                "area": f.area or "Tenkasi",
                "monthly_santha": calc["monthly_rate"],
                "total_paid": calc["total_paid"],
                "pending_arrears": calc["pending_arrears"],
                "months_overdue": calc["months_overdue"] or 1,
                "joining_date": calc["joining_date"],
                "applicable_months": calc["applicable_months"],
                "required_santha": calc["required_santha"],
                "status": "Overdue / Arrears"
            })

    return arrears_list


@router.get("/santha-calculation/{family_id}")
async def get_family_santha_calculation(
    family_id: int,
    as_of_date: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """
    Get full joining-date based Santha calculation and month-by-month payment history for a family.
    """
    family = db.query(Family).filter(Family.id == family_id, Family.masjid_id == masjid_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family record not found.")

    collections = db.query(SanthaCollection).filter(SanthaCollection.masjid_id == masjid_id).all()
    return calculate_family_santha_arrears(family, collections, as_of_date=as_of_date)

@router.get("/santha-advances")
async def get_santha_advances(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """List recorded advance Santha payments."""
    advances = db.query(SanthaCollection).filter(
        SanthaCollection.masjid_id == masjid_id,
        (SanthaCollection.is_advance == True) | (SanthaCollection.allocation == "Advance")
    ).order_by(SanthaCollection.id.desc()).all()
    return [
        {
            "id": a.id,
            "receipt_no": a.receipt_no,
            "family_id": a.family_id,
            "family_code": a.family_code or f"F-{a.family_id:04d}",
            "family_name": a.family_name,
            "head_name": a.head_name or a.family_name,
            "advance_amount": a.amount,
            "advance_months": a.advance_months or 0,
            "period": a.advance_period or f"{a.month} {a.year}",
            "payment_method": a.payment_method,
            "financial_account": a.financial_account or "Main Cash",
            "reference_id": a.reference_id or "—",
            "notes": a.notes or "",
            "date": a.payment_date or (a.created_at.strftime("%Y-%m-%d") if a.created_at else "—")
        }
        for a in advances
    ]

@router.put("/santha/{collection_id}")
async def update_santha_collection(
    collection_id: int,
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Update an existing Santha payment or advance record in PostgreSQL."""
    rec = db.query(SanthaCollection).filter(SanthaCollection.id == collection_id, SanthaCollection.masjid_id == masjid_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Santha collection record not found")

    try:
        if "amount" in payload and payload["amount"] is not None:
            rec.amount = float(payload["amount"])
        if "payment_date" in payload and payload["payment_date"]:
            rec.payment_date = str(payload["payment_date"])
        if "payment_method" in payload and payload["payment_method"]:
            rec.payment_method = str(payload["payment_method"])
        if "financial_account" in payload and payload["financial_account"]:
            rec.financial_account = str(payload["financial_account"])
        if "reference_id" in payload and payload["reference_id"]:
            rec.reference_id = str(payload["reference_id"])
        if "advance_months" in payload and payload["advance_months"] is not None:
            rec.advance_months = int(payload["advance_months"])
        if "advance_period" in payload and payload["advance_period"]:
            rec.advance_period = str(payload["advance_period"])
        if "notes" in payload:
            rec.notes = payload["notes"]

        db.commit()
        db.refresh(rec)
        return rec
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update Santha collection record: {str(e)}")

@router.delete("/santha/{collection_id}")
async def delete_santha_collection(
    collection_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Delete a Santha collection record from PostgreSQL."""
    rec = db.query(SanthaCollection).filter(SanthaCollection.id == collection_id, SanthaCollection.masjid_id == masjid_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Santha collection record not found")

    try:
        db.delete(rec)
        db.commit()
        return {"message": "Record deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete record: {str(e)}")

@router.get("/santha-receipts")
async def get_santha_receipts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """List all generated Santha collection receipts."""
    receipts = db.query(SanthaCollection).filter(SanthaCollection.masjid_id == masjid_id).order_by(SanthaCollection.id.desc()).all()
    return [
        {
            "id": r.id,
            "receipt_no": r.receipt_no,
            "date": r.created_at.strftime("%d %b %Y") if r.created_at else "—",
            "family_code": r.family_code or f"F-{r.family_id:04d}",
            "family_name": r.family_name,
            "head_name": r.head_name or r.family_name,
            "month_year": f"{r.month} {r.year}",
            "amount": r.amount,
            "payment_method": r.payment_method,
            "collector_name": r.collector_name,
            "type": "Advance" if r.is_advance else ("Arrears" if r.is_arrears else "Regular Santha")
        }
        for r in receipts
    ]

# --------------------------------------------------------------------------
# JUMA COLLECTION ENDPOINTS
# --------------------------------------------------------------------------

@router.get("/juma", response_model=List[JumaCollectionResponse])
async def get_juma_collections(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Retrieve Friday Juma Hundi / Box collection records."""
    return db.query(JumaCollection).filter(JumaCollection.masjid_id == masjid_id).order_by(JumaCollection.id.desc()).all()

@router.post("/juma", response_model=JumaCollectionResponse)
async def create_juma_collection(
    payload: JumaCollectionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Record new Friday Juma Box or Category collection."""
    try:
        count = db.query(JumaCollection).filter(JumaCollection.masjid_id == masjid_id).count()
        year_suffix = datetime.now().strftime("%y")
        default_rcp = f"JUM-{year_suffix}-{count + 1:02d}"
        rcp_code = payload.receipt_no if (payload.receipt_no and payload.receipt_no.strip() and not payload.receipt_no.startswith("REC-JUM")) else default_rcp
        
        pmt_sum = (payload.cash_amount or 0.0) + (payload.upi_amount or 0.0) + \
                  (payload.paytm_amount or 0.0) + (payload.bank_amount or 0.0) + \
                  (payload.cheque_amount or 0.0)
        
        cat_sum = (payload.general_amount or 0.0) + (payload.madrasa_amount or 0.0) + \
                  (payload.ramadan_amount or 0.0) + (payload.zakat_amount or 0.0) + \
                  (payload.welfare_amount or 0.0) + (payload.graveyard_amount or 0.0) + \
                  (payload.other_amount or 0.0)
        
        total_amt = pmt_sum if pmt_sum > 0 else (cat_sum if cat_sum > 0 else (payload.amount or 0.0))

        pm_method = payload.payment_method or "Cash"
        if pmt_sum > 0:
            methods = []
            if (payload.cash_amount or 0) > 0: methods.append("Cash")
            if (payload.upi_amount or 0) > 0: methods.append("QR / UPI")
            if (payload.paytm_amount or 0) > 0: methods.append("Paytm")
            if (payload.bank_amount or 0) > 0: methods.append("Bank Transfer")
            if (payload.cheque_amount or 0) > 0: methods.append("Cheque")
            pm_method = ", ".join(methods) if methods else "Cash"

        new_juma = JumaCollection(
            masjid_id=masjid_id,
            contributor_type=payload.contributor_type or "Family",
            family_id=payload.family_id,
            family_code=payload.family_code,
            receipt_no=rcp_code,
            collection_date=payload.collection_date or datetime.now().strftime("%Y-%m-%d"),
            donor_name=payload.donor_name or "General Contributor",
            general_amount=payload.general_amount or 0.0,
            madrasa_amount=payload.madrasa_amount or 0.0,
            ramadan_amount=payload.ramadan_amount or 0.0,
            zakat_amount=payload.zakat_amount or 0.0,
            welfare_amount=payload.welfare_amount or 0.0,
            graveyard_amount=payload.graveyard_amount or 0.0,
            other_amount=payload.other_amount or 0.0,
            cash_amount=payload.cash_amount or 0.0,
            upi_amount=payload.upi_amount or 0.0,
            paytm_amount=payload.paytm_amount or 0.0,
            bank_amount=payload.bank_amount or 0.0,
            cheque_amount=payload.cheque_amount or 0.0,
            payment_method=pm_method,
            amount=total_amt,
            status=payload.status or "Received",
            juma_type=payload.juma_type or "1st Juma Prayer",
            counted_by=payload.counted_by or "Masjid Committee",
            notes=payload.notes
        )
        db.add(new_juma)
        db.commit()
        db.refresh(new_juma)
        return new_juma
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record Juma collection: {str(e)}")

@router.put("/juma/{juma_id}")
async def update_juma_collection(
    juma_id: int,
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Update a Juma collection record in PostgreSQL."""
    rec = db.query(JumaCollection).filter(JumaCollection.id == juma_id, JumaCollection.masjid_id == masjid_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Juma collection record not found")

    try:
        for k, v in payload.items():
            if hasattr(rec, k) and v is not None:
                setattr(rec, k, v)
        
        pmt_sum = (rec.cash_amount or 0.0) + (rec.upi_amount or 0.0) + \
                  (rec.paytm_amount or 0.0) + (rec.bank_amount or 0.0) + \
                  (rec.cheque_amount or 0.0)
        
        cat_sum = (rec.general_amount or 0.0) + (rec.madrasa_amount or 0.0) + \
                  (rec.ramadan_amount or 0.0) + (rec.zakat_amount or 0.0) + \
                  (rec.welfare_amount or 0.0) + (rec.graveyard_amount or 0.0) + \
                  (rec.other_amount or 0.0)
        if pmt_sum > 0:
            rec.amount = pmt_sum
        elif cat_sum > 0:
            rec.amount = cat_sum

        db.commit()
        db.refresh(rec)
        return rec
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update Juma record: {str(e)}")

@router.delete("/juma/{juma_id}")
async def delete_juma_collection(
    juma_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Delete a Juma collection record from PostgreSQL."""
    rec = db.query(JumaCollection).filter(JumaCollection.id == juma_id, JumaCollection.masjid_id == masjid_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Juma collection record not found")

    try:
        db.delete(rec)
        db.commit()
        return {"message": "Juma collection record deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete record: {str(e)}")

# --------------------------------------------------------------------------
# DONATIONS ENDPOINTS
# --------------------------------------------------------------------------

@router.get("/donations", response_model=List[DonationResponse])
async def get_donations(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Retrieve all recorded donations and Sadaqah contributions."""
    return db.query(Donation).filter(Donation.masjid_id == masjid_id).order_by(Donation.id.desc()).all()

@router.post("/donations", response_model=DonationResponse)
async def create_donation(
    payload: DonationCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Record a new Donation or Sadaqah contribution with full category and payment breakdown."""
    try:
        count = db.query(Donation).filter(Donation.masjid_id == masjid_id).count()
        year_suffix = datetime.now().strftime("%y")
        default_rcp = f"DON-{year_suffix}-{count + 1:02d}"
        rcp_code = payload.receipt_no if (payload.receipt_no and payload.receipt_no.strip() and not payload.receipt_no.startswith("REC-DON")) else default_rcp

        pmt_sum = (payload.cash_amount or 0.0) + (payload.upi_amount or 0.0) + \
                  (payload.paytm_amount or 0.0) + (payload.bank_amount or 0.0) + \
                  (payload.cheque_amount or 0.0)

        cat_sum = (payload.general_amount or 0.0) + (payload.madrasa_amount or 0.0) + \
                  (payload.ramadan_amount or 0.0) + (payload.zakat_amount or 0.0) + \
                  (payload.welfare_amount or 0.0) + (payload.graveyard_amount or 0.0) + \
                  (payload.other_amount or 0.0)

        total_amt = pmt_sum if pmt_sum > 0 else (cat_sum if cat_sum > 0 else (payload.amount or 0.0))

        pm_method = payload.payment_method or "Cash"
        if pmt_sum > 0:
            methods = []
            if (payload.cash_amount or 0) > 0: methods.append("Cash")
            if (payload.upi_amount or 0) > 0: methods.append("QR / UPI")
            if (payload.paytm_amount or 0) > 0: methods.append("Paytm")
            if (payload.bank_amount or 0) > 0: methods.append("Bank Transfer")
            if (payload.cheque_amount or 0) > 0: methods.append("Cheque")
            pm_method = ", ".join(methods) if methods else "Cash"

        new_don = Donation(
            masjid_id=masjid_id,
            contributor_type=payload.contributor_type or "Family",
            family_id=payload.family_id,
            family_code=payload.family_code,
            receipt_no=rcp_code,
            donation_date=payload.donation_date or datetime.now().strftime("%Y-%m-%d"),
            donor_name=payload.donor_name,
            donor_mobile=payload.donor_mobile,
            category=payload.category or "General Donation",
            general_amount=payload.general_amount or 0.0,
            madrasa_amount=payload.madrasa_amount or 0.0,
            ramadan_amount=payload.ramadan_amount or 0.0,
            zakat_amount=payload.zakat_amount or 0.0,
            welfare_amount=payload.welfare_amount or 0.0,
            graveyard_amount=payload.graveyard_amount or 0.0,
            other_amount=payload.other_amount or 0.0,
            cash_amount=payload.cash_amount or 0.0,
            upi_amount=payload.upi_amount or 0.0,
            paytm_amount=payload.paytm_amount or 0.0,
            bank_amount=payload.bank_amount or 0.0,
            cheque_amount=payload.cheque_amount or 0.0,
            amount=total_amt,
            payment_method=pm_method,
            notes=payload.notes,
            status=payload.status or "Received"
        )
        db.add(new_don)
        db.commit()
        db.refresh(new_don)
        return new_don
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record donation: {str(e)}")

@router.put("/donations/{donation_id}")
async def update_donation(
    donation_id: int,
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Update a donation record in PostgreSQL."""
    rec = db.query(Donation).filter(Donation.id == donation_id, Donation.masjid_id == masjid_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Donation record not found")

    try:
        for k, v in payload.items():
            if hasattr(rec, k) and v is not None:
                setattr(rec, k, v)
        
        pmt_sum = (rec.cash_amount or 0.0) + (rec.upi_amount or 0.0) + \
                  (rec.paytm_amount or 0.0) + (rec.bank_amount or 0.0) + \
                  (rec.cheque_amount or 0.0)
        
        cat_sum = (rec.general_amount or 0.0) + (rec.madrasa_amount or 0.0) + \
                  (rec.ramadan_amount or 0.0) + (rec.zakat_amount or 0.0) + \
                  (rec.welfare_amount or 0.0) + (rec.graveyard_amount or 0.0) + \
                  (rec.other_amount or 0.0)
        if pmt_sum > 0:
            rec.amount = pmt_sum
        elif cat_sum > 0:
            rec.amount = cat_sum

        db.commit()
        db.refresh(rec)
        return rec
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update donation record: {str(e)}")

@router.delete("/donations/{donation_id}")
async def delete_donation(
    donation_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = get_current_masjid_id(current_user)
    """Delete a donation record from PostgreSQL."""
    rec = db.query(Donation).filter(Donation.id == donation_id, Donation.masjid_id == masjid_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Donation record not found")

    try:
        db.delete(rec)
        db.commit()
        return {"message": "Donation record deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete donation record: {str(e)}")
