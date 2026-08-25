from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.masjid import Masjid
from app.schemas.masjid import MasjidResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/masjids", tags=["Masjids Information"])

@router.get("", response_model=List[MasjidResponse])
async def list_approved_masjids(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns list of active/approved Masjids.
    """
    masjids = db.query(Masjid).filter(Masjid.status == "active").order_by(Masjid.created_at.desc()).all()
    return masjids

@router.get("/{masjid_id}", response_model=MasjidResponse)
async def get_masjid_by_id(
    masjid_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns single Masjid details.
    """
    masjid = db.query(Masjid).filter(Masjid.id == masjid_id).first()
    if not masjid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Masjid not found.")
    return masjid
