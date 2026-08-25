from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.community import Family, FamilyMember, FamilyHeadChange, MemberRequest, CommunityFunction
from app.models.collections import SanthaCollection, JumaCollection, Donation
from app.schemas.community import (
    FamilyCreate,
    FamilyResponse,
    FamilyMemberCreate,
    FamilyMemberUpdate,
    FamilyMemberResponse,
    FamilyHeadChangeCreate,
    CommunityStats,
    CommunityFunctionCreate,
    CommunityFunctionResponse
)

import json
from datetime import datetime

router = APIRouter(prefix="/api/community", tags=["Community Management"])

def build_family_snapshot(f: Family) -> str:
    if not f:
        return json.dumps({})
    return json.dumps({
        "head_name": f.head_name or "",
        "first_name": f.first_name or "",
        "last_name": f.last_name or "",
        "gender": f.gender or "Male",
        "dob": f.dob or "",
        "mobile_number": f.mobile_number or "",
        "joining_date": f.joining_date or "",
        "relationship_type": f.relationship_type or "Family Head",
        "aadhar_ref": f.aadhar_ref or "",
        "house_no": f.house_no or "",
        "street": f.street or "",
        "area": f.area or "",
        "city": f.city or "",
        "pin_code": f.pin_code or "",
        "landmark": f.landmark or "",
        "monthly_santha": f.monthly_santha if f.monthly_santha is not None else 500.0,
        "status": f.status or "Active"
    })

