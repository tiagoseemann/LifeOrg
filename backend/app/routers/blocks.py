from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.block import CalendarBlock
from app.schemas.block import BlockCreate, BlockUpdate, BlockOut

router = APIRouter(prefix="/api/blocks", tags=["blocks"])


@router.get("", response_model=list[BlockOut])
def list_blocks(
    week_start: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(CalendarBlock)
    if week_start:
        try:
            start = date.fromisoformat(week_start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid week_start format. Use YYYY-MM-DD")
        end = start + timedelta(days=7)
        q = q.filter(
            CalendarBlock.start_datetime >= start.isoformat(),
            CalendarBlock.start_datetime < end.isoformat(),
        )
    return q.order_by(CalendarBlock.start_datetime).all()


@router.post("", response_model=BlockOut, status_code=201)
def create_block(payload: BlockCreate, db: Session = Depends(get_db)):
    if payload.card_id:
        existing = db.query(CalendarBlock).filter(
            CalendarBlock.card_id == payload.card_id
        ).first()
        if existing:
            existing.card_id = None
    block = CalendarBlock(**payload.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@router.patch("/{block_id}", response_model=BlockOut)
def update_block(block_id: str, payload: BlockUpdate, db: Session = Depends(get_db)):
    block = db.get(CalendarBlock, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    data = payload.model_dump(exclude_unset=True)
    if "card_id" in data and data["card_id"] and data["card_id"] != block.card_id:
        existing = db.query(CalendarBlock).filter(
            CalendarBlock.card_id == data["card_id"],
            CalendarBlock.id != block_id,
        ).first()
        if existing:
            existing.card_id = None
    for field, value in data.items():
        setattr(block, field, value)
    db.commit()
    db.refresh(block)
    return block


@router.delete("/{block_id}", status_code=204)
def delete_block(block_id: str, db: Session = Depends(get_db)):
    block = db.get(CalendarBlock, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    db.delete(block)
    db.commit()
