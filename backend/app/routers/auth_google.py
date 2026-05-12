import logging
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.oauth_token import OAuthToken
from app.services.google_calendar import (
    exchange_code_for_tokens,
    get_authorization_url,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/google", tags=["auth"])


@router.get("/connect")
def google_connect():
    url, _state = get_authorization_url()
    return RedirectResponse(url)


@router.get("/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    try:
        tokens = exchange_code_for_tokens(code)
    except Exception as e:
        logger.exception("OAuth exchange failed")
        raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")

    record = db.query(OAuthToken).filter_by(provider="google").first()
    if record:
        record.access_token = tokens["access_token"]
        if tokens.get("refresh_token"):
            record.refresh_token = tokens["refresh_token"]
        record.token_expiry = tokens.get("token_expiry")
    else:
        record = OAuthToken(
            provider="google",
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token"),
            token_expiry=tokens.get("token_expiry"),
        )
        db.add(record)
    db.commit()

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3030")
    return RedirectResponse(f"{frontend_url}/?google_connected=true")


@router.get("/status")
def google_status(db: Session = Depends(get_db)):
    record = db.query(OAuthToken).filter_by(provider="google").first()
    return {"connected": record is not None}


@router.delete("/disconnect")
def google_disconnect(db: Session = Depends(get_db)):
    record = db.query(OAuthToken).filter_by(provider="google").first()
    if record:
        db.delete(record)
        db.commit()
    return {"disconnected": True}
