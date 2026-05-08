from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.card import KanbanCard
from app.models.column import KanbanColumn
from app.schemas.card import CardCreate, CardUpdate, CardOut, ReorderCardsPayload

router = APIRouter(prefix="/api/cards", tags=["cards"])


def _next_position(db: Session, column_id: str) -> int:
    return db.query(KanbanCard).filter(KanbanCard.column_id == column_id).count()


@router.get("", response_model=list[CardOut])
def list_cards(db: Session = Depends(get_db)):
    return (
        db.query(KanbanCard)
        .order_by(KanbanCard.column_id, KanbanCard.position)
        .all()
    )


@router.post("", response_model=CardOut, status_code=201)
def create_card(payload: CardCreate, db: Session = Depends(get_db)):
    col = db.get(KanbanColumn, payload.column_id)
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")
    card = KanbanCard(
        title=payload.title,
        column_id=payload.column_id,
        description=payload.description,
        category_id=payload.category_id,
        priority=payload.priority,
        due_date=payload.due_date,
        time_estimate=payload.time_estimate,
        checklist=payload.checklist,
        position=_next_position(db, payload.column_id),
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.patch("/reorder", response_model=list[CardOut])
def reorder_cards(payload: ReorderCardsPayload, db: Session = Depends(get_db)):
    col = db.get(KanbanColumn, payload.column_id)
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")
    cards_in_col = {
        c.id: c
        for c in db.query(KanbanCard).filter(KanbanCard.column_id == payload.column_id).all()
    }
    if set(payload.ordered_ids) != set(cards_in_col.keys()):
        raise HTTPException(
            status_code=400, detail="ordered_ids must contain exactly the IDs of cards in that column"
        )
    for i, cid in enumerate(payload.ordered_ids):
        cards_in_col[cid].position = i
    db.commit()
    return sorted(cards_in_col.values(), key=lambda c: c.position)


@router.get("/{card_id}", response_model=CardOut)
def get_card(card_id: str, db: Session = Depends(get_db)):
    card = db.get(KanbanCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.patch("/{card_id}", response_model=CardOut)
def update_card(card_id: str, payload: CardUpdate, db: Session = Depends(get_db)):
    card = db.get(KanbanCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    data = payload.model_dump(exclude_unset=True)
    if "column_id" in data and data["column_id"] != card.column_id:
        col = db.get(KanbanColumn, data["column_id"])
        if not col:
            raise HTTPException(status_code=404, detail="Target column not found")
        card.position = _next_position(db, data["column_id"])
    for field, value in data.items():
        setattr(card, field, value)
    db.commit()
    db.refresh(card)
    return card


@router.delete("/{card_id}", status_code=204)
def delete_card(card_id: str, db: Session = Depends(get_db)):
    card = db.get(KanbanCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
