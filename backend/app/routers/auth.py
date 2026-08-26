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


def build_user_info(masjid: Masjid):
    return {
        "masjid_id": masjid.id,
        "masjid_name": masjid.masjid_name,
        "mobile_number": masjid.mobile_number,
        "email": masjid.admin_email or masjid.email,
        "city": masjid.city,
        "admin_name": masjid.admin_name or masjid.masjid_name,
        "full_name": masjid.admin_name or masjid.masjid_name,
        "admin_role": masjid.admin_role or "Administrator",
        "admin_mobile": masjid.admin_mobile or masjid.mobile_number,
        "profile_photo": masjid.profile_photo or None,
        "account_created_at": masjid.created_at,
    }


def find_active_masjid_for_mobile(db: Session, mobile: str):
    """Resolve the login identity from the exact mobile used for authentication.

    Primary Masjid mobile numbers are checked first. Admin mobile is only used
    when no primary-mobile match exists. Ambiguous matches are rejected rather
    than silently selecting another user's account.
    """
    primary_matches = db.query(Masjid).filter(
        Masjid.mobile_number == mobile,
        Masjid.status == "active"
    ).all()
    if len(primary_matches) == 1:
        return primary_matches[0]
    if len(primary_matches) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Multiple active accounts use this mobile number. Please contact the administrator."
        )

    admin_matches = db.query(Masjid).filter(
        Masjid.admin_mobile == mobile,
        Masjid.status == "active"
    ).all()
    if len(admin_matches) == 1:
        return admin_matches[0]
    if len(admin_matches) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Multiple active accounts use this mobile number. Please contact the administrator."
        )
    return None


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def public_signup(payload: SignupCreate, db: Session = Depends(get_db)):
    """Public Signup Endpoint for Masjids."""
    cleaned_mobile = payload.mobile_number

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
    """Send an OTP only for the uniquely resolved active account."""
    cleaned_mobile = payload.mobile_number
    approved_masjid = find_active_masjid_for_mobile(db, cleaned_mobile)

    if not approved_masjid:
        pending = db.query(SignupRequest).filter(
            (SignupRequest.mobile_number == cleaned_mobile) | (SignupRequest.admin_mobile == cleaned_mobile),
            SignupRequest.status == SignupStatus.PENDING.value
        ).first()
        if pending:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your registration request is still pending admin approval. You will be notified once approved."
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered or approved Masjid account found with this mobile number. Please sign up first."
        )

    return await generate_and_send_otp(db, cleaned_mobile)


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_and_login(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verify OTP and issue a JWT bound to the exact Masjid account that logged in."""
    cleaned_mobile = payload.mobile_number
    approved_masjid = find_active_masjid_for_mobile(db, cleaned_mobile)

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

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role="user",
        user_info=build_user_info(approved_masjid)
    )


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return only the Masjid represented by the authenticated JWT subject."""
    masjid_id = current_user.get("sub")
    if not masjid_id or not str(masjid_id).isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user identity in authentication token.")

    masjid = db.query(Masjid).filter(
        Masjid.id == int(masjid_id),
        Masjid.status == "active"
    ).first()
    if not masjid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated account is no longer active.")

    return {
        "user": current_user,
        "user_info": build_user_info(masjid),
        "masjid": masjid
    }


@router.put("/profile")
async def update_user_profile(
    payload: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update only the account represented by the authenticated JWT subject."""
    masjid_id = current_user.get("sub")
    if not masjid_id or not str(masjid_id).isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user identity in authentication token.")

    masjid = db.query(Masjid).filter(
        Masjid.id == int(masjid_id),
        Masjid.status == "active"
    ).first()
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

    return {
        "message": "Profile updated successfully",
        "user_info": build_user_info(masjid)
    }


@router.get("/logged-in-users")
async def get_logged_in_users(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return only the authenticated user's account, never other Masjid accounts."""
    masjid_id = current_user.get("sub")
    if not masjid_id or not str(masjid_id).isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user identity in authentication token.")

    masjid = db.query(Masjid).filter(
        Masjid.id == int(masjid_id),
        Masjid.status == "active"
    ).first()
    if not masjid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated account is no longer active.")

    info = build_user_info(masjid)
    return {
        "users": [{
            **info,
            "id": masjid.id,
            "is_current": True,
            "status": "Online"
        }]
    }
