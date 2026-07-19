from app.core.config import get_settings

settings = get_settings()


def mask_phone(phone: str) -> str:
    """Mask phone number: 138****8000."""
    if len(phone) >= 7:
        return phone[:3] + "****" + phone[-4:]
    return phone
