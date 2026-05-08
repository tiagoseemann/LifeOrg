from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DBSession
from app.database import get_db
from app.models.session import FocusSession
from app.models.card import KanbanCard
from app.schemas.session import SessionCreate, SessionEnd, SessionOut

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

MIN_SESSION_SECONDS = 30


@router.get("", response_model=list[SessionOut])
def list_sessions(
    active: bool = Query(False),
    today: bool = Query(False),
    db: DBSession = Depends(get_db),
):
    q = db.query(FocusSession)
    if active:
        q = q.filter(FocusSession.ended_at.is_(None))
    if today:
        from datetime import date
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
        q = q.filter(FocusSession.started_at >= today_start, FocusSession.ended_at.isnot(None))
    return q.order_by(FocusSession.started_at.desc()).all()


@router.post("", response_model=SessionOut, status_code=201)
def create_session(payload: SessionCreate, db: DBSession = Depends(get_db)):
    active = db.query(FocusSession).filter(FocusSession.ended_at.is_(None)).first()
    if active:
        raise HTTPException(status_code=409, detail="A session is already active")
    card = db.get(KanbanCard, payload.card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    session = FocusSession(
        card_id=payload.card_id,
        card_title_snapshot=payload.card_title_snapshot,
        card_cat_snapshot=payload.card_cat_snapshot,
        mode=payload.mode,
        duration_seconds=payload.duration_seconds,
        started_at=datetime.now(timezone.utc),
        last_heartbeat_at=datetime.now(timezone.utc),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.patch("/{session_id}/heartbeat", response_model=SessionOut)
def heartbeat(session_id: str, db: DBSession = Depends(get_db)):
    session = db.get(FocusSession, session_id)
    if not session or session.ended_at is not None:
        raise HTTPException(status_code=404, detail="Active session not found")
    session.last_heartbeat_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


@router.patch("/{session_id}/end", response_model=SessionOut)
def end_session(session_id: str, payload: SessionEnd, db: DBSession = Depends(get_db)):
    session = db.get(FocusSession, session_id)
    if not session or session.ended_at is not None:
        raise HTTPException(status_code=404, detail="Active session not found")
    now = datetime.now(timezone.utc)
    elapsed = payload.elapsed_seconds
    session.elapsed_seconds = elapsed
    session.ended_at = now
    if elapsed >= MIN_SESSION_SECONDS and session.card_id:
        card = db.get(KanbanCard, session.card_id)
        if card:
            card.total_focus_time = (card.total_focus_time or 0) + elapsed
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
def discard_session(session_id: str, db: DBSession = Depends(get_db)):
    session = db.get(FocusSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
