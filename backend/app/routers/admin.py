import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.admin import Admin
from app.models.signup_request import SignupRequest, SignupStatus
from app.models.masjid import Masjid
from app.schemas.auth import AdminLogin, TokenResponse
from app.schemas.masjid import SignupRequestDetail, SignupStatusUpdate, MasjidResponse
from app.utils.security import (
    verify_password, create_access_token, get_current_admin
)

router = APIRouter(prefix="/api/admin", tags=["Admin Portal & Registration Management"])
logger = logging.getLogger("masjid_app.admin_router")

@router.post("/login", response_model=TokenResponse)
async def admin_login(payload: AdminLogin, db: Session = Depends(get_db)):
    """
    Admin authentication endpoint.
    Checks DB admin user or falls back to env configuration.
    """
    username = payload.username.strip()
    password = payload.password.strip()

    admin = db.query(Admin).filter(Admin.username == username).first()

    authenticated = False
    if admin:
        if verify_password(password, admin.hashed_password):
            authenticated = True
    elif username == settings.ADMIN_USERNAME and password == settings.ADMIN_PASSWORD:
        authenticated = True

    if not authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials. Please check your username and password."
        )

    access_token = create_access_token(data={
        "sub": username,
        "username": username,
        "role": "admin"
    })

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role="admin",
        user_info={"username": username}
    )

@router.get("/signup-requests", response_model=List[SignupRequestDetail])
async def list_signup_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    Retrieve all signup requests submitted by Masjids.
    Optionally filter by status (pending, approved, rejected) or search term.
    """
    query = db.query(SignupRequest)
    
    if status_filter:
        query = query.filter(SignupRequest.status == status_filter.lower())
        
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (SignupRequest.masjid_name.ilike(search_term)) |
            (SignupRequest.mobile_number.ilike(search_term)) |
            (SignupRequest.city.ilike(search_term)) |
            (SignupRequest.email.ilike(search_term))
        )

    requests = query.order_by(SignupRequest.created_at.desc()).all()
    return requests

@router.get("/signup-requests/{request_id}", response_model=SignupRequestDetail)
async def get_signup_request(
    request_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    Get detailed information for a single signup request.
    """
    req = db.query(SignupRequest).filter(SignupRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Signup request #{request_id} not found."
        )
    return req

@router.post("/signup-requests/{request_id}/approve", response_model=MasjidResponse)
async def approve_signup_request(
    request_id: int,
    payload: Optional[SignupStatusUpdate] = None,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    Approve a Masjid signup request:
    1. Store/Activate Masjid record in 'masjids' table.
    2. Update SignupRequest status to 'approved'.
    3. Prevents creating duplicate records.
    """
    req = db.query(SignupRequest).filter(SignupRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Signup request #{request_id} not found."
        )

    # Check if Masjid already exists
    existing_masjid = db.query(Masjid).filter(Masjid.mobile_number == req.mobile_number).first()
    
    if existing_masjid:
        existing_masjid.status = "active"
        existing_masjid.masjid_name = req.masjid_name
        existing_masjid.street = req.street
        existing_masjid.city = req.city
        existing_masjid.email = req.email
        existing_masjid.masjid_reg_id = req.masjid_reg_id
        existing_masjid.whatsapp_number = req.whatsapp_number
        existing_masjid.website = req.website
        existing_masjid.area_locality = req.area_locality
        existing_masjid.pincode = req.pincode
        existing_masjid.state = req.state
        existing_masjid.country = req.country
        existing_masjid.admin_name = req.admin_name
        existing_masjid.admin_mobile = req.admin_mobile
        existing_masjid.admin_email = req.admin_email
        existing_masjid.admin_role = req.admin_role
        masjid_record = existing_masjid
    else:
        masjid_record = Masjid(
            masjid_name=req.masjid_name,
            mobile_number=req.mobile_number,
            street=req.street,
            city=req.city,
            email=req.email,
            masjid_reg_id=req.masjid_reg_id,
            whatsapp_number=req.whatsapp_number,
            website=req.website,
            area_locality=req.area_locality,
            pincode=req.pincode,
            state=req.state,
            country=req.country,
            admin_name=req.admin_name,
            admin_mobile=req.admin_mobile,
            admin_email=req.admin_email,
            admin_role=req.admin_role,
            status="active",
            signup_request_id=req.id
        )
        db.add(masjid_record)

    # Update signup request
    req.status = SignupStatus.APPROVED.value
    if payload and payload.admin_notes:
        req.admin_notes = payload.admin_notes

    db.commit()
    db.refresh(masjid_record)
    db.refresh(req)

    logger.info(f"Admin approved signup request #{req.id} for Masjid '{req.masjid_name}'.")

    return masjid_record

@router.post("/signup-requests/{request_id}/reject", response_model=SignupRequestDetail)
async def reject_signup_request(
    request_id: int,
    payload: SignupStatusUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    Reject a Masjid signup request.
    """
    req = db.query(SignupRequest).filter(SignupRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Signup request #{request_id} not found."
        )

    req.status = SignupStatus.REJECTED.value
    if payload and payload.admin_notes:
        req.admin_notes = payload.admin_notes

    # If there was a masjid created, deactivate it
    masjid = db.query(Masjid).filter(Masjid.mobile_number == req.mobile_number).first()
    if masjid:
        masjid.status = "inactive"

    db.commit()
    db.refresh(req)

    logger.info(f"Admin rejected signup request #{req.id}.")

    return req

@router.get("/me")
async def get_admin_info(admin: dict = Depends(get_current_admin)):
    return {"admin": admin}
