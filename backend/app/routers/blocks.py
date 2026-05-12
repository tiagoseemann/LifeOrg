import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.block import CalendarBlock
from app.schemas.block import BlockCreate, BlockUpdate, BlockOut
from app.services import google_calendar as gcal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/blocks", tags=["blocks"])


def _to_naive_utc(dt: datetime) -> datetime:
    """Normaliza datetime para naive UTC (convenção do banco)."""
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


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

    data = payload.model_dump()
    data["start_datetime"] = _to_naive_utc(data["start_datetime"])
    data["end_datetime"] = _to_naive_utc(data["end_datetime"])
    block = CalendarBlock(**data)

    # Codex finding #2: tentar Google primeiro quando há token.
    # Sucesso → sync_status=synced + google_event_id.
    # Falha   → sync_status=error, persiste local mesmo assim.
    # Sem token → sync_status=local.
    if gcal.has_active_token(db):
        event_id = gcal.create_event(
            db,
            title=block.title,
            start=block.start_datetime,
            end=block.end_datetime,
        )
        if event_id:
            block.google_event_id = event_id
            block.sync_status = "synced"
        else:
            block.sync_status = "error"
    else:
        block.sync_status = "local"

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
    if "start_datetime" in data and data["start_datetime"] is not None:
        data["start_datetime"] = _to_naive_utc(data["start_datetime"])
    if "end_datetime" in data and data["end_datetime"] is not None:
        data["end_datetime"] = _to_naive_utc(data["end_datetime"])
    if "card_id" in data and data["card_id"] and data["card_id"] != block.card_id:
        existing = db.query(CalendarBlock).filter(
            CalendarBlock.card_id == data["card_id"],
            CalendarBlock.id != block_id,
        ).first()
        if existing:
            existing.card_id = None
    for field, value in data.items():
        setattr(block, field, value)

    # Propagar para Google se o bloco já tem evento remoto.
    if block.google_event_id:
        ok = gcal.update_event(
            db,
            google_event_id=block.google_event_id,
            title=block.title,
            start=block.start_datetime,
            end=block.end_datetime,
        )
        block.sync_status = "synced" if ok else "error"

    db.commit()
    db.refresh(block)
    return block


@router.delete("/{block_id}", status_code=204)
def delete_block(block_id: str, db: Session = Depends(get_db)):
    block = db.get(CalendarBlock, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    # Codex finding #2: se há evento remoto, deletar do Google primeiro.
    # Falha → NÃO deleta local, retorna 502 para o usuário poder tentar de novo.
    if block.google_event_id:
        ok = gcal.delete_event(db, block.google_event_id)
        if not ok:
            raise HTTPException(
                status_code=502,
                detail="Falha ao remover do Google Calendar. Tente novamente.",
            )

    db.delete(block)
    db.commit()