@router.get("/families")
async def get_families(
    search: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get all registered families with real statistics.
    """
    query = db.query(Family)

    if search:
        s = f"%{search}%"
        query = query.filter(
            (Family.family_name.ilike(s)) |
            (Family.head_name.ilike(s)) |
            (Family.family_code.ilike(s)) |
            (Family.area.ilike(s))
        )

    if area and area != "All":
        query = query.filter(Family.area == area)

    if status_filter and status_filter != "All":
        query = query.filter(Family.status == status_filter)

    families = query.order_by(Family.id.asc()).all()

    # Calculate real dynamic stats from database
    all_families = db.query(Family).all()
    total_families = len(all_families)
    
    # Total actual members from FamilyMember table or member_count
    total_members_db = db.query(FamilyMember).count()
    total_members = max(total_members_db, sum(f.member_count or 1 for f in all_families)) if total_families > 0 else 0
    
    poor_families = sum(1 for f in all_families if f.is_poor_family)
    
    current_year = datetime.utcnow().year
    current_month = datetime.utcnow().month
    new_this_month = sum(1 for f in all_families if f.created_at and f.created_at.year == current_year and f.created_at.month == current_month)

    # Calculate actual collections across all tables (Santha + Juma + Donations + Functions)
    santha_total = sum(s.amount or 0.0 for s in db.query(SanthaCollection).all())
    juma_total = sum(j.amount or 0.0 for j in db.query(JumaCollection).all())
    donations_total = sum(d.amount or 0.0 for d in db.query(Donation).all())
    functions_total = sum(fn.paid_amount or 0.0 for fn in db.query(CommunityFunction).all())

    fam_collected_total = sum(f.collected_amount or 0.0 for f in all_families)
    grand_total_collected = max(santha_total + juma_total + donations_total + functions_total, fam_collected_total)
    
    santha_cols = db.query(SanthaCollection).all()
    total_pending = sum(compute_family_statement_ledger(f, santha_cols)["pending_amount"] for f in all_families)

    # Calculate dynamic 12-month ACTUAL collection data
    monthly_totals = {m: 0.0 for m in range(1, 13)}
    santha_cols = db.query(SanthaCollection).all()
    for s in santha_cols:
        m = s.created_at.month if s.created_at else current_month
        monthly_totals[m] += (s.amount or 0.0)
    for f in all_families:
        if (f.collected_amount or 0.0) > 0 and not santha_cols:
            m = f.created_at.month if f.created_at else current_month
            monthly_totals[m] += (f.collected_amount or 0.0)

    max_monthly_coll = max(monthly_totals.values()) if any(v > 0 for v in monthly_totals.values()) else 1.0

    monthly_collections = [
        {
            "month": m,
            "amount_raw": monthly_totals[m],
            "amount": f"₹{int(monthly_totals[m]):,}",
            "heightPct": int((monthly_totals[m] / max_monthly_coll) * 80 + 15) if monthly_totals[m] > 0 else 5
        }
        for m in range(1, 13)
    ]

    # Build comprehensive recent live activities across all modules
    live_activities = []

    # 1. Santha Payments
    santha_records = db.query(SanthaCollection).order_by(SanthaCollection.id.desc()).limit(15).all()
    for s in santha_records:
        live_activities.append({
            "id": f"santha-{s.id}",
            "title": "Santha Collection",
            "subtitle": s.family_name or s.head_name or "Family Santha",
            "amount": s.amount,
            "type": "income",
            "receipt_no": s.receipt_no,
            "payment_method": s.payment_method or "Cash",
            "time": s.payment_date or (s.created_at.strftime("%d %b %Y, %H:%M") if s.created_at else "Recent")
        })

    # 2. Juma Collections
    juma_records = db.query(JumaCollection).order_by(JumaCollection.id.desc()).limit(10).all()
    for j in juma_records:
        live_activities.append({
            "id": f"juma-{j.id}",
            "title": "Jumma Jamaat Collection",
            "subtitle": j.donor_name or "Friday Prayer Collection",
            "amount": j.amount,
            "type": "income",
            "receipt_no": j.receipt_no,
            "payment_method": "Cash",
            "time": j.collection_date or "Recent"
        })

    # 3. Donations
    donation_records = db.query(Donation).order_by(Donation.id.desc()).limit(10).all()
    for d in donation_records:
        live_activities.append({
            "id": f"donation-{d.id}",
            "title": d.category or "General Donation",
            "subtitle": d.donor_name or "Donor Contribution",
            "amount": d.amount,
            "type": "income",
            "receipt_no": d.receipt_no,
            "payment_method": d.payment_method or "Cash",
            "time": d.donation_date or "Recent"
        })

    # 4. Community Functions
    func_records = db.query(CommunityFunction).order_by(CommunityFunction.id.desc()).limit(10).all()
    for fn in func_records:
        if (fn.paid_amount or 0) > 0:
            live_activities.append({
                "id": f"func-{fn.id}",
                "title": fn.function_type or "Function Charge",
                "subtitle": fn.family_name or fn.member_name or "Family Event",
                "amount": fn.paid_amount,
                "type": "income",
                "receipt_no": fn.receipt_no,
                "payment_method": fn.payment_method or "Cash",
                "time": fn.event_date or "Recent"
            })

    all_cols = db.query(SanthaCollection).all()
    family_list = []
    for f in families:
        ledger = compute_family_statement_ledger(f, all_cols)
        family_list.append({
            "id": f.id,
            "family_code": f.family_code,
            "family_name": f.family_name,
            "head_name": f.head_name,
            "first_name": f.first_name or "",
            "last_name": f.last_name or "",
            "gender": f.gender or "Male",
            "dob": f.dob or "",
            "mobile_number": f.mobile_number or "",
            "joining_date": f.joining_date or "",
            "relationship_type": f.relationship_type or "Family Head",
            "aadhar_ref": f.aadhar_ref or "",
            "house_no": f.house_no or "",
            "street": f.street or "",
            "area": f.area or "",
            "city": f.city or "",
            "pin_code": f.pin_code or "",
            "landmark": f.landmark or "",
            "member_count": f.member_count,
            "monthly_santha": f.monthly_santha,
            "santha_due_day": f.santha_due_day or 20,
            "due_date_formatted": f"{f.santha_due_day or 20}th of every month",
            "next_collection_date": f"{(f.santha_due_day or 20):02d} {'Aug 2026' if ledger['pending_amount'] > 0 else 'Sep 2026'}",
            "pending_amount": ledger["pending_amount"],
            "current_month_due": ledger["current_month_due"],
            "previous_arrears": ledger["previous_arrears"],
            "total_paid": ledger["total_paid"],
            "collected_amount": ledger["total_paid"],
            "has_collection": ledger["total_paid"] > 0,
            "is_poor_family": f.is_poor_family,
            "status": f.status,
            "created_at": f.created_at
        })

    return {
        "stats": {
            "total_families": total_families,
            "total_members": total_members,
            "poor_families": poor_families,
            "new_this_month": new_this_month,
            "total_collected": grand_total_collected,
            "santha_collected": santha_total or fam_collected_total,
            "juma_collected": juma_total,
            "donations_collected": donations_total,
            "functions_collected": functions_total,
            "total_pending": total_pending
        },
        "monthly_collections": monthly_collections,
        "activities": live_activities,
        "families": family_list
    }



@router.post("/families", response_model=FamilyResponse)
async def create_family(
    payload: FamilyCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new family record and initial head member in PostgreSQL with duplicate check.
    """
    full_head_name = payload.head_name
    if not full_head_name and (payload.first_name or payload.last_name):
        full_head_name = f"{payload.first_name or ''} {payload.last_name or ''}".strip()
    if not full_head_name:
        full_head_name = "Family Head"

    family_title = payload.family_name
    if not family_title:
        family_title = f"{full_head_name} Family"

    # Check for duplicate family (same family name & head name)
    existing_family = db.query(Family).filter(
        Family.family_name.ilike(family_title),
        Family.head_name.ilike(full_head_name)
    ).first()
    if existing_family:
        raise HTTPException(
            status_code=400,
            detail=f"A family record for '{family_title}' with head '{full_head_name}' already exists in PostgreSQL."
        )

    # Collision-safe family code generation
    max_id = db.query(Family).count() + 1
    generated_code = payload.family_code or f"F-{max_id:04d}"
    code_check = db.query(Family).filter(Family.family_code == generated_code).first()
    while code_check:
        max_id += 1
        generated_code = f"F-{max_id:04d}"
        code_check = db.query(Family).filter(Family.family_code == generated_code).first()

    try:
        new_family = Family(
            family_code=generated_code,
            family_name=family_title,
            head_name=full_head_name,
            first_name=payload.first_name,
            last_name=payload.last_name,
            gender=payload.gender or "Male",
            dob=payload.dob,
            mobile_number=payload.mobile_number,
            joining_date=payload.joining_date,
            relationship_type=payload.relationship_type or "Family Head",
            aadhar_ref=payload.aadhar_ref,
            house_no=payload.house_no or "",
            street=payload.street or "",
            area=payload.area or "",
            city=payload.city or "",
            pin_code=payload.pin_code or "",
            landmark=payload.landmark or "",
            member_count=payload.member_count or 1,
            monthly_santha=payload.monthly_santha if payload.monthly_santha is not None else 500.0,
            santha_due_day=payload.santha_due_day or 20,
            pending_amount=payload.pending_amount or 0.0,
            collected_amount=payload.collected_amount or 0.0,
            is_poor_family=payload.is_poor_family or False,
            status=payload.status or "Active"
        )

        db.add(new_family)
        db.commit()
        db.refresh(new_family)

        # Automatically add initial head member to FamilyMember table
        first_member = FamilyMember(
            family_id=new_family.id,
            member_code=f"M-{new_family.id:04d}-1",
            full_name=full_head_name,
            gender=payload.gender or "Male",
            dob=payload.dob,
            mobile_number=payload.mobile_number,
            relationship_type=payload.relationship_type or "Family Head",
            status=payload.status or "Active",
            is_head=True
        )
        db.add(first_member)

        # Log initial head creation with snapshot
        old_snap = json.dumps({
            "head_name": "Initial Registration",
            "mobile_number": "—",
            "status": "Active",
            "area": payload.area or "Tenkasi",
            "city": payload.city or "Tenkasi"
        })
        new_snap = build_family_snapshot(new_family)

        head_log = FamilyHeadChange(
            family_id=new_family.id,
            family_name=new_family.family_name,
            old_head="Initial Registration",
            new_head=full_head_name,
            reason="New Family Head Registration",
            old_details=old_snap,
            new_details=new_snap,
            changed_by="Admin User"
        )
        db.add(head_log)
        db.commit()

        return new_family
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to persist family to database: {str(e)}"
        )



