from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.masjid import Masjid
from app.schemas.masjid import MasjidResponse
from app.utils.security import get_current_user, get_current_masjid_id

router = APIRouter(prefix="/api/masjids", tags=["Masjids Information"])

@router.get("", response_model=List[MasjidResponse])
async def list_approved_masjids(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns list of active/approved Masjids.
    Filtered to current user's authenticated masjid unless superadmin/admin role.
    """
    masjid_id = get_current_masjid_id(current_user)
    user_role = current_user.get("role", "user")
    
    if user_role in ["superadmin", "admin"]:
        masjids = db.query(Masjid).filter(Masjid.status == "active").order_by(Masjid.created_at.desc()).all()
    else:
        masjids = db.query(Masjid).filter(Masjid.id == masjid_id, Masjid.status == "active").all()
    return masjids

@router.get("/{masjid_id}", response_model=MasjidResponse)
async def get_masjid_by_id(
    masjid_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns single Masjid details. Ensures tenant isolation.
    """
    auth_masjid_id = get_current_masjid_id(current_user)
    user_role = current_user.get("role", "user")
    
    if user_role not in ["superadmin", "admin"] and auth_masjid_id != masjid_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this Masjid account.")

    masjid = db.query(Masjid).filter(Masjid.id == masjid_id).first()
    if not masjid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Masjid not found.")
    return masjid

