from datetime import date, datetime, time, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.block import CalendarBlock
from app.models.oauth_token import OAuthToken
from app.services.google_calendar import fetch_events

router = APIRouter(prefix="/api/google", tags=["google-sync"])


@router.post("/sync")
def sync_from_google(
    week_start: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    connected = db.query(OAuthToken).filter_by(provider="google").first()
    if not connected:
        return {"synced": 0, "connected": False}

    try:
        start_date = date.fromisoformat(week_start)
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid week_start format. Use YYYY-MM-DD"
        )

    start_dt = datetime.combine(start_date, time.min)
    end_dt = start_dt + timedelta(days=7)

    google_events = fetch_events(db, start_dt, end_dt)
    if google_events is None:
        return {"synced": 0, "connected": True, "error": "fetch_failed"}

    google_ids = {e["google_event_id"] for e in google_events}

    # Upsert: Google sempre ganha em título/datas. Preservamos category_id
    # local (decisão de produto #3 — usuário pode atribuir categoria a evento
    # vindo do Google e o sync não sobrescreve).
    for ev in google_events:
        existing = (
            db.query(CalendarBlock)
            .filter_by(google_event_id=ev["google_event_id"])
            .first()
        )
        if existing:
            existing.title = ev["title"]
            existing.start_datetime = ev["start_datetime"]
            existing.end_datetime = ev["end_datetime"]
            existing.sync_status = "synced"
        else:
            block = CalendarBlock(
                title=ev["title"],
                start_datetime=ev["start_datetime"],
                end_datetime=ev["end_datetime"],
                google_event_id=ev["google_event_id"],
                is_google_event=True,
                sync_status="synced",
            )
            db.add(block)

    # Apaga blocos do Google que não estão mais lá (origem Google só).
    local_google_blocks = (
        db.query(CalendarBlock)
        .filter(
            CalendarBlock.is_google_event.is_(True),
            CalendarBlock.start_datetime >= start_dt,
            CalendarBlock.start_datetime < end_dt,
        )
        .all()
    )
    for block in local_google_blocks:
        if block.google_event_id not in google_ids:
            db.delete(block)

    db.commit()
    return {"synced": len(google_events), "connected": True}
