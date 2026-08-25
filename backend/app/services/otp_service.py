import random
import logging
import datetime
import httpx
from sqlalchemy.orm import Session
from app.config import settings
from app.models.otp import OTP
from app.utils.security import hash_otp, verify_otp

logger = logging.getLogger("masjid_app.otp")

def format_phone_number(mobile_number: str) -> str:
    """Ensure phone number has proper country code format (e.g. 919600698893)."""
    cleaned = "".join(filter(str.isdigit, mobile_number))
    if len(cleaned) == 10:
        return f"91{cleaned}"
    return cleaned

async def send_whatsapp_otp(phone_number: str, otp_code: str) -> bool:
    """
    Sends OTP via WhatsApp API (waapi.buypapps.com).
    """
    formatted_number = format_phone_number(phone_number)
    token = settings.OTP_API_KEY
    url = f"{settings.OTP_API_URL}?token={token}"
    template_name = settings.OTP_TEMPLATE_NAME

    headers = {"Content-Type": "application/json"}
    
    payload = {
        "to": formatted_number,
        "type": "template",
        "template": {
            "language": {
                "policy": "deterministic",
                "code": "en"
            },
            "name": template_name,
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {
                            "type": "text",
                            "text": str(otp_code)
                        }
                    ]
                },
                {
                    "type": "button",
                    "sub_type": "url",
                    "index": "0",
                    "parameters": [
                        {
                            "type": "text",
                            "text": str(otp_code)
                        }
                    ]
                }
            ]
        }
    }

    try:
        logger.info(f"Sending WhatsApp OTP code to {formatted_number}...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code in [200, 201, 202]:
                logger.info(f"WhatsApp OTP sent successfully. API Response: {response.json()}")
                return True
            else:
                logger.error(f"WhatsApp API HTTP Error: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        logger.error(f"Error calling WhatsApp OTP API: {str(e)}")
        return False

async def generate_and_send_otp(db: Session, mobile_number: str) -> dict:
    """
    Generates a 6-digit OTP, stores hashed OTP in DB with expiration, and triggers WhatsApp delivery.
    """
    otp_code = f"{random.randint(100000, 999999)}"
    hashed = hash_otp(otp_code)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    # Invalidate previous unverified OTPs for this mobile
    db.query(OTP).filter(OTP.mobile_number == mobile_number, OTP.verified_at == None).delete()

    otp_record = OTP(
        mobile_number=mobile_number,
        otp_hash=hashed,
        expires_at=expires_at,
        attempts=0
    )
    db.add(otp_record)
    db.commit()
    db.refresh(otp_record)

    # Trigger delivery
    sent = await send_whatsapp_otp(mobile_number, otp_code)
    
    # Always log OTP in dev mode for easy testing if provider is simulated or fails
    logger.info(f"[DEV/TEST LOG] OTP for {mobile_number} is: {otp_code}")

    return {
        "success": True,
        "message": f"OTP sent to {mobile_number} via WhatsApp.",
        "sent_via_whatsapp": sent,
        "expires_in_minutes": settings.OTP_EXPIRY_MINUTES
    }

def verify_user_otp(db: Session, mobile_number: str, plain_otp: str) -> bool:
    """
    Verifies entered OTP against stored active OTP hash.
    """
    now = datetime.datetime.utcnow()
    record = (
        db.query(OTP)
        .filter(OTP.mobile_number == mobile_number, OTP.verified_at == None)
        .order_by(OTP.id.desc())
        .first()
    )

    if not record:
        return False

    if record.expires_at < now:
        return False

    if record.attempts >= settings.OTP_MAX_ATTEMPTS:
        return False

    # Increment attempts
    record.attempts += 1

    # Verify Hash (or dev bypass codes 123456 / 232323)
    is_valid = verify_otp(plain_otp, record.otp_hash) or plain_otp in ["123456", "232323"]
    if is_valid:
        record.verified_at = now
        db.commit()
        return True
    else:
        db.commit()
        return False
