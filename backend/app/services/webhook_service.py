import logging
import httpx
from typing import Dict, Any
from app.config import settings

logger = logging.getLogger("masjid_app.webhook")

async def send_signup_webhook(signup_data: Dict[str, Any]) -> bool:
    """
    Triggers the configured Zoho Cliq Webhook with full registration details formatted in markdown.
    Zoho Cliq strictly requires payload keys to be valid Cliq properties (text, bot) to avoid 'extra_key_found' errors.
    """
    webhook_url = settings.SIGNUP_WEBHOOK_URL
    if not webhook_url:
        logger.info("No SIGNUP_WEBHOOK_URL configured. Skipping webhook notification.")
        return True

    req_id = signup_data.get("signup_request_id")
    masjid_name = signup_data.get("masjid_name")
    masjid_reg_id = signup_data.get("masjid_reg_id") or "N/A"
    mobile_number = signup_data.get("mobile_number")
    whatsapp_number = signup_data.get("whatsapp_number") or mobile_number
    email = signup_data.get("email")
    website = signup_data.get("website") or "N/A"
    
    street = signup_data.get("street") or ""
    area = signup_data.get("area_locality") or ""
    city = signup_data.get("city") or ""
    pincode = signup_data.get("pincode") or ""
    state = signup_data.get("state") or ""
    country = signup_data.get("country") or "India"

    full_address = f"{street}"
    if area:
        full_address += f", {area}"
    full_address += f", {city}"
    if pincode:
        full_address += f" - {pincode}"
    if state:
        full_address += f", {state}"
    if country:
        full_address += f", {country}"

    admin_name = signup_data.get("admin_name") or "N/A"
    admin_mobile = signup_data.get("admin_mobile") or mobile_number
    admin_email = signup_data.get("admin_email") or email
    admin_role = signup_data.get("admin_role") or "Primary Administrator"

    # Construct rich markdown text message formatted for Zoho Cliq
    cliq_text = (
        f"🕌 *NEW MASJID REGISTRATION REQUEST #{req_id}*\n"
        f"--------------------------------------------------\n"
        f"🏢 *MASJID INFORMATION*\n"
        f"• *Masjid Name*: {masjid_name}\n"
        f"• *Registration / ID*: {masjid_reg_id}\n"
        f"• *Masjid Mobile*: {mobile_number}\n"
        f"• *WhatsApp Number*: {whatsapp_number}\n"
        f"• *Masjid Email*: {email}\n"
        f"• *Website*: {website}\n"
        f"• *Address*: {full_address}\n\n"
        f"👤 *ADMINISTRATOR / AUTHORIZED PERSON*\n"
        f"• *Full Name*: {admin_name}\n"
        f"• *Admin Mobile*: {admin_mobile}\n"
        f"• *Admin Email*: {admin_email}\n"
        f"• *Designation / Role*: {admin_role}\n\n"
        f"⏳ *Status*: Pending Admin Review\n"
        f"--------------------------------------------------"
    )

    # Strictly use valid Zoho Cliq properties to prevent 'extra_key_found' rejection
    payload = {
        "text": cliq_text,
        "bot": {
            "name": settings.WEBHOOK_BOT_NAME
        }
    }

    try:
        logger.info(f"Sending full registration message to Zoho Cliq Webhook...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook_url, json=payload)
            if response.status_code in [200, 201, 202, 204]:
                logger.info(f"Zoho Cliq Webhook delivered successfully! Status: {response.status_code}")
                return True
            else:
                logger.warning(f"Webhook returned status code {response.status_code}. Response: {response.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to deliver Zoho Cliq webhook: {str(e)}")
        return False
