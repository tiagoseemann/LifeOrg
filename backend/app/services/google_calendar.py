"""Google Calendar integration.

Convention: blocos no banco usam datetime naive (sem tzinfo) representando UTC.
Na borda com o Google convertemos para ISO 8601 UTC e vice-versa.
"""
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session

from app.models.oauth_token import OAuthToken

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _client_config() -> dict:
    return {
        "web": {
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [os.environ["GOOGLE_REDIRECT_URI"]],
        }
    }


def _to_utc_iso(dt: datetime) -> str:
    """Naive datetime → ISO 8601 UTC string with 'Z' suffix."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _from_google_iso(value: str) -> datetime:
    """Google ISO string → naive UTC datetime."""
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def get_oauth_flow() -> Flow:
    return Flow.from_client_config(
        _client_config(),
        scopes=SCOPES,
        redirect_uri=os.environ["GOOGLE_REDIRECT_URI"],
    )


def get_authorization_url() -> tuple[str, str]:
    flow = get_oauth_flow()
    url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )
    return url, state


def exchange_code_for_tokens(code: str) -> dict:
    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_expiry": creds.expiry,
    }


def get_credentials(db: Session) -> Optional[Credentials]:
    record = db.query(OAuthToken).filter_by(provider="google").first()
    if not record:
        return None

    creds = Credentials(
        token=record.access_token,
        refresh_token=record.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        scopes=SCOPES,
    )

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            record.access_token = creds.token
            record.token_expiry = creds.expiry
            db.commit()
        except Exception:
            logger.exception("Failed to refresh Google credentials")
            return None

    return creds


def get_calendar_service(db: Session):
    creds = get_credentials(db)
    if not creds:
        return None
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def has_active_token(db: Session) -> bool:
    return (
        db.query(OAuthToken).filter_by(provider="google").first() is not None
    )


def fetch_events(
    db: Session, time_min: datetime, time_max: datetime
) -> Optional[list[dict]]:
    service = get_calendar_service(db)
    if not service:
        return None

    try:
        result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=_to_utc_iso(time_min),
                timeMax=_to_utc_iso(time_max),
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
    except HttpError:
        logger.exception("Google fetch_events failed")
        return None

    events: list[dict] = []
    for item in result.get("items", []):
        start = item.get("start", {})
        end = item.get("end", {})
        start_value = start.get("dateTime") or start.get("date")
        end_value = end.get("dateTime") or end.get("date")
        if not start_value or not end_value:
            continue
        events.append(
            {
                "google_event_id": item["id"],
                "title": item.get("summary", "(sem título)"),
                "start_datetime": _from_google_iso(start_value),
                "end_datetime": _from_google_iso(end_value),
            }
        )
    return events


def create_event(
    db: Session,
    title: str,
    start: datetime,
    end: datetime,
    time_zone: str = "UTC",
) -> Optional[str]:
    service = get_calendar_service(db)
    if not service:
        return None

    event = {
        "summary": title,
        "start": {"dateTime": _to_utc_iso(start), "timeZone": time_zone},
        "end": {"dateTime": _to_utc_iso(end), "timeZone": time_zone},
    }
    try:
        created = (
            service.events()
            .insert(calendarId="primary", body=event)
            .execute()
        )
    except HttpError:
        logger.exception("Google create_event failed")
        return None
    return created.get("id")


def update_event(
    db: Session,
    google_event_id: str,
    title: str,
    start: datetime,
    end: datetime,
    time_zone: str = "UTC",
) -> bool:
    service = get_calendar_service(db)
    if not service:
        return False

    event = {
        "summary": title,
        "start": {"dateTime": _to_utc_iso(start), "timeZone": time_zone},
        "end": {"dateTime": _to_utc_iso(end), "timeZone": time_zone},
    }
    try:
        service.events().update(
            calendarId="primary", eventId=google_event_id, body=event
        ).execute()
    except HttpError:
        logger.exception("Google update_event failed")
        return False
    return True


def delete_event(db: Session, google_event_id: str) -> bool:
    service = get_calendar_service(db)
    if not service:
        return False

    try:
        service.events().delete(
            calendarId="primary", eventId=google_event_id
        ).execute()
    except HttpError as e:
        if getattr(e, "resp", None) is not None and e.resp.status in (404, 410):
            return True
        logger.exception("Google delete_event failed")
        return False
    return True