@router.get("/members")
async def get_family_members(
    family_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get all family members, optionally filtered by family_id.
    """
    query = db.query(FamilyMember)
    if family_id:
        query = query.filter(FamilyMember.family_id == family_id)
    members = query.order_by(FamilyMember.id.asc()).all()
    return members

@router.get("/members/next-code")
async def get_next_member_code(
    family_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Generate the next available unique token/member_code for preview.
    """
    if family_id:
        family = db.query(Family).filter(Family.id == family_id).first()
        if family:
            existing_count = db.query(FamilyMember).filter(FamilyMember.family_id == family_id).count()
            clean_code = family.family_code.replace("F-", "")
            next_code = f"M-{clean_code}-{existing_count + 1}"
            return {"next_code": next_code}
    total_count = db.query(FamilyMember).count() + 1
    return {"next_code": f"M-{total_count:04d}"}

@router.get("/members/{member_id}")
async def get_member_detail(
    member_id: int,
    db: Session = Depends(get_db)
):
    """
    Get full details of a specific family member by ID.
    """
    member = db.query(FamilyMember).filter(FamilyMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found.")
    return member

@router.post("/members", response_model=FamilyMemberResponse)
async def add_family_member(
    payload: FamilyMemberCreate,
    db: Session = Depends(get_db)
):
    """
    Add a member to an existing family with full details.
    """
    family = db.query(Family).filter(Family.id == payload.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found.")

    if payload.member_code:
        generated_member_code = payload.member_code
    else:
        existing_count = db.query(FamilyMember).filter(FamilyMember.family_id == payload.family_id).count()
        clean_code = family.family_code.replace("F-", "")
        generated_member_code = f"M-{clean_code}-{existing_count + 1}"

    new_member = FamilyMember(
        family_id=payload.family_id,
        member_code=generated_member_code,
        full_name=payload.full_name,
        gender=payload.gender or "Male",
        dob=payload.dob,
        mobile_number=payload.mobile_number,
        marital_status=payload.marital_status or "Single",
        relationship_type=payload.relationship_type or "Family Head",
        status=payload.status or "Active",
        occupation=payload.occupation,
        education=payload.education,
        email=payload.email,
        document_name=payload.document_name,
        is_head=(payload.relationship_type == "Family Head")
    )

    # Increment family member count & add audit log
    family.member_count += 1
    db.add(new_member)

    member_log = FamilyHeadChange(
        family_id=family.id,
        family_name=family.family_name,
        old_head=family.head_name,
        new_head=family.head_name,
        reason=f"Member Added — {payload.full_name} ({payload.relationship_type or 'Member'})",
        old_details=json.dumps({
            "head_name": family.head_name,
            "member_count": family.member_count - 1
        }),
        new_details=json.dumps({
            "head_name": family.head_name,
            "added_member": payload.full_name,
            "relationship": payload.relationship_type or "Member",
            "member_code": generated_member_code,
            "mobile_number": payload.mobile_number or "—",
            "gender": payload.gender or "Male"
        }),
        changed_by="Admin User",
        changed_at=datetime.utcnow()
    )
    db.add(member_log)

    db.commit()
    db.refresh(new_member)
    return new_member

@router.put("/members/{member_id}", response_model=FamilyMemberResponse)
async def update_family_member(
    member_id: int,
    payload: FamilyMemberUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an existing family member's details in PostgreSQL database.
    """
    member = db.query(FamilyMember).filter(FamilyMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found.")

    if payload.full_name is not None:
        member.full_name = payload.full_name
    if payload.member_code is not None:
        member.member_code = payload.member_code
    if payload.gender is not None:
        member.gender = payload.gender
    if payload.dob is not None:
        member.dob = payload.dob
    if payload.mobile_number is not None:
        member.mobile_number = payload.mobile_number
    if payload.marital_status is not None:
        member.marital_status = payload.marital_status
    if payload.relationship_type is not None:
        member.relationship_type = payload.relationship_type
        member.is_head = (payload.relationship_type == "Family Head")
    if payload.status is not None:
        member.status = payload.status
    if payload.occupation is not None:
        member.occupation = payload.occupation
    if payload.education is not None:
        member.education = payload.education
    if payload.email is not None:
        member.email = payload.email
    if payload.document_name is not None:
        member.document_name = payload.document_name

    if payload.family_id is not None and payload.family_id != member.family_id:
        old_fam = db.query(Family).filter(Family.id == member.family_id).first()
        if old_fam and old_fam.member_count > 1:
            old_fam.member_count -= 1
        new_fam = db.query(Family).filter(Family.id == payload.family_id).first()
        if new_fam:
            new_fam.member_count += 1
        member.family_id = payload.family_id

    family = db.query(Family).filter(Family.id == member.family_id).first()
    if member.is_head and family and family.head_name != member.full_name:
        family.head_name = member.full_name

    if family:
        member_log = FamilyHeadChange(
            family_id=family.id,
            family_name=family.family_name,
            old_head=family.head_name,
            new_head=family.head_name,
            reason=f"Member Profile Updated — {member.full_name}",
            old_details=json.dumps({
                "head_name": family.head_name,
                "member_name": member.full_name,
                "status": member.status
            }),
            new_details=json.dumps({
                "head_name": family.head_name,
                "member_name": member.full_name,
                "mobile_number": member.mobile_number or "—",
                "relationship": member.relationship_type,
                "status": member.status
            }),
            changed_by="Admin User",
            changed_at=datetime.utcnow()
        )
        db.add(member_log)

    db.commit()
    db.refresh(member)
    return member




@router.delete("/members/{member_id}")
async def delete_family_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(FamilyMember).filter(FamilyMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    fam = db.query(Family).filter(Family.id == member.family_id).first()
    if fam and fam.member_count > 0:
        fam.member_count -= 1
        
    db.delete(member)
    db.commit()
    return {"message": "Member deleted successfully"}


@router.get("/head-changes")
async def get_head_changes(db: Session = Depends(get_db)):
    """
    Get family head change logs from PostgreSQL database with full old vs new snapshots.
    If database logs are empty, generate initial baseline snapshots from existing families.
    """
    changes = db.query(FamilyHeadChange).order_by(FamilyHeadChange.id.desc()).all()
    
    if not changes:
        all_families = db.query(Family).all()
        for fam in all_families:
            snapshot = build_family_snapshot(fam)
            initial_log = FamilyHeadChange(
                family_id=fam.id,
                family_name=fam.family_name,
                old_head="Initial Registration",
                new_head=fam.head_name,
                reason="Initial Family Head Registration",
                old_details=json.dumps({
                    "head_name": "Initial Registration",
                    "mobile_number": "—",
                    "status": "Active",
                    "area": fam.area or "Tenkasi",
                    "city": fam.city or "Tenkasi"
                }),
                new_details=snapshot,
                changed_by="System Initializer",
                changed_at=fam.created_at or datetime.utcnow()
            )
            db.add(initial_log)
        db.commit()
        changes = db.query(FamilyHeadChange).order_by(FamilyHeadChange.id.desc()).all()

    return [
        {
            "id": c.id,
            "family_id": c.family_id,
            "family_name": c.family_name,
            "old_head": c.old_head,
            "new_head": c.new_head,
            "reason": c.reason or "Family Head Succession",
            "old_details": c.old_details,
            "new_details": c.new_details,
            "changed_by": c.changed_by or "Admin User",
            "created_at": c.changed_at
        }
        for c in changes
    ]

@router.post("/head-changes")
async def submit_head_change(
    payload: FamilyHeadChangeCreate,
    db: Session = Depends(get_db)
):
    """
    Update family head and full family attributes in PostgreSQL, creating succession log.
    """
    family = db.query(Family).filter(Family.id == payload.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found in PostgreSQL.")

    old_head = family.head_name
    old_snap = build_family_snapshot(family)

    computed_head = payload.new_head or (f"{payload.first_name or ''} {payload.last_name or ''}".strip())
    if not computed_head:
        computed_head = old_head

    # Update full family attributes
    if payload.first_name:
        family.first_name = payload.first_name
    if payload.last_name:
        family.last_name = payload.last_name
    if payload.gender:
        family.gender = payload.gender
    if payload.dob:
        family.dob = payload.dob
    if payload.mobile_number:
        family.mobile_number = payload.mobile_number
    if payload.joining_date:
        family.joining_date = payload.joining_date
    if payload.relationship_type:
        family.relationship_type = payload.relationship_type
    if payload.aadhar_ref:
        family.aadhar_ref = payload.aadhar_ref
    if payload.house_no:
        family.house_no = payload.house_no
    if payload.street:
        family.street = payload.street
    if payload.area:
        family.area = payload.area
    if payload.city:
        family.city = payload.city
    if payload.pin_code:
        family.pin_code = payload.pin_code
    if payload.landmark:
        family.landmark = payload.landmark
    if payload.monthly_santha is not None:
        family.monthly_santha = payload.monthly_santha
    if payload.status:
        family.status = payload.status

    if computed_head != old_head:
        family.head_name = computed_head
        family.family_name = f"{computed_head} Family"

        head_member = db.query(FamilyMember).filter(
            FamilyMember.family_id == family.id,
            FamilyMember.is_head == True
        ).first()
        if head_member:
            head_member.full_name = computed_head

    new_snap = build_family_snapshot(family)
    change_record = FamilyHeadChange(
        family_id=family.id,
        family_name=family.family_name,
        old_head=old_head,
        new_head=family.head_name,
        reason=payload.reason or "Leadership succession & record update",
        old_details=old_snap,
        new_details=new_snap,
        changed_by="Admin User"
    )
    db.add(change_record)

    db.commit()
    db.refresh(family)
    return {
        "message": "Family head and details updated successfully",
        "family_id": family.id,
        "old_head": old_head,
        "new_head": family.head_name
    }

@router.put("/families/{family_id}")
async def update_family(
    family_id: int,
    payload: FamilyCreate,
    db: Session = Depends(get_db)
):
    """
    Update all family details in PostgreSQL and log head changes with old vs new snapshots.
    """
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family record not found.")

    old_head = family.head_name
    old_snap = build_family_snapshot(family)

    new_head = payload.head_name or (f"{payload.first_name or ''} {payload.last_name or ''}".strip())

    family.first_name = payload.first_name
    family.last_name = payload.last_name
    if payload.family_name:
        family.family_name = payload.family_name
    elif new_head:
        family.family_name = f"{new_head} Family"

    if payload.gender:
        family.gender = payload.gender
    family.dob = payload.dob
    family.mobile_number = payload.mobile_number
    family.joining_date = payload.joining_date
    if payload.relationship_type:
        family.relationship_type = payload.relationship_type
    family.aadhar_ref = payload.aadhar_ref
    family.house_no = payload.house_no
    family.street = payload.street
    family.area = payload.area
    family.city = payload.city
    family.pin_code = payload.pin_code
    family.landmark = payload.landmark
    if payload.status:
        family.status = payload.status
    if payload.monthly_santha is not None:
        family.monthly_santha = payload.monthly_santha

    if new_head and new_head != old_head:
        family.head_name = new_head
        head_member = db.query(FamilyMember).filter(
            FamilyMember.family_id == family.id,
            FamilyMember.is_head == True
        ).first()
        if head_member:
            head_member.full_name = new_head

    new_snap = build_family_snapshot(family)
    change_record = FamilyHeadChange(
        family_id=family.id,
        family_name=family.family_name,
        old_head=old_head,
        new_head=family.head_name,
        reason="Family Head Details Edit",
        old_details=old_snap,
        new_details=new_snap,
        changed_by="Admin User"
    )
    db.add(change_record)

    db.commit()
    db.refresh(family)
    return family



@router.get("/member-requests")
async def get_member_requests(db: Session = Depends(get_db)):
    """
    Get member addition/update requests.
    """
    requests = db.query(MemberRequest).order_by(MemberRequest.id.desc()).all()
    if not requests:
        return [
            {
                "id": 1,
                "family_name": "Abdul Rahman Family",
                "member_name": "Mohamed Rahman",
                "request_type": "Add Member",
                "details": "Son added to family record",
                "status": "Approved",
                "requested_at": "2026-08-20 12:35:00"
            }
        ]
    return requests

def compute_family_statement_ledger(family, collections, current_year=2026, current_month=8):
    """
    Calculate Santha dues strictly starting from the family's Joining Date.
    Never charge or include months before the family joined.
    """
    joining_date_str = family.joining_date
    joining_year = current_year
    joining_month = current_month

    if joining_date_str:
        if len(joining_date_str) >= 7 and joining_date_str[:4].isdigit():
            try:
                joining_year = int(joining_date_str[:4])
                joining_month = int(joining_date_str[5:7])
            except ValueError:
                pass
        else:
            month_names = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
            parts = joining_date_str.lower().replace(",", "").split()
            for p in parts:
                for idx, m_name in enumerate(month_names, 1):
                    if m_name.startswith(p) and len(p) >= 3:
                        joining_month = idx
                        break
            for p in parts:
                if p.isdigit() and len(p) == 4:
                    joining_year = int(p)
                    break
    elif family.created_at:
        joining_year = family.created_at.year
        joining_month = family.created_at.month

    years_diff = current_year - joining_year
    applicable_months = (years_diff * 12) + (current_month - joining_month + 1)
    if applicable_months < 1:
        applicable_months = 1

    monthly_rate = family.monthly_santha or 500.0
    required_since_joining = applicable_months * monthly_rate

    fam_cols = [c for c in collections if c.family_id == family.id]
    total_paid = sum(c.amount for c in fam_cols)

    month_name_curr = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][current_month - 1]
    current_month_paid = sum(c.amount for c in fam_cols if c.month == month_name_curr and c.year == current_year)
    previous_months_paid = max(0.0, total_paid - current_month_paid)

    previous_applicable_months = max(0, applicable_months - 1)
    previous_required_amount = previous_applicable_months * monthly_rate

    previous_arrears = max(0.0, previous_required_amount - previous_months_paid)
    current_month_due = max(0.0, monthly_rate - current_month_paid)

    total_unpaid = max(0.0, required_since_joining - total_paid)

    if total_unpaid <= 0:
        payment_status = "Paid in Full"
    elif total_paid > 0:
        payment_status = "Partial Dues Pending"
    else:
        payment_status = "Overdue / Arrears"

    return {
        "joining_date": joining_date_str or (family.created_at.strftime("%Y-%m-%d") if family.created_at else "—"),
        "monthly_santha": monthly_rate,
        "applicable_months": applicable_months,
        "required_since_joining": required_since_joining,
        "total_paid": total_paid,
        "current_month_due": current_month_due,
        "previous_arrears": previous_arrears,
        "pending_amount": total_unpaid,
        "payment_status": payment_status
    }


@router.get("/family-statements")
async def get_family_statements(db: Session = Depends(get_db)):
    """
    Get complete family financial & membership statements from PostgreSQL database.
    Calculates required dues strictly starting from Joining Date.
    """
    families = db.query(Family).all()
    collections = db.query(SanthaCollection).all()
    statements = []

    for f in families:
        members = db.query(FamilyMember).filter(FamilyMember.family_id == f.id).all()
        ledger = compute_family_statement_ledger(f, collections)

        member_list = [
            {
                "id": m.id,
                "member_code": m.member_code or f"M-{f.id:04d}-{m.id}",
                "full_name": m.full_name,
                "gender": m.gender or "Male",
                "dob": m.dob or "—",
                "mobile_number": m.mobile_number or f.mobile_number or "—",
                "marital_status": m.marital_status or "Single",
                "relationship_type": m.relationship_type or "Member",
                "status": m.status or "Active",
                "occupation": m.occupation or "—",
                "education": m.education or "—",
                "email": m.email or "—",
                "document_name": m.document_name or "—",
                "is_head": m.is_head,
                "paid_amount": ledger["total_paid"] if m.is_head else 0.0,
                "payment_status": "Paid" if ledger["pending_amount"] <= 0 else ("Partial" if ledger["total_paid"] > 0 else "Pending")
            }
            for m in members
        ]

        statements.append({
            "family_id": f.id,
            "family_code": f.family_code,
            "family_name": f.family_name,
            "head_name": f.head_name,
            "mobile_number": f.mobile_number or "—",
            "house_no": f.house_no or "",
            "street": f.street or "",
            "area": f.area or "Tenkasi",
            "city": f.city or "Tenkasi",
            "pin_code": f.pin_code or "",
            "landmark": f.landmark or "",
            "joining_date": ledger["joining_date"],
            "monthly_santha": ledger["monthly_santha"],
            "applicable_months": ledger["applicable_months"],
            "annual_required": ledger["required_since_joining"],
            "total_paid": ledger["total_paid"],
            "current_month_due": ledger["current_month_due"],
            "previous_arrears": ledger["previous_arrears"],
            "pending_amount": ledger["pending_amount"],
            "payment_status": ledger["payment_status"],
            "family_status": f.status or "Active",
            "is_poor_family": f.is_poor_family or False,
            "member_count": len(members) if members else (f.member_count or 1),
            "members": member_list
        })

    return statements

@router.get("/functions")
async def get_community_functions(db: Session = Depends(get_db)):
    """
    Get community functions & charges list from PostgreSQL database.
    """
    functions = db.query(CommunityFunction).order_by(CommunityFunction.id.desc()).all()
    return [
        {
            "id": f.id,
            "function_no": f.function_no or f"FUN-260{f.id}",
            "family_id": f.family_id,
            "family_name": f.family_name,
            "function_type": f.function_type or "Marriage Function",
            "function_title": f.function_title or f.function_type or "Community Function",
            "member_name": f.member_name or "—",
            "contact_number": f.contact_number or "—",
            "event_date": f.event_date or "—",
            "amount": f.amount or 0.0,
            "paid_amount": f.paid_amount or 0.0,
            "balance": f.balance if f.balance is not None else max(0.0, (f.amount or 0.0) - (f.paid_amount or 0.0)),
            "payment_method": f.payment_method or "Cash",
            "receipt_no": f.receipt_no or f"RCP-260{f.id}",
            "formalities": f.formalities or "Committee Verification",
            "notes": f.notes or "",
            "status": f.status or "Paid",
            "created_at": f.created_at
        }
        for f in functions
    ]

@router.post("/functions")
async def create_community_function(
    payload: CommunityFunctionCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new Function Charge in PostgreSQL database.
    """
    try:
        count = db.query(CommunityFunction).count()
        fun_code = f"FUN-{2601 + count}"
        rcp_code = payload.receipt_no or f"RCP-{2601 + count}"

        amount = payload.amount or 0.0
        paid = payload.paid_amount or 0.0
        balance = max(0.0, amount - paid)

        if payload.status and payload.status not in ["Draft", "Select Status"]:
            computed_status = payload.status
        else:
            if balance <= 0 and amount > 0:
                computed_status = "Paid"
            elif paid > 0:
                computed_status = "Partial"
            else:
                computed_status = "Draft"

        new_func = CommunityFunction(
            function_no=fun_code,
            family_id=payload.family_id,
            family_name=payload.family_name,
            function_type=payload.function_type or "Marriage Function",
            function_title=payload.function_title or f"{payload.function_type or 'Function'} for {payload.family_name}",
            member_name=payload.member_name,
            contact_number=payload.contact_number,
            event_date=payload.event_date or datetime.now().strftime("%d %b %Y"),
            amount=amount,
            paid_amount=paid,
            balance=balance,
            payment_method=payload.payment_method or "Cash",
            receipt_no=rcp_code,
            formalities=payload.formalities or "Committee Verification",
            notes=payload.notes,
            status=computed_status
        )

        db.add(new_func)
        db.commit()
        db.refresh(new_func)

        return new_func
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create function charge record: {str(e)}"
        )

@router.put("/functions/{function_id}")
async def update_community_function(
    function_id: int,
    payload: CommunityFunctionCreate,
    db: Session = Depends(get_db)
):
    """
    Update an existing Function Charge in PostgreSQL database.
    """
    try:
        func = db.query(CommunityFunction).filter(CommunityFunction.id == function_id).first()
        if not func:
            raise HTTPException(status_code=404, detail="Function charge record not found")

        amount = payload.amount or 0.0
        paid = payload.paid_amount or 0.0
        balance = max(0.0, amount - paid)

        if payload.status and payload.status not in ["Draft", "Select Status"]:
            computed_status = payload.status
        else:
            if balance <= 0 and amount > 0:
                computed_status = "Paid"
            elif paid > 0:
                computed_status = "Partial"
            else:
                computed_status = "Draft"

        func.family_id = payload.family_id
        func.family_name = payload.family_name
        func.function_type = payload.function_type or func.function_type
        func.function_title = payload.function_title or f"{payload.function_type or 'Function'} for {payload.family_name}"
        func.member_name = payload.member_name
        func.contact_number = payload.contact_number
        func.event_date = payload.event_date or func.event_date
        func.amount = amount
        func.paid_amount = paid
        func.balance = balance
        func.payment_method = payload.payment_method or func.payment_method
        if payload.receipt_no:
            func.receipt_no = payload.receipt_no
        func.formalities = payload.formalities
        func.notes = payload.notes
        func.status = computed_status

        db.commit()
        db.refresh(func)

        return func
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update function charge record: {str(e)}"
        )


@router.get("/family-activity/{family_id}")
async def get_family_activity_detail(family_id: int, db: Session = Depends(get_db)):
    """
    Fetch comprehensive family history, head succession, member roster & changes,
    santha collection payments (only actual paid entries), and function/marriage records.
    """
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family record not found.")

    # 1. Family Members
    members = db.query(FamilyMember).filter(FamilyMember.family_id == family_id).order_by(FamilyMember.id.asc()).all()

    # 2. Head Succession Changes
    head_changes = db.query(FamilyHeadChange).filter(FamilyHeadChange.family_id == family_id).order_by(FamilyHeadChange.id.desc()).all()

    # 3. Actual Santha Collections (only actual payments made)
    collections = db.query(SanthaCollection).filter(
        SanthaCollection.family_id == family_id,
        SanthaCollection.amount > 0
    ).order_by(SanthaCollection.id.desc()).all()

    # 4. Community Functions / Marriage Records
    functions = db.query(CommunityFunction).filter(
        CommunityFunction.family_id == family_id
    ).order_by(CommunityFunction.id.desc()).all()

    # 5. Member Requests
    requests = db.query(MemberRequest).filter(
        MemberRequest.family_name.ilike(f"%{family.family_name}%")
    ).order_by(MemberRequest.id.desc()).all()

    # Previous head determination
    prev_head = "—"
    if head_changes:
        for hc in head_changes:
            if hc.old_head and hc.old_head not in ["Initial Registration", "—", family.head_name]:
                prev_head = hc.old_head
                break

    return {
        "family": {
            "id": family.id,
            "family_code": family.family_code,
            "family_name": family.family_name,
            "head_name": family.head_name,
            "first_name": family.first_name or "",
            "last_name": family.last_name or "",
            "gender": family.gender or "Male",
            "dob": family.dob or "—",
            "mobile_number": family.mobile_number or "—",
            "joining_date": family.joining_date or "—",
            "relationship_type": family.relationship_type or "Family Head",
            "aadhar_ref": family.aadhar_ref or "—",
            "house_no": family.house_no or "",
            "street": family.street or "",
            "area": family.area or "Tenkasi",
            "city": family.city or "Tenkasi",
            "pin_code": family.pin_code or "627811",
            "landmark": family.landmark or "",
            "member_count": len(members) if members else (family.member_count or 1),
            "monthly_santha": family.monthly_santha or 500.0,
            "pending_amount": family.pending_amount or 0.0,
            "collected_amount": family.collected_amount or 0.0,
            "is_poor_family": family.is_poor_family or False,
            "status": family.status or "Active",
            "created_at": family.created_at,
            "previous_head": prev_head
        },
        "members": [
            {
                "id": m.id,
                "member_code": m.member_code or f"M-{family.family_code.replace('F-', '')}-{m.id}",
                "full_name": m.full_name,
                "gender": m.gender or "Male",
                "dob": m.dob or "—",
                "mobile_number": m.mobile_number or family.mobile_number or "—",
                "marital_status": m.marital_status or "Single",
                "relationship_type": m.relationship_type or "Member",
                "status": m.status or "Active",
                "occupation": m.occupation or "—",
                "education": m.education or "—",
                "email": m.email or "—",
                "is_head": m.is_head,
                "date_added": m.created_at.strftime("%d-%b-%Y") if m.created_at else "Initial Reg",
                "date_removed": "—" if (m.status or "Active") == "Active" else "Transferred / Inactive"
            }
            for m in members
        ],
        "head_changes": [
            {
                "id": hc.id,
                "family_name": hc.family_name,
                "old_head": hc.old_head,
                "new_head": hc.new_head,
                "reason": hc.reason or "Family Head Leadership Transfer",
                "old_details": hc.old_details,
                "new_details": hc.new_details,
                "changed_by": hc.changed_by or "Admin User",
                "change_date": hc.changed_at.strftime("%d-%b-%Y") if hc.changed_at else "—",
                "change_time": hc.changed_at.strftime("%H:%M:%S") if hc.changed_at else "—"
            }
            for hc in head_changes
        ],
        "collections": [
            {
                "id": c.id,
                "collection_date": c.payment_date or (c.created_at.strftime("%d-%b-%Y") if c.created_at else "—"),
                "member_name": c.head_name or family.head_name,
                "amount": c.amount,
                "payment_method": c.payment_method or "Cash",
                "financial_account": c.financial_account or "Main Cash",
                "receipt_no": c.receipt_no or f"SAN-REC-{c.id:04d}",
                "allocation": c.allocation or "Main Account"
            }
            for c in collections
        ],
        "functions": [
            {
                "id": f.id,
                "function_no": f.function_no or f"FUN-260{f.id}",
                "function_type": f.function_type or "Marriage Function",
                "function_title": f.function_title or f.function_type,
                "member_name": f.member_name or family.head_name,
                "contact_number": f.contact_number or family.mobile_number or "—",
                "event_date": f.event_date or "—",
                "amount": f.amount or 0.0,
                "paid_amount": f.paid_amount or 0.0,
                "balance": f.balance or 0.0,
                "payment_method": f.payment_method or "Cash",
                "receipt_no": f.receipt_no or "—",
                "status": f.status or "Paid"
            }
            for f in functions
        ],
        "requests": [
            {
                "id": r.id,
                "member_name": r.member_name,
                "request_type": r.request_type,
                "details": r.details or "Family member record change",
                "status": r.status or "Approved",
                "date": r.requested_at.strftime("%d-%b-%Y") if r.requested_at else "—"
            }
            for r in requests
        ]
    }


@router.get("/notifications")
async def get_notifications(db: Session = Depends(get_db)):
    """
    Get aggregated live system notifications across all modules in PostgreSQL.
    """
    items = []

    # 0. Santha Due Date Alerts & 4-Day Advance Notifications
    all_families = db.query(Family).all()
    today_dt = datetime.now()
    cur_day = today_dt.day
    cur_month_str = today_dt.strftime("%B")
    cur_year_num = today_dt.year

    for fam in all_families:
        due_d = fam.santha_due_day or 20
        fam_cols = db.query(SanthaCollection).filter(
            SanthaCollection.family_id == fam.id,
            SanthaCollection.month == cur_month_str,
            SanthaCollection.year == cur_year_num
        ).all()
        month_paid = sum(c.amount for c in fam_cols)
        is_paid = month_paid >= (fam.monthly_santha or 500.0)

        if not is_paid:
            days_diff = due_d - cur_day
            if cur_day == due_d:
                items.append({
                    "id": f"due-today-{fam.id}",
                    "type": "Payment",
                    "iconType": "rupee",
                    "title": "Monthly Santha Due Today",
                    "description": f"{fam.family_name}: Monthly Santha payment of ₹{int(fam.monthly_santha or 500)} is due today ({due_d}th {cur_month_str[:3]})!",
                    "timestamp": "Today",
                    "badgeColor": "bg-amber-50 text-amber-700 border-amber-200 font-extrabold",
                    "details": {
                        "family": fam.family_name,
                        "headName": fam.head_name,
                        "monthlySantha": f"₹{fam.monthly_santha or 500}",
                        "dueDate": f"{due_d}th of every month",
                        "status": "Due Today"
                    }
                })
            elif 0 < days_diff <= 4:
                items.append({
                    "id": f"due-soon-{fam.id}",
                    "type": "Payment",
                    "iconType": "rupee",
                    "title": "Upcoming Santha Payment Alert",
                    "description": f"{fam.family_name}: Monthly Santha payment of ₹{int(fam.monthly_santha or 500)} is due in {days_diff} days ({due_d}th {cur_month_str[:3]}).",
                    "timestamp": f"{days_diff} days left",
                    "badgeColor": "bg-sky-50 text-sky-700 border-sky-200 font-bold",
                    "details": {
                        "family": fam.family_name,
                        "headName": fam.head_name,
                        "monthlySantha": f"₹{fam.monthly_santha or 500}",
                        "dueDate": f"{due_d}th of every month",
                        "status": f"Due in {days_diff} days"
                    }
                })
            elif cur_day > due_d:
                overdue_days = cur_day - due_d
                items.append({
                    "id": f"overdue-{fam.id}",
                    "type": "Payment",
                    "iconType": "rupee",
                    "title": "Overdue Santha Arrears Alert",
                    "description": f"{fam.family_name}: Monthly Santha payment of ₹{int(fam.monthly_santha or 500)} is overdue by {overdue_days} days.",
                    "timestamp": f"{overdue_days} days overdue",
                    "badgeColor": "bg-rose-50 text-rose-700 border-rose-200 font-extrabold",
                    "details": {
                        "family": fam.family_name,
                        "headName": fam.head_name,
                        "monthlySantha": f"₹{fam.monthly_santha or 500}",
                        "dueDate": f"{due_d}th of every month",
                        "status": f"Overdue / Arrears ({overdue_days} days past due)"
                    }
                })

    # 1. Santha Collections (Payment)
    santha = db.query(SanthaCollection).order_by(SanthaCollection.id.desc()).limit(20).all()
    for s in santha:
        items.append({
            "id": f"santha-{s.id}",
            "type": "Payment",
            "iconType": "rupee",
            "title": "Online Santha Payment",
            "description": f"{s.family_name} paid ₹{s.amount:,.0f} Santha via {s.payment_method or 'Cash'}.",
            "timestamp": s.payment_date or (s.created_at.strftime("%d %b %Y, %H:%M") if s.created_at else "Recent"),
            "badgeColor": "bg-emerald-50 text-emerald-600 border-emerald-200",
            "details": {
                "family": s.family_name,
                "amount": f"₹{s.amount:,.2f}",
                "paymentMethod": s.payment_method or "Cash",
                "txnId": s.receipt_no or f"REC-{s.id}",
                "date": s.payment_date or (s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else "—")
            }
        })

    # 2. Juma Collections (Payment)
    juma = db.query(JumaCollection).order_by(JumaCollection.id.desc()).limit(15).all()
    for j in juma:
        items.append({
            "id": f"juma-{j.id}",
            "type": "Payment",
            "iconType": "rupee",
            "title": "Jumma Jamaat Collection",
            "description": f"{j.donor_name or 'Friday Jamaat'} contributed ₹{j.amount:,.0f} for Friday Prayer.",
            "timestamp": j.collection_date or "Recent",
            "badgeColor": "bg-emerald-50 text-emerald-600 border-emerald-200",
            "details": {
                "family": j.donor_name or "Friday Jamaat",
                "amount": f"₹{j.amount:,.2f}",
                "paymentMethod": "Cash",
                "txnId": j.receipt_no or f"JUM-{j.id}",
                "date": j.collection_date or "—"
            }
        })

    # 3. Donations (Payment)
    donations = db.query(Donation).order_by(Donation.id.desc()).limit(15).all()
    for d in donations:
        items.append({
            "id": f"donation-{d.id}",
            "type": "Payment",
            "iconType": "rupee",
            "title": d.category or "General Donation",
            "description": f"{d.donor_name or 'Anonymous Donor'} contributed ₹{d.amount:,.0f} ({d.category or 'Donation'}).",
            "timestamp": d.donation_date or "Recent",
            "badgeColor": "bg-emerald-50 text-emerald-600 border-emerald-200",
            "details": {
                "family": d.donor_name or "Anonymous Donor",
                "amount": f"₹{d.amount:,.2f}",
                "paymentMethod": d.payment_method or "Cash",
                "txnId": d.receipt_no or f"DON-{d.id}",
                "date": d.donation_date or "—"
            }
        })

    # 4. Community Functions (Function)
    functions = db.query(CommunityFunction).order_by(CommunityFunction.id.desc()).limit(15).all()
    for f in functions:
        items.append({
            "id": f"func-{f.id}",
            "type": "Function",
            "iconType": "plus",
            "title": f.function_type or "Community Function",
            "description": f"{f.family_name or f.member_name or 'Family'} submitted a {f.function_type or 'function'} request.",
            "timestamp": f.event_date or "Recent",
            "badgeColor": "bg-sky-50 text-sky-600 border-sky-200",
            "details": {
                "family": f.family_name or f.member_name or "Family",
                "functionType": f.function_type or "Community Function",
                "preferredDate": f.event_date or "—",
                "contact": f.contact_number or "—",
                "status": f.status or "Scheduled"
            }
        })

    # 5. Family Members (Member)
    members = db.query(FamilyMember).order_by(FamilyMember.id.desc()).limit(15).all()
    for m in members:
        fam_name = m.family.family_name if m.family else "Family"
        items.append({
            "id": f"mem-{m.id}",
            "type": "Member",
            "iconType": "user",
            "title": "New Family Member",
            "description": f"{fam_name} added {m.full_name} as a family member ({m.relationship_type or 'Member'}).",
            "timestamp": m.created_at.strftime("%d %b %Y, %H:%M") if m.created_at else "Recent",
            "badgeColor": "bg-blue-50 text-blue-600 border-blue-200",
            "details": {
                "family": fam_name,
                "newMember": m.full_name,
                "relation": m.relationship_type or "Member",
                "dateAdded": m.created_at.strftime("%d %b %Y") if m.created_at else "Recent",
                "status": m.status or "Verified"
            }
        })

    # 6. Head Changes (Member)
    head_changes = db.query(FamilyHeadChange).order_by(FamilyHeadChange.id.desc()).limit(15).all()
    for hc in head_changes:
        items.append({
            "id": f"hc-{hc.id}",
            "type": "Member",
            "iconType": "user",
            "title": "Family Head Record Update",
            "description": f"{hc.family_name}: {hc.reason or 'Family head record updated'}.",
            "timestamp": hc.changed_at.strftime("%d %b %Y, %H:%M") if hc.changed_at else "Recent",
            "badgeColor": "bg-blue-50 text-blue-600 border-blue-200",
            "details": {
                "family": hc.family_name,
                "oldHead": hc.old_head,
                "newHead": hc.new_head,
                "changedBy": hc.changed_by or "Admin User",
                "date": hc.changed_at.strftime("%d %b %Y, %H:%M") if hc.changed_at else "Recent"
            }
        })

    # 7. Member Requests (Booking)
    requests = db.query(MemberRequest).order_by(MemberRequest.id.desc()).limit(10).all()
    for r in requests:
        items.append({
            "id": f"req-{r.id}",
            "type": "Booking",
            "iconType": "building",
            "title": "Member Request",
            "description": f"{r.family_name} submitted request for {r.member_name} ({r.request_type}).",
            "timestamp": r.requested_at.strftime("%d %b %Y") if r.requested_at else "Recent",
            "badgeColor": "bg-indigo-50 text-indigo-600 border-indigo-200",
            "details": {
                "family": r.family_name,
                "requestType": r.request_type,
                "member": r.member_name,
                "status": r.status or "Pending"
            }
        })

    return {
        "count": len(items),
        "notifications": items
    }
