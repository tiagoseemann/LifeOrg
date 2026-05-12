# FEAT-GOOGLE-CALENDAR — Sincronização Bidirecional com Google Calendar

> Branch: feature/mvp
> Data: 2026-05-11
> Implementar após os bugfixes do BUGFIX-001.md

---

## Decisões de produto confirmadas pelo proprietário

- Sincronização bidirecional: criar/editar/deletar no app sincroniza com Google
- Eventos do Google podem ser editados no app (e sincronizam de volta)
- Conflito: Google sempre ganha (app é extensão do Google)
- Escopo: apenas o calendário principal (primary)
- Credenciais OAuth já criadas no Google Cloud Console

---

## Configuração do .env antes de começar

Adicionar ao .env (nunca commitar esses valores):

```
GOOGLE_CLIENT_ID=997334252599-d7sm35gco697hd00ibjckdp8nm96vtqr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<obter com o proprietário — não está neste arquivo por segurança>
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

Adicionar ao .env.example (com valores vazios, pode commitar):

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

---

## Passo 1 — Dependências do backend

Adicionar em backend/requirements.txt:
```
google-auth-oauthlib>=1.2.0
google-api-python-client>=2.120.0
```

Reconstruir o container:
```bash
docker compose build backend
```

---

## Passo 2 — Migração Alembic

Criar: backend/alembic/versions/0002_google_calendar.py

```python
"""google calendar sync

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-11
"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('calendar_blocks',
        sa.Column('google_event_id', sa.String, nullable=True, unique=True)
    )
    op.add_column('calendar_blocks',
        sa.Column('is_google_event', sa.Boolean, nullable=False,
                  server_default='false')
    )

    op.create_table(
        'oauth_tokens',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('provider', sa.String, nullable=False, unique=True),
        sa.Column('access_token', sa.Text, nullable=False),
        sa.Column('refresh_token', sa.Text, nullable=True),
        sa.Column('token_expiry', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )


def downgrade():
    op.drop_table('oauth_tokens')
    op.drop_column('calendar_blocks', 'is_google_event')
    op.drop_column('calendar_blocks', 'google_event_id')
```

Rodar:
```bash
docker compose exec backend alembic upgrade head
```

---

## Passo 3 — Modelo OAuthToken

Criar: backend/app/models/oauth_token.py

```python
from sqlalchemy import Column, DateTime, Integer, String, Text, func
from app.database import Base


class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    id = Column(Integer, primary_key=True)
    provider = Column(String, nullable=False, unique=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(), onupdate=func.now())
```

Modificar: backend/app/models/block.py

Adicionar após as colunas existentes:
```python
google_event_id = Column(String, nullable=True, unique=True)
is_google_event = Column(Boolean, nullable=False, default=False)
```

---

## Passo 4 — Serviço Google Calendar

Criar: backend/app/services/google_calendar.py

```python
import os
from datetime import datetime, timezone
from typing import Optional

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from app.models.oauth_token import OAuthToken

SCOPES = ["https://www.googleapis.com/auth/calendar"]

CLIENT_CONFIG = {
    "web": {
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [os.environ["GOOGLE_REDIRECT_URI"]],
    }
}


def get_oauth_flow() -> Flow:
    return Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri=os.environ["GOOGLE_REDIRECT_URI"],
    )


def get_authorization_url() -> tuple[str, str]:
    flow = get_oauth_flow()
    url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
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
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        record.access_token = creds.token
        record.token_expiry = creds.expiry
        db.commit()

    return creds


def get_calendar_service(db: Session):
    creds = get_credentials(db)
    if not creds:
        return None
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def fetch_events(db: Session, time_min: datetime, time_max: datetime) -> list[dict]:
    service = get_calendar_service(db)
    if not service:
        return []

    result = service.events().list(
        calendarId="primary",
        timeMin=time_min.isoformat() + "Z",
        timeMax=time_max.isoformat() + "Z",
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    events = []
    for item in result.get("items", []):
        start = item.get("start", {})
        end = item.get("end", {})
        events.append({
            "google_event_id": item["id"],
            "title": item.get("summary", "(sem título)"),
            "start_datetime": start.get("dateTime") or start.get("date"),
            "end_datetime": end.get("dateTime") or end.get("date"),
        })
    return events


def create_event(db: Session, title: str, start: datetime,
                 end: datetime) -> Optional[str]:
    service = get_calendar_service(db)
    if not service:
        return None

    event = {
        "summary": title,
        "start": {"dateTime": start.isoformat(), "timeZone": "America/Sao_Paulo"},
        "end": {"dateTime": end.isoformat(), "timeZone": "America/Sao_Paulo"},
    }
    created = service.events().insert(calendarId="primary", body=event).execute()
    return created.get("id")


def update_event(db: Session, google_event_id: str, title: str,
                 start: datetime, end: datetime) -> bool:
    service = get_calendar_service(db)
    if not service:
        return False

    event = {
        "summary": title,
        "start": {"dateTime": start.isoformat(), "timeZone": "America/Sao_Paulo"},
        "end": {"dateTime": end.isoformat(), "timeZone": "America/Sao_Paulo"},
    }
    service.events().update(
        calendarId="primary", eventId=google_event_id, body=event
    ).execute()
    return True


def delete_event(db: Session, google_event_id: str) -> bool:
    service = get_calendar_service(db)
    if not service:
        return False

    service.events().delete(
        calendarId="primary", eventId=google_event_id
    ).execute()
    return True
```

---

## Passo 5 — Router de autenticação OAuth

Criar: backend/app/routers/auth_google.py

```python
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.oauth_token import OAuthToken
from app.services.google_calendar import get_authorization_url, exchange_code_for_tokens

router = APIRouter(prefix="/api/auth/google", tags=["auth"])

# IMPORTANTE: estas rotas NAO usam X-API-Key
# O Google não consegue enviar headers customizados no redirect


@router.get("/connect")
def google_connect():
    url, _state = get_authorization_url()
    return RedirectResponse(url)


@router.get("/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    try:
        tokens = exchange_code_for_tokens(code)
    except Exception as e:
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

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(f"{frontend_url}?google_connected=true")


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
```

---

## Passo 6 — Router de sincronização

Criar: backend/app/routers/google_sync.py

```python
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
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

    start_dt = datetime.fromisoformat(week_start).replace(tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(days=7)

    google_events = fetch_events(db, start_dt, end_dt)
    google_ids = {e["google_event_id"] for e in google_events}

    # Upsert: Google sempre ganha
    for ev in google_events:
        start = datetime.fromisoformat(ev["start_datetime"].replace("Z", "+00:00"))
        end = datetime.fromisoformat(ev["end_datetime"].replace("Z", "+00:00"))

        existing = db.query(CalendarBlock).filter_by(
            google_event_id=ev["google_event_id"]
        ).first()

        if existing:
            existing.title = ev["title"]
            existing.start_datetime = start
            existing.end_datetime = end
        else:
            block = CalendarBlock(
                title=ev["title"],
                start_datetime=start,
                end_datetime=end,
                google_event_id=ev["google_event_id"],
                is_google_event=True,
            )
            db.add(block)

    # Remover blocos do Google que não existem mais lá
    local_google_blocks = db.query(CalendarBlock).filter(
        CalendarBlock.google_event_id.isnot(None),
        CalendarBlock.start_datetime >= start_dt,
        CalendarBlock.start_datetime < end_dt,
    ).all()

    for block in local_google_blocks:
        if block.google_event_id not in google_ids:
            db.delete(block)

    db.commit()
    return {"synced": len(google_events), "connected": True}
```

---

## Passo 7 — Modificar blocks.py para sync bidirecional

Modificar: backend/app/routers/blocks.py

Adicionar import no topo:
```python
from app.services import google_calendar as gcal
```

No endpoint POST (criar bloco), após db.commit() + db.refresh(block):
```python
google_event_id = gcal.create_event(
    db, title=block.title,
    start=block.start_datetime, end=block.end_datetime
)
if google_event_id:
    block.google_event_id = google_event_id
    db.commit()
    db.refresh(block)
```

No endpoint PATCH (atualizar bloco), após db.commit():
```python
if block.google_event_id:
    gcal.update_event(
        db, google_event_id=block.google_event_id,
        title=block.title, start=block.start_datetime, end=block.end_datetime
    )
```

No endpoint DELETE (deletar bloco), antes de db.delete(block):
```python
if block.google_event_id:
    gcal.delete_event(db, block.google_event_id)
```

---

## Passo 8 — Registrar routers no main.py

Modificar: backend/app/main.py

```python
from app.routers import auth_google, google_sync

app.include_router(auth_google.router)
app.include_router(google_sync.router)
```

Na lista de rotas isentas do middleware X-API-Key, adicionar:
```python
EXEMPT_PREFIXES = [
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/auth/google",   # NOVO
]
```

---

## Passo 9 — Frontend: atualizar tipo Block

Modificar: frontend/src/types/calendar.ts

Adicionar ao interface Block:
```typescript
google_event_id: string | null
is_google_event: boolean
```

---

## Passo 10 — Frontend: hook useGoogleCalendar

Criar: frontend/src/hooks/useGoogleCalendar.ts

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

interface GoogleStatus {
  connected: boolean
}

export function useGoogleStatus() {
  return useQuery<GoogleStatus>({
    queryKey: ['google-status'],
    queryFn: () => apiFetch('/api/auth/google/status'),
    refetchInterval: 30_000,
  })
}

export function useGoogleSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (weekStart: string) =>
      apiFetch(`/api/google/sync?week_start=${weekStart}`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocks'] })
    },
  })
}

export function useGoogleDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch('/api/auth/google/disconnect', { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google-status'] })
      qc.invalidateQueries({ queryKey: ['blocks'] })
    },
  })
}

export function openGoogleConnect() {
  window.location.href = 'http://localhost:8000/api/auth/google/connect'
}
```

---

## Passo 11 — Frontend: componente GoogleConnectBanner

Criar: frontend/src/calendar/GoogleConnectBanner.tsx

```tsx
import { useEffect } from 'react'
import { useGoogleStatus, useGoogleSync, useGoogleDisconnect, openGoogleConnect } from '../hooks/useGoogleCalendar'
import styles from './GoogleConnectBanner.module.css'

interface Props {
  weekStart: string
}

export function GoogleConnectBanner({ weekStart }: Props) {
  const { data: status } = useGoogleStatus()
  const sync = useGoogleSync()
  const disconnect = useGoogleDisconnect()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_connected') === 'true') {
      window.history.replaceState({}, '', window.location.pathname)
      sync.mutate(weekStart)
    }
  }, [])

  if (!status) return null

  if (!status.connected) {
    return (
      <div className={styles.banner}>
        <span className={styles.bannerText}>Sincronize com o Google Calendar</span>
        <button className={styles.connectBtn} onClick={openGoogleConnect}>
          Conectar Google
        </button>
      </div>
    )
  }

  return (
    <div className={styles.bannerConnected}>
      <div className={styles.connectedInfo}>
        <span className={styles.dot} />
        <span className={styles.bannerText}>Google Calendar conectado</span>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.syncBtn}
          onClick={() => sync.mutate(weekStart)}
          disabled={sync.isPending}
        >
          {sync.isPending ? 'Sincronizando...' : '↻ Sincronizar'}
        </button>
        <button className={styles.disconnectBtn} onClick={() => disconnect.mutate()}>
          Desconectar
        </button>
      </div>
    </div>
  )
}
```

Criar: frontend/src/calendar/GoogleConnectBanner.module.css

```css
.banner,
.bannerConnected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-bg-surface);
  border: 0.5px solid var(--color-border);
  border-radius: 10px;
  margin-bottom: 12px;
  gap: 12px;
}

.bannerText {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.connectedInfo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34a853;
  flex-shrink: 0;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connectBtn {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.12s ease;
  white-space: nowrap;
}
.connectBtn:hover { background: var(--color-accent-hover); }

.syncBtn {
  background: none;
  border: 0.5px solid var(--color-border);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: background-color 0.12s ease;
}
.syncBtn:hover { background: var(--color-bg-base); }
.syncBtn:disabled { opacity: 0.5; cursor: default; }

.disconnectBtn {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  transition: color 0.12s ease;
}
.disconnectBtn:hover { color: #c0392b; }
```

---

## Passo 12 — Frontend: estilo Google nos blocos do calendário

Modificar: frontend/src/calendar/CalBlock.tsx

Adicionar badge "G" e classe condicional:
```tsx
<div
  className={`
    ${styles.block}
    ${block.category_id ? styles[`cat_${catSlug}`] : ''}
    ${block.is_google_event ? styles.googleBlock : ''}
  `}
>
  {block.is_google_event && (
    <span className={styles.googleBadge}>G</span>
  )}
  {/* resto do bloco sem mudança */}
</div>
```

Adicionar em CalBlock.module.css:
```css
.googleBlock {
  background: #E8F0FE;
  border-left: 2px solid #4285F4;
}
.googleBlock .blockTitle {
  color: #1a3a6b;
}
.googleBadge {
  font-size: 9px;
  font-weight: 700;
  color: #4285F4;
  letter-spacing: 0.04em;
  opacity: 0.8;
}
```

---

## Passo 13 — Frontend: adicionar banner ao CalendarScreen

Modificar: frontend/src/calendar/CalendarScreen.tsx

```tsx
import { GoogleConnectBanner } from './GoogleConnectBanner'

// No JSX, antes do grid do calendário:
<GoogleConnectBanner weekStart={weekStart} />
```

---

## Verificação final

```bash
docker compose build backend
docker compose exec backend alembic upgrade head
docker compose up

# Acessar http://localhost:3000 -> Calendário
# Deve aparecer banner "Conectar Google"
# Clicar -> fluxo OAuth -> autorizar -> volta ao app -> sincroniza
# Eventos do Google aparecem em azul
```

---

## Resumo de arquivos

| Arquivo | Ação |
|---|---|
| .env | Adicionar 4 variáveis Google |
| backend/requirements.txt | Adicionar 2 dependências |
| backend/alembic/versions/0002_google_calendar.py | Criar |
| backend/app/models/oauth_token.py | Criar |
| backend/app/models/block.py | Adicionar 2 colunas |
| backend/app/services/google_calendar.py | Criar |
| backend/app/routers/auth_google.py | Criar |
| backend/app/routers/google_sync.py | Criar |
| backend/app/routers/blocks.py | Adicionar sync nas operações de escrita |
| backend/app/main.py | Registrar 2 routers + isentar /api/auth/google do X-API-Key |
| frontend/src/types/calendar.ts | Adicionar 2 campos |
| frontend/src/hooks/useGoogleCalendar.ts | Criar |
| frontend/src/calendar/GoogleConnectBanner.tsx | Criar |
| frontend/src/calendar/GoogleConnectBanner.module.css | Criar |
| frontend/src/calendar/CalBlock.tsx | Adicionar classe e badge Google |
| frontend/src/calendar/CalBlock.module.css | Adicionar estilos Google |
| frontend/src/calendar/CalendarScreen.tsx | Adicionar banner |
