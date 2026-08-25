import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.signup_request import SignupRequest, SignupStatus
from app.models.masjid import Masjid
from app.schemas.auth import (
    SignupCreate, SignupResponse, SendOTPRequest, VerifyOTPRequest, TokenResponse, ProfileUpdate
)
from app.services.webhook_service import send_signup_webhook
from app.services.otp_service import generate_and_send_otp, verify_user_otp
from app.utils.security import create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Public Authentication & Signup"])
logger = logging.getLogger("masjid_app.auth_router")

@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def public_signup(payload: SignupCreate, db: Session = Depends(get_db)):
    """
    Public Signup Endpoint for Masjids.
    Saves signup request with all extended fields, triggers webhook, and notifies the user.
    """
    cleaned_mobile = payload.mobile_number
    
    # Check existing signup request
    existing_request = db.query(SignupRequest).filter(
        SignupRequest.mobile_number == cleaned_mobile,
        SignupRequest.status.in_([SignupStatus.PENDING.value, SignupStatus.APPROVED.value])
    ).first()

    if existing_request:
        if existing_request.status == SignupStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A registration for this mobile number has already been approved. Please proceed to Login."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A signup request for this mobile number is already pending administrator review."
            )

    new_request = SignupRequest(
        mobile_number=cleaned_mobile,
        masjid_name=payload.masjid_name.strip(),
        street=payload.street.strip(),
        city=payload.city.strip(),
        email=payload.email.strip().lower(),
        
        # Extended fields from Signup UI
        masjid_reg_id=payload.masjid_reg_id.strip() if payload.masjid_reg_id else None,
        whatsapp_number=payload.whatsapp_number.strip() if payload.whatsapp_number else None,
        website=payload.website.strip() if payload.website else None,
        area_locality=payload.area_locality.strip() if payload.area_locality else None,
        pincode=payload.pincode.strip() if payload.pincode else None,
        state=payload.state.strip() if payload.state else None,
        country=payload.country.strip() if payload.country else "India",
        admin_name=payload.admin_name.strip() if payload.admin_name else None,
        admin_mobile=payload.admin_mobile.strip() if payload.admin_mobile else None,
        admin_email=payload.admin_email.strip() if payload.admin_email else None,
        admin_role=payload.admin_role.strip() if payload.admin_role else None,

        status=SignupStatus.PENDING.value
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    # Trigger Webhook asynchronously
    webhook_data = {
        "signup_request_id": new_request.id,
        "masjid_name": new_request.masjid_name,
        "masjid_reg_id": new_request.masjid_reg_id,
        "mobile_number": new_request.mobile_number,
        "whatsapp_number": new_request.whatsapp_number,
        "email": new_request.email,
        "website": new_request.website,
        "street": new_request.street,
        "area_locality": new_request.area_locality,
        "city": new_request.city,
        "pincode": new_request.pincode,
        "state": new_request.state,
        "country": new_request.country,
        "admin_name": new_request.admin_name,
        "admin_mobile": new_request.admin_mobile,
        "admin_email": new_request.admin_email,
        "admin_role": new_request.admin_role
    }
    
    asyncio.create_task(send_signup_webhook(webhook_data))

    return SignupResponse(
        id=new_request.id,
        mobile_number=new_request.mobile_number,
        masjid_name=new_request.masjid_name,
        street=new_request.street,
        city=new_request.city,
        email=new_request.email,
        status=new_request.status,
        message="Your Masjid registration request has been submitted successfully. Our administrator will review your details.",
        created_at=new_request.created_at
    )

@router.post("/send-otp")
async def send_otp(payload: SendOTPRequest, db: Session = Depends(get_db)):
    """
    Sends an OTP to the user's mobile number if approved by Admin.
    """
    cleaned_mobile = payload.mobile_number
    
    # Verify if mobile number belongs to an approved Masjid
    approved_masjid = db.query(Masjid).filter(
        (Masjid.mobile_number == cleaned_mobile) | (Masjid.admin_mobile == cleaned_mobile),
        Masjid.status == "active"
    ).first()

    if not approved_masjid:
        # Check if pending
        pending = db.query(SignupRequest).filter(
            (SignupRequest.mobile_number == cleaned_mobile) | (SignupRequest.admin_mobile == cleaned_mobile),
            SignupRequest.status == SignupStatus.PENDING.value
        ).first()

        if pending:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your registration request is still pending admin approval. You will be notified once approved."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No registered or approved Masjid account found with this mobile number. Please sign up first."
            )

    res = await generate_and_send_otp(db, cleaned_mobile)
    return res

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_and_login(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Verifies OTP and generates User JWT access token.
    """
    cleaned_mobile = payload.mobile_number
    
    approved_masjid = db.query(Masjid).filter(
        (Masjid.mobile_number == cleaned_mobile) | (Masjid.admin_mobile == cleaned_mobile),
        Masjid.status == "active"
    ).first()

    if not approved_masjid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not approved or active."
        )

    success = verify_user_otp(db, cleaned_mobile, payload.otp_code.strip())
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code. Please try again."
        )

    access_token = create_access_token(data={
        "sub": str(approved_masjid.id),
        "mobile_number": approved_masjid.mobile_number,
        "masjid_name": approved_masjid.masjid_name,
        "role": "user"
    })

    user_info = {
        "masjid_id": approved_masjid.id,
        "masjid_name": approved_masjid.masjid_name,
        "mobile_number": approved_masjid.mobile_number,
        "email": approved_masjid.admin_email or approved_masjid.email,
        "city": approved_masjid.city,
        "admin_name": approved_masjid.admin_name or approved_masjid.masjid_name,
        "full_name": approved_masjid.admin_name or approved_masjid.masjid_name,
        "admin_role": approved_masjid.admin_role or "Administrator",
        "admin_mobile": approved_masjid.admin_mobile or approved_masjid.mobile_number,
        "profile_photo": approved_masjid.profile_photo or None
    }

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role="user",
        user_info=user_info
    )

@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    masjid_id = current_user.get("sub")
    masjid = db.query(Masjid).filter(Masjid.id == int(masjid_id)).first() if masjid_id and str(masjid_id).isdigit() else None
    
    user_info = None
    if masjid:
        user_info = {
            "masjid_id": masjid.id,
            "masjid_name": masjid.masjid_name,
            "mobile_number": masjid.mobile_number,
            "email": masjid.admin_email or masjid.email,
            "city": masjid.city,
            "admin_name": masjid.admin_name or masjid.masjid_name,
            "full_name": masjid.admin_name or masjid.masjid_name,
            "admin_role": masjid.admin_role or "Administrator",
            "admin_mobile": masjid.admin_mobile or masjid.mobile_number,
            "profile_photo": masjid.profile_photo or None
        }

    return {
        "user": current_user,
        "user_info": user_info,
        "masjid": masjid
    }

@router.put("/profile")
async def update_user_profile(
    payload: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjid_id = current_user.get("sub")
    masjid = None
    if masjid_id and str(masjid_id).isdigit():
        masjid = db.query(Masjid).filter(Masjid.id == int(masjid_id)).first()
    
    if not masjid:
        masjid = db.query(Masjid).filter(Masjid.status == "active").first()

    if not masjid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Masjid account not found.")

    if payload.admin_name is not None:
        masjid.admin_name = payload.admin_name.strip()
    if payload.admin_email is not None:
        masjid.admin_email = payload.admin_email.strip()
    if payload.admin_role is not None:
        masjid.admin_role = payload.admin_role.strip()
    if payload.admin_mobile is not None:
        masjid.admin_mobile = payload.admin_mobile.strip()
    if payload.masjid_name is not None:
        masjid.masjid_name = payload.masjid_name.strip()
    if payload.city is not None:
        masjid.city = payload.city.strip()
    if payload.profile_photo is not None:
        masjid.profile_photo = payload.profile_photo

    db.commit()
    db.refresh(masjid)

    updated_user_info = {
        "masjid_id": masjid.id,
        "masjid_name": masjid.masjid_name,
        "mobile_number": masjid.mobile_number,
        "email": masjid.admin_email or masjid.email,
        "city": masjid.city,
        "admin_name": masjid.admin_name or masjid.masjid_name,
        "full_name": masjid.admin_name or masjid.masjid_name,
        "admin_role": masjid.admin_role or "Administrator",
        "admin_mobile": masjid.admin_mobile or masjid.mobile_number,
        "profile_photo": masjid.profile_photo or None
    }

    return {
        "message": "Profile updated successfully",
        "user_info": updated_user_info
    }

@router.get("/logged-in-users")
async def get_logged_in_users(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    masjids = db.query(Masjid).filter(Masjid.status == "active").all()
    active_users = []
    current_sub = current_user.get("sub")
    
    for m in masjids:
        is_current = str(m.id) == str(current_sub)
        active_users.append({
            "id": m.id,
            "admin_name": m.admin_name or m.masjid_name,
            "full_name": m.admin_name or m.masjid_name,
            "admin_role": m.admin_role or "Administrator",
            "masjid_name": m.masjid_name,
            "city": m.city,
            "email": m.admin_email or m.email,
            "mobile_number": m.admin_mobile or m.mobile_number,
            "profile_photo": m.profile_photo or None,
            "is_current": is_current,
            "status": "Online"
        })
    return {"users": active_users}

