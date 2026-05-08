from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.column import KanbanColumn
from app.schemas.column import ColumnCreate, ColumnUpdate, ColumnOut, ReorderColumnsPayload

router = APIRouter(prefix="/api/columns", tags=["columns"])


@router.get("", response_model=list[ColumnOut])
def list_columns(db: Session = Depends(get_db)):
    return db.query(KanbanColumn).order_by(KanbanColumn.position).all()


@router.post("", response_model=ColumnOut, status_code=201)
def create_column(payload: ColumnCreate, db: Session = Depends(get_db)):
    max_pos = db.query(KanbanColumn).count()
    col = KanbanColumn(title=payload.title, position=max_pos)
    db.add(col)
    db.commit()
    db.refresh(col)
    return col


@router.patch("/{column_id}", response_model=ColumnOut)
def update_column(column_id: str, payload: ColumnUpdate, db: Session = Depends(get_db)):
    col = db.get(KanbanColumn, column_id)
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")
    if payload.title is not None:
        col.title = payload.title
    db.commit()
    db.refresh(col)
    return col


@router.delete("/{column_id}", status_code=204)
def delete_column(column_id: str, db: Session = Depends(get_db)):
    count = db.query(KanbanColumn).count()
    if count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last column")
    col = db.get(KanbanColumn, column_id)
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")
    db.delete(col)
    db.commit()
    remaining = db.query(KanbanColumn).order_by(KanbanColumn.position).all()
    for i, c in enumerate(remaining):
        c.position = i
    db.commit()


@router.patch("/reorder", response_model=list[ColumnOut])
def reorder_columns(payload: ReorderColumnsPayload, db: Session = Depends(get_db)):
    cols = {c.id: c for c in db.query(KanbanColumn).all()}
    if set(payload.ordered_ids) != set(cols.keys()):
        raise HTTPException(status_code=400, detail="ordered_ids must contain all column IDs")
    for i, cid in enumerate(payload.ordered_ids):
        cols[cid].position = i
    db.commit()
    return sorted(cols.values(), key=lambda c: c.position)
