# LifeOrg — Plano 3: Módulo Calendário + Módulo Foco

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo Calendário (visão semanal, blocos de tempo, modal de criação/edição, now-line coral) e o módulo Foco (timer fixo + livre, ring SVG animado, picker de card, histórico do dia, recuperação de sessão interrompida) com persistência completa no PostgreSQL.

**Architecture:** Backend adiciona routers `/api/blocks` e `/api/sessions`. Calendário é implementado com CSS Grid puro (sem FullCalendar — o design customizado é mais simples de implementar diretamente). Foco usa `setInterval` em Zustand + heartbeat de 30s para o backend. Recuperação de sessão interrompida detectada na montagem do `FocusScreen`.

**Tech Stack:** FastAPI + SQLAlchemy + Pydantic v2 (backend) · React 18 + TypeScript + CSS Modules + Zustand + TanStack Query (frontend)

**Pré-requisito:** Plano 2 (Kanban) concluído — cards existem no banco para serem referenciados pelo Foco.

---

## Escopo do Plano 3

Calendário completo funcional (sem DnD). Foco completo com persistência. Não inclui: vínculo card↔bloco (Plano 4).

---

## Estrutura de Arquivos

```
backend/app/
├── schemas/
│   ├── block.py          ← BlockCreate, BlockUpdate, BlockOut
│   └── session.py        ← SessionCreate, SessionEnd, SessionOut
├── routers/
│   ├── blocks.py         ← GET/POST/PATCH/DELETE /api/blocks
│   └── sessions.py       ← GET/POST/PATCH(.../heartbeat, .../end)/DELETE /api/sessions
└── main.py               ← include_router (blocks, sessions)

frontend/src/
├── types/
│   ├── calendar.ts       ← Block interface
│   └── focus.ts          ← Session, FocusMode interfaces
├── hooks/
│   ├── useBlocks.ts      ← useBlocks, useCreateBlock, useUpdateBlock, useDeleteBlock
│   └── useSessions.ts    ← useActiveSession, useCreateSession, useHeartbeat, useEndSession, useDiscardSession, useTodaySessions
├── store/
│   └── focusStore.ts     ← activeSessionId, elapsed, running, durKey, customMin, mode
├── calendar/
│   ├── CalendarScreen.tsx + CalendarScreen.module.css
│   ├── CalBlock.tsx + CalBlock.module.css
│   └── NewBlockModal.tsx + NewBlockModal.module.css
└── focus/
    ├── FocusScreen.tsx + FocusScreen.module.css
    ├── FocusRing.tsx     ← SVG ring component
    └── CardPicker.tsx + CardPicker.module.css
```

---

## Task 1: Backend — schemas Pydantic para blocks e sessions

**Files:**
- Create: `backend/app/schemas/block.py`
- Create: `backend/app/schemas/session.py`

- [ ] **Step 1: Criar `backend/app/schemas/block.py`**

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator


class BlockCreate(BaseModel):
    title: str
    start_datetime: datetime
    end_datetime: datetime
    category_id: Optional[str] = None
    card_id: Optional[str] = None
    recurrence: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title cannot be empty")
        return v

    @model_validator(mode="after")
    def end_after_start(self) -> "BlockCreate":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be strictly after start_datetime")
        return self


class BlockUpdate(BaseModel):
    title: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    category_id: Optional[str] = None
    card_id: Optional[str] = None
    recurrence: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("title cannot be empty")
        return v

    @model_validator(mode="after")
    def end_after_start(self) -> "BlockUpdate":
        if self.start_datetime and self.end_datetime:
            if self.end_datetime <= self.start_datetime:
                raise ValueError("end_datetime must be strictly after start_datetime")
        return self


class BlockOut(BaseModel):
    id: str
    title: str
    start_datetime: datetime
    end_datetime: datetime
    category_id: Optional[str]
    card_id: Optional[str]
    recurrence: Optional[str]

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Criar `backend/app/schemas/session.py`**

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class SessionCreate(BaseModel):
    card_id: str
    card_title_snapshot: str
    card_cat_snapshot: Optional[str] = None
    mode: str  # 'fixed' | 'free'
    duration_seconds: Optional[int] = None

    @field_validator("mode")
    @classmethod
    def mode_valid(cls, v: str) -> str:
        if v not in ("fixed", "free"):
            raise ValueError("mode must be 'fixed' or 'free'")
        return v


class SessionEnd(BaseModel):
    elapsed_seconds: int


class SessionOut(BaseModel):
    id: str
    card_id: Optional[str]
    card_title_snapshot: str
    card_cat_snapshot: Optional[str]
    mode: str
    duration_seconds: Optional[int]
    elapsed_seconds: Optional[int]
    last_heartbeat_at: Optional[datetime]
    started_at: datetime
    ended_at: Optional[datetime]

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/block.py backend/app/schemas/session.py
git commit -m "feat(backend): Pydantic schemas — block + session"
```

---

## Task 2: Backend — router de blocks

**Files:**
- Create: `backend/app/routers/blocks.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Criar `backend/app/routers/blocks.py`**

```python
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.block import CalendarBlock
from app.models.card import KanbanCard
from app.schemas.block import BlockCreate, BlockUpdate, BlockOut

router = APIRouter(prefix="/api/blocks", tags=["blocks"])


@router.get("", response_model=list[BlockOut])
def list_blocks(
    week_start: Optional[str] = Query(None, description="ISO date YYYY-MM-DD for Monday of week"),
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
    # RN-KAN-10: if card_id is being linked, unlink from any existing block
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
    # If re-linking to a different card, unlink the old block
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
    # RN-CAL-04: deleting a block only unlinks the card — never deletes the card
    # The cascade is handled by the DB: calendar_blocks.card_id SET NULL on delete
    db.delete(block)
    db.commit()
```

- [ ] **Step 2: Adicionar router em `backend/app/main.py`**

```python
from app.routers import blocks as blocks_router
app.include_router(blocks_router.router)
```

- [ ] **Step 3: Testar**

```bash
KEY="X-API-Key: dev-secret-change-in-production"

# Create a block
curl -X POST -H "$KEY" -H "Content-Type: application/json" \
  -d '{"title":"Deep work","start_datetime":"2026-05-08T14:00:00","end_datetime":"2026-05-08T16:00:00"}' \
  http://localhost:8000/api/blocks

# List blocks for current week
curl -H "$KEY" "http://localhost:8000/api/blocks?week_start=2026-05-04"

# Try invalid time range (should fail with 422)
curl -X POST -H "$KEY" -H "Content-Type: application/json" \
  -d '{"title":"Bad block","start_datetime":"2026-05-08T16:00:00","end_datetime":"2026-05-08T14:00:00"}' \
  http://localhost:8000/api/blocks
```

Esperado: create retorna 201, list retorna array, invalid range retorna 422.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/blocks.py backend/app/main.py
git commit -m "feat(backend): blocks router — CRUD with week filter + card re-link guard"
```

---

## Task 3: Backend — router de sessions (Foco)

**Files:**
- Create: `backend/app/routers/sessions.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Criar `backend/app/routers/sessions.py`**

```python
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DBSession
from app.database import get_db
from app.models.session import FocusSession
from app.models.card import KanbanCard
from app.schemas.session import SessionCreate, SessionEnd, SessionOut

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

MIN_SESSION_SECONDS = 30  # RN-FOC-04


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
    # RN-FOC-02: only one active session at a time
    active = db.query(FocusSession).filter(FocusSession.ended_at.is_(None)).first()
    if active:
        raise HTTPException(status_code=409, detail="A session is already active")
    # RN-FOC-01: card must exist
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
    # RN-FOC-04: discard sessions shorter than 30s
    if elapsed >= MIN_SESSION_SECONDS:
        session.elapsed_seconds = elapsed
        session.ended_at = now
        # Increment card's total_focus_time
        if session.card_id:
            card = db.get(KanbanCard, session.card_id)
            if card:
                card.total_focus_time = (card.total_focus_time or 0) + elapsed
    else:
        # Short session: mark as ended but don't count it
        session.elapsed_seconds = elapsed
        session.ended_at = now
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
```

- [ ] **Step 2: Adicionar router em `backend/app/main.py`**

```python
from app.routers import sessions as sessions_router
app.include_router(sessions_router.router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/sessions.py backend/app/main.py
git commit -m "feat(backend): sessions router — create, heartbeat, end (with focus time), discard"
```

---

## Task 4: Frontend — tipos e hooks para Calendar e Focus

**Files:**
- Create: `frontend/src/types/calendar.ts`
- Create: `frontend/src/types/focus.ts`
- Create: `frontend/src/hooks/useBlocks.ts`
- Create: `frontend/src/hooks/useSessions.ts`

- [ ] **Step 1: Criar `frontend/src/types/calendar.ts`**

```typescript
export interface Block {
  id: string
  title: string
  start_datetime: string  // ISO datetime string
  end_datetime: string    // ISO datetime string
  category_id: string | null
  card_id: string | null
  recurrence: string | null
}
```

- [ ] **Step 2: Criar `frontend/src/types/focus.ts`**

```typescript
export type FocusMode = 'fixed' | 'free'

export interface Session {
  id: string
  card_id: string | null
  card_title_snapshot: string
  card_cat_snapshot: string | null
  mode: FocusMode
  duration_seconds: number | null
  elapsed_seconds: number | null
  last_heartbeat_at: string | null
  started_at: string
  ended_at: string | null
}
```

- [ ] **Step 3: Criar `frontend/src/hooks/useBlocks.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { Block } from '../types/calendar'

function blocksKey(weekStart?: string) {
  return ['blocks', weekStart ?? 'all']
}

export function useBlocks(weekStart?: string) {
  const url = weekStart ? `/api/blocks?week_start=${weekStart}` : '/api/blocks'
  return useQuery({
    queryKey: blocksKey(weekStart),
    queryFn: () => apiFetch<Block[]>(url),
  })
}

export function useCreateBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Block, 'id'>) =>
      apiFetch<Block>('/api/blocks', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocks'] }),
  })
}

export function useUpdateBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Block> & { id: string }) =>
      apiFetch<Block>(`/api/blocks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocks'] }),
  })
}

export function useDeleteBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/blocks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocks'] })
      qc.invalidateQueries({ queryKey: ['cards'] })  // card linkage may change
    },
  })
}
```

- [ ] **Step 4: Criar `frontend/src/hooks/useSessions.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { Session } from '../types/focus'

const ACTIVE_KEY = ['sessions', 'active']
const TODAY_KEY  = ['sessions', 'today']

export function useActiveSession() {
  return useQuery({
    queryKey: ACTIVE_KEY,
    queryFn: () =>
      apiFetch<Session[]>('/api/sessions?active=true').then(arr => arr[0] ?? null),
    refetchInterval: false,
    staleTime: Infinity,
  })
}

export function useTodaySessions() {
  return useQuery({
    queryKey: TODAY_KEY,
    queryFn: () => apiFetch<Session[]>('/api/sessions?today=true'),
    refetchInterval: 60_000,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      card_id: string
      card_title_snapshot: string
      card_cat_snapshot?: string | null
      mode: 'fixed' | 'free'
      duration_seconds?: number | null
    }) =>
      apiFetch<Session>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVE_KEY }),
  })
}

export function useHeartbeat(sessionId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!sessionId) throw new Error('No session')
      return apiFetch<Session>(`/api/sessions/${sessionId}/heartbeat`, { method: 'PATCH' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVE_KEY }),
  })
}

export function useEndSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, elapsed_seconds }: { id: string; elapsed_seconds: number }) =>
      apiFetch<Session>(`/api/sessions/${id}/end`, {
        method: 'PATCH',
        body: JSON.stringify({ elapsed_seconds }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_KEY })
      qc.invalidateQueries({ queryKey: TODAY_KEY })
      qc.invalidateQueries({ queryKey: ['cards'] })  // total_focus_time updated
    },
  })
}

export function useDiscardSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_KEY })
      qc.invalidateQueries({ queryKey: TODAY_KEY })
    },
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/ frontend/src/hooks/useBlocks.ts frontend/src/hooks/useSessions.ts
git commit -m "feat(frontend): calendar + focus types and React Query hooks"
```

---

## Task 5: Frontend — store/focusStore.ts

**Files:**
- Create: `frontend/src/store/focusStore.ts`

- [ ] **Step 1: Criar `frontend/src/store/focusStore.ts`**

```typescript
import { create } from 'zustand'
import type { FocusMode } from '../types/focus'

export type DurKey = '15' | '25' | '45' | '60' | 'free' | 'custom'

interface FocusState {
  // Session identity
  activeSessionId: string | null
  // Timer state
  elapsed: number       // seconds, net of pauses
  running: boolean
  paused: boolean
  // Mode config (only changeable before session starts)
  mode: FocusMode
  durKey: DurKey
  customMin: number     // minutes, when durKey === 'custom'
  // Derived
  durationSeconds: number | null  // null for 'free' mode

  // Actions
  setActiveSession: (id: string | null) => void
  setElapsed: (n: number | ((prev: number) => number)) => void
  setRunning: (v: boolean) => void
  setPaused: (v: boolean) => void
  setMode: (m: FocusMode) => void
  setDurKey: (k: DurKey) => void
  setCustomMin: (m: number) => void
  reset: () => void
}

function resolveDuration(durKey: DurKey, customMin: number): number | null {
  if (durKey === 'free') return null
  if (durKey === 'custom') return customMin > 0 ? customMin * 60 : null
  return parseInt(durKey, 10) * 60
}

export const useFocusStore = create<FocusState>((set, get) => ({
  activeSessionId: null,
  elapsed: 0,
  running: false,
  paused: false,
  mode: 'fixed',
  durKey: '25',
  customMin: 30,
  durationSeconds: 25 * 60,

  setActiveSession: (id) => set({ activeSessionId: id }),
  setElapsed: (n) => set(state => ({
    elapsed: typeof n === 'function' ? n(state.elapsed) : n,
  })),
  setRunning: (v) => set({ running: v }),
  setPaused: (v) => set({ paused: v }),
  setMode: (m) => set({ mode: m }),
  setDurKey: (k) => set(state => ({
    durKey: k,
    mode: k === 'free' ? 'free' : 'fixed',
    durationSeconds: resolveDuration(k, state.customMin),
  })),
  setCustomMin: (m) => set(state => ({
    customMin: m,
    durationSeconds: state.durKey === 'custom' ? (m > 0 ? m * 60 : null) : state.durationSeconds,
  })),
  reset: () => set({
    activeSessionId: null,
    elapsed: 0,
    running: false,
    paused: false,
  }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/focusStore.ts
git commit -m "feat(frontend): focusStore — timer state + mode/duration management"
```

---

## Task 6: Frontend — CalBlock.tsx

**Files:**
- Create: `frontend/src/calendar/CalBlock.tsx`
- Create: `frontend/src/calendar/CalBlock.module.css`

- [ ] **Step 1: Criar `frontend/src/calendar/CalBlock.module.css`**

```css
.block {
  position: absolute;
  left: 4px;
  right: 4px;
  border-radius: 6px;
  padding: 5px 7px;
  cursor: pointer;
  overflow: hidden;
  transition: filter 0.12s ease, transform 0.12s ease;
  z-index: 1;
}

.block:hover {
  filter: brightness(0.97);
  transform: translateX(1px);
  z-index: 4;
  box-shadow: 0 2px 8px rgba(30,28,26,0.1);
}

.block.trabalho {
  background: var(--cat-trabalho-bg);
  border-left: 2px solid var(--cat-trabalho-accent);
}

.block.estudo {
  background: var(--cat-estudo-bg);
  border-left: 2px solid var(--cat-estudo-accent);
}

.block.pessoal {
  background: var(--cat-pessoal-bg);
  border: 0.5px solid var(--color-border);
}

.block.default {
  background: var(--color-bg-base);
  border-left: 2px solid var(--color-text-secondary);
}

.title {
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.block.trabalho .title { color: var(--cat-trabalho-text); }
.block.estudo   .title { color: var(--cat-estudo-text); }
.block.pessoal  .title { color: var(--color-text-primary); }
.block.default  .title { color: var(--color-text-secondary); }

.time {
  font-family: var(--font-mono);
  font-size: 9.5px;
  line-height: 1;
  margin-top: 2px;
}

.block.trabalho .time { color: var(--cat-trabalho-accent); }
.block.estudo   .time { color: #5B6356; }
.block.pessoal  .time { color: var(--color-text-secondary); }
.block.default  .time { color: var(--color-text-secondary); }
```

- [ ] **Step 2: Criar `frontend/src/calendar/CalBlock.tsx`**

```typescript
import { fmtTime } from '../lib/format'
import type { Block } from '../types/calendar'
import type { Category } from '../types/kanban'
import styles from './CalBlock.module.css'

const HOUR_HEIGHT = 52  // px per hour

interface CalBlockProps {
  block: Block
  category: Category | undefined
  dayStartHour: number    // e.g. 6 for 06:00
  onClick: () => void
}

export function CalBlock({ block, category, dayStartHour, onClick }: CalBlockProps) {
  const start = new Date(block.start_datetime)
  const end   = new Date(block.end_datetime)

  const startH = start.getHours() + start.getMinutes() / 60
  const endH   = end.getHours()   + end.getMinutes()   / 60

  const top    = (startH - dayStartHour) * HOUR_HEIGHT
  const height = Math.max((endH - startH) * HOUR_HEIGHT - 2, 14)

  const slug = category?.slug ?? 'default'
  const catClass = (styles as Record<string, string>)[slug] ?? styles.default

  const tooltipText = [
    block.title,
    category?.name ?? '',
    `${fmtTime(start)} – ${fmtTime(end)}`,
  ].filter(Boolean).join('\n')

  const showTime = height >= 28

  return (
    <div
      className={`${styles.block} ${catClass}`}
      style={{ top: `${top}px`, height: `${height}px` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      title={tooltipText}
      aria-label={`${block.title}, ${fmtTime(start)} – ${fmtTime(end)}`}
    >
      <div className={styles.title}>{block.title}</div>
      {showTime && (
        <div className={styles.time}>{fmtTime(start)} – {fmtTime(end)}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/calendar/CalBlock.tsx frontend/src/calendar/CalBlock.module.css
git commit -m "feat(frontend): CalBlock — positioned calendar block with category styling"
```

---

## Task 7: Frontend — NewBlockModal.tsx

**Files:**
- Create: `frontend/src/calendar/NewBlockModal.tsx`
- Create: `frontend/src/calendar/NewBlockModal.module.css`

- [ ] **Step 1: Criar `frontend/src/calendar/NewBlockModal.module.css`**

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(30,28,26,0.4);
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: overlayIn 0.15s ease both;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.modal {
  background: var(--color-bg-surface);
  border-radius: 14px;
  width: 460px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-modal);
  animation: modalIn 0.22s cubic-bezier(0.32, 0.72, 0, 1) both;
}

@keyframes modalIn {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}

.head {
  padding: 20px 24px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 0.5px solid var(--color-border);
}

.title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 400;
}

.closeBtn {
  width: 30px;
  height: 30px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.closeBtn:hover {
  background: rgba(44,44,42,0.06);
  color: var(--color-text-primary);
}

.body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.input, .select {
  background: var(--color-bg-base);
  border: 0.5px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: var(--font-sans);
  color: var(--color-text-primary);
  outline: none;
  width: 100%;
  transition: border-color 0.12s ease;
}

.input:focus, .select:focus {
  border: 1px solid var(--color-accent);
}

.catGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.catBtn {
  padding: 8px;
  border-radius: 8px;
  border: 0.5px solid var(--color-border);
  cursor: pointer;
  font-size: 13px;
  font-family: var(--font-sans);
  transition: box-shadow 0.12s ease;
}

.catBtn.selected {
  box-shadow: 0 0 0 2px var(--color-bg-surface), 0 0 0 4px var(--color-accent);
}

.catBtn.trabalho {
  background: var(--cat-trabalho-bg);
  color: var(--cat-trabalho-text);
}

.catBtn.estudo {
  background: var(--cat-estudo-bg);
  color: var(--cat-estudo-text);
}

.catBtn.pessoal {
  background: var(--cat-pessoal-bg);
  color: var(--cat-pessoal-text);
}

.timeRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.error {
  font-size: 12px;
  color: #DC2626;
}

.foot {
  padding: 16px 24px 20px;
  border-top: 0.5px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancelBtn {
  background: transparent;
  border: 0.5px solid var(--color-border);
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
}

.cancelBtn:hover {
  border-color: var(--color-border-hover);
}

.saveBtn {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 20px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.saveBtn:hover {
  background: var(--color-accent-hover);
}

.saveBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Criar `frontend/src/calendar/NewBlockModal.tsx`**

```typescript
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../shell/Icon'
import type { Category } from '../types/kanban'
import type { Block } from '../types/calendar'
import styles from './NewBlockModal.module.css'

interface NewBlockModalProps {
  categories: Category[]
  initialDate?: string          // ISO date "YYYY-MM-DD"
  editBlock?: Block | null      // if provided, modal is in edit mode
  onSave: (data: Omit<Block, 'id'>) => void
  onDelete?: () => void
  onClose: () => void
}

export function NewBlockModal({
  categories,
  initialDate,
  editBlock,
  onSave,
  onDelete,
  onClose,
}: NewBlockModalProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const today = new Date().toISOString().slice(0, 10)

  const [title,      setTitle]      = useState(editBlock?.title ?? '')
  const [date,       setDate]       = useState(
    editBlock ? editBlock.start_datetime.slice(0, 10) : (initialDate ?? today)
  )
  const [startTime,  setStartTime]  = useState(
    editBlock ? editBlock.start_datetime.slice(11, 16) : '09:00'
  )
  const [endTime,    setEndTime]    = useState(
    editBlock ? editBlock.end_datetime.slice(11, 16) : '10:00'
  )
  const [categoryId, setCategoryId] = useState<string | null>(editBlock?.category_id ?? null)
  const [recurrence, setRecurrence] = useState(editBlock?.recurrence ?? 'none')
  const [error,      setError]      = useState('')

  useEffect(() => {
    titleRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSave() {
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    const start = new Date(`${date}T${startTime}:00`)
    const end   = new Date(`${date}T${endTime}:00`)
    if (end <= start) { setError('O horário de fim deve ser após o início.'); return }
    setError('')
    onSave({
      title: title.trim(),
      start_datetime: start.toISOString(),
      end_datetime:   end.toISOString(),
      category_id:    categoryId,
      card_id:        editBlock?.card_id ?? null,
      recurrence:     recurrence === 'none' ? null : recurrence,
    })
  }

  const isEdit = !!editBlock

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.head}>
          <h2 className={styles.title}>{isEdit ? 'Editar bloco' : 'Novo bloco'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <Icon id="x" size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="block-title">Título</label>
            <input
              id="block-title"
              ref={titleRef}
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Deep work, Aula de Cálculo, Academia…"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Categoria</label>
            <div className={styles.catGrid}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={[
                    styles.catBtn,
                    (styles as Record<string, string>)[cat.slug] ?? '',
                    categoryId === cat.id ? styles.selected : '',
                  ].join(' ')}
                  onClick={() => setCategoryId(categoryId === cat.id ? null : cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="block-date">Data</label>
            <input
              id="block-date"
              type="date"
              className={styles.input}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className={styles.timeRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="block-start">Início</label>
              <input
                id="block-start"
                type="time"
                className={styles.input}
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="block-end">Fim</label>
              <input
                id="block-end"
                type="time"
                className={styles.input}
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="block-rec">Recorrência</label>
            <select
              id="block-rec"
              className={styles.select}
              value={recurrence}
              onChange={e => setRecurrence(e.target.value)}
            >
              <option value="none">Não repetir</option>
              <option value="daily">Todos os dias</option>
              <option value="weekdays">Dias úteis</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
            </select>
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.foot}>
          {isEdit && onDelete && (
            <button
              className={styles.cancelBtn}
              style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
              onClick={onDelete}
            >
              Excluir
            </button>
          )}
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={!title.trim()}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/calendar/NewBlockModal.tsx frontend/src/calendar/NewBlockModal.module.css
git commit -m "feat(frontend): NewBlockModal — create/edit block form with validation"
```

---

## Task 8: Frontend — CalendarScreen.tsx

**Files:**
- Create: `frontend/src/calendar/CalendarScreen.tsx`
- Create: `frontend/src/calendar/CalendarScreen.module.css`

- [ ] **Step 1: Criar `frontend/src/calendar/CalendarScreen.module.css`**

```css
.screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fade-in-up 0.22s ease both;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  flex-shrink: 0;
}

.navCluster {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chevron {
  width: 30px;
  height: 30px;
  background: transparent;
  border: 0.5px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: 16px;
  transition: border-color 0.12s ease, color 0.12s ease;
}

.chevron:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}

.range {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -0.005em;
}

.todayBtn {
  background: transparent;
  border: 0.5px solid var(--color-border);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: border-color 0.12s ease, color 0.12s ease;
}

.todayBtn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.newBlockBtn {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.12s ease;
}

.newBlockBtn:hover {
  background: var(--color-accent-hover);
}

.grid {
  flex: 1;
  background: var(--color-bg-surface);
  border: 0.5px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.gridHeader {
  display: grid;
  grid-template-columns: 56px repeat(7, 1fr);
  border-bottom: 0.5px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-bg-surface);
  position: sticky;
  top: 0;
  z-index: 2;
}

.cornerCell {
  border-right: 0.5px solid var(--color-border);
}

.dayHead {
  padding: 10px 6px 8px;
  text-align: center;
  border-right: 0.5px solid var(--color-border);
}

.dayHead:last-child {
  border-right: none;
}

.dayName {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  display: block;
}

.dayNum {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 400;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.dayHead.today .dayName {
  color: var(--color-accent);
}

.dayHead.today .dayNum {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 2px;
}

.gridBody {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 56px repeat(7, 1fr);
}

.hoursCol {
  border-right: 0.5px solid var(--color-border);
  position: relative;
}

.hourLabel {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-text-secondary);
  text-align: right;
  padding-right: 8px;
  position: absolute;
  right: 0;
  transform: translateY(-50%);
  line-height: 1;
}

.dayCol {
  border-right: 0.5px solid var(--color-border);
  position: relative;
  cursor: pointer;
}

.dayCol:last-child {
  border-right: none;
}

.dayCol.today {
  background: linear-gradient(180deg, rgba(250,236,231,0.32), rgba(250,236,231,0)) 0 0 / 100% 100%;
}

.hourLine {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 0.5px dashed #E5E3DA;
  pointer-events: none;
}

.nowLine {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--color-accent);
  z-index: 3;
  pointer-events: none;
}

.nowDot {
  position: absolute;
  left: -3px;
  top: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-accent);
}

.nowLabel {
  position: absolute;
  right: 4px;
  top: -10px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-accent);
  background: var(--color-bg-surface);
  padding: 1px 4px;
  border-radius: 4px;
  white-space: nowrap;
}
```

- [ ] **Step 2: Criar `frontend/src/calendar/CalendarScreen.tsx`**

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '../shell/Icon'
import { CalBlock } from './CalBlock'
import { NewBlockModal } from './NewBlockModal'
import { useBlocks, useCreateBlock, useDeleteBlock, useUpdateBlock } from '../hooks/useBlocks'
import { useCategories } from '../hooks/useCategories'
import { fmtDateRange, fmtTime } from '../lib/format'
import type { Block } from '../types/calendar'
import styles from './CalendarScreen.module.css'

const DAY_START = 6    // 06:00
const DAY_END   = 23   // 23:00
const HOUR_HEIGHT = 52 // px

const PT_WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function getMondayOf(d: Date): Date {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function toWeekStartParam(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function CalendarScreen() {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()))
  const [now, setNow] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editBlock, setEditBlock] = useState<Block | null>(null)

  const weekParam = toWeekStartParam(weekStart)
  const { data: blocks = [] } = useBlocks(weekParam)
  const { data: categories = [] } = useCategories()
  const createBlock = useCreateBlock()
  const updateBlock = useUpdateBlock()
  const deleteBlock = useDeleteBlock()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d
    }),
    [weekStart]
  )

  const today = new Date()
  today.setHours(0,0,0,0)

  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)
  const gridHeight = (DAY_END - DAY_START) * HOUR_HEIGHT

  const nowTodayIdx = days.findIndex(d => d.toDateString() === new Date().toDateString())
  const nowOffsetY = ((now.getHours() + now.getMinutes() / 60) - DAY_START) * HOUR_HEIGHT

  function blocksForDay(day: Date): Block[] {
    const dateStr = day.toISOString().slice(0, 10)
    return blocks.filter(b => b.start_datetime.startsWith(dateStr))
  }

  const rangeLabel = fmtDateRange(days[0], days[6])

  const handleSave = useCallback((data: Omit<Block, 'id'>) => {
    if (editBlock) {
      updateBlock.mutate({ id: editBlock.id, ...data })
    } else {
      createBlock.mutate(data)
    }
    setShowModal(false)
    setEditBlock(null)
  }, [editBlock, createBlock, updateBlock])

  const handleDelete = useCallback(() => {
    if (!editBlock) return
    // RN-CAL-04: only show confirm if block has a linked card
    if (editBlock.card_id) {
      const confirmed = window.confirm(
        `Este bloco está vinculado ao calendário. Ao excluir o bloco, o card será mantido. Deseja continuar?`
      )
      if (!confirmed) return
    }
    deleteBlock.mutate(editBlock.id)
    setShowModal(false)
    setEditBlock(null)
  }, [editBlock, deleteBlock])

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.navCluster}>
          <button
            className={styles.chevron}
            aria-label="Semana anterior"
            onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
          >
            ‹
          </button>
          <span className={styles.range}>{rangeLabel}</span>
          <button
            className={styles.chevron}
            aria-label="Próxima semana"
            onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
          >
            ›
          </button>
          <button className={styles.todayBtn} onClick={() => setWeekStart(getMondayOf(new Date()))}>
            Hoje
          </button>
        </div>
        <button className={styles.newBlockBtn} onClick={() => { setEditBlock(null); setShowModal(true) }}>
          <Icon id="plus" size={14} />
          Novo Bloco
        </button>
      </div>

      <div className={styles.grid}>
        {/* Header row */}
        <div className={styles.gridHeader}>
          <div className={styles.cornerCell} />
          {days.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString()
            return (
              <div key={i} className={`${styles.dayHead} ${isToday ? styles.today : ''}`}>
                <span className={styles.dayName}>{PT_WEEKDAYS[day.getDay()]}</span>
                <span className={styles.dayNum}>{day.getDate()}</span>
              </div>
            )
          })}
        </div>

        {/* Body: hours + day columns */}
        <div className={styles.gridBody}>
          {/* Hours column */}
          <div className={styles.hoursCol} style={{ height: `${gridHeight}px` }}>
            {hours.map(h => (
              <span
                key={h}
                className={styles.hourLabel}
                style={{ top: `${(h - DAY_START) * HOUR_HEIGHT}px` }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, colIdx) => {
            const isToday = day.toDateString() === new Date().toDateString()
            const dayBlocks = blocksForDay(day)

            return (
              <div
                key={colIdx}
                className={`${styles.dayCol} ${isToday ? styles.today : ''}`}
                style={{ height: `${gridHeight}px` }}
                onClick={() => {
                  setEditBlock(null)
                  setShowModal(true)
                }}
              >
                {/* Hour gridlines */}
                {hours.map(h => (
                  <div
                    key={h}
                    className={styles.hourLine}
                    style={{ top: `${(h - DAY_START) * HOUR_HEIGHT}px` }}
                  />
                ))}

                {/* Now-line — only on today's column */}
                {isToday && nowOffsetY >= 0 && nowOffsetY <= gridHeight && (
                  <div className={styles.nowLine} style={{ top: `${nowOffsetY}px` }}>
                    <div className={styles.nowDot} />
                    <span className={styles.nowLabel}>{fmtTime(now)}</span>
                  </div>
                )}

                {/* Blocks */}
                {dayBlocks.map(block => (
                  <CalBlock
                    key={block.id}
                    block={block}
                    category={block.category_id ? catMap[block.category_id] : undefined}
                    dayStartHour={DAY_START}
                    onClick={e => {
                      (e as unknown as MouseEvent).stopPropagation?.()
                      setEditBlock(block)
                      setShowModal(true)
                    }}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {showModal && (
        <NewBlockModal
          categories={categories}
          editBlock={editBlock}
          onSave={handleSave}
          onDelete={editBlock ? handleDelete : undefined}
          onClose={() => { setShowModal(false); setEditBlock(null) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/calendar/
git commit -m "feat(frontend): CalendarScreen — weekly grid, now-line, create/edit blocks"
```

---

## Task 9: Frontend — FocusRing.tsx

**Files:**
- Create: `frontend/src/focus/FocusRing.tsx`

- [ ] **Step 1: Criar `frontend/src/focus/FocusRing.tsx`**

```typescript
interface FocusRingProps {
  progress: number  // 0..1 (0 = empty, 1 = full)
  size?: number
}

export function FocusRing({ progress, size = 340 }: FocusRingProps) {
  const r = (size - 12) / 2          // radius (accounts for stroke-width)
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)))

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}
      aria-hidden="true"
    >
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="2"
        opacity="0.6"
      />
      {/* Progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.95s linear' }}
      />
    </svg>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/focus/FocusRing.tsx
git commit -m "feat(frontend): FocusRing — animated SVG progress ring"
```

---

## Task 10: Frontend — CardPicker.tsx

**Files:**
- Create: `frontend/src/focus/CardPicker.tsx`
- Create: `frontend/src/focus/CardPicker.module.css`

- [ ] **Step 1: Criar `frontend/src/focus/CardPicker.module.css`**

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(30,28,26,0.4);
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--color-bg-surface);
  border-radius: 14px;
  width: 480px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-modal);
  animation: modalIn 0.22s cubic-bezier(0.32, 0.72, 0, 1) both;
  overflow: hidden;
}

@keyframes modalIn {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}

.head {
  padding: 18px 20px 14px;
  border-bottom: 0.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 400;
}

.closeBtn {
  width: 30px;
  height: 30px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list {
  overflow-y: auto;
  flex: 1;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 0.5px solid var(--color-border);
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.item:last-child {
  border-bottom: none;
}

.item:hover {
  background: var(--color-bg-base);
}

.itemLeft {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.itemTitle {
  font-size: 14px;
  color: var(--color-text-primary);
}

.itemMeta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 999px;
}

.tag.trabalho { background: var(--cat-trabalho-bg); color: var(--cat-trabalho-text); }
.tag.estudo   { background: var(--cat-estudo-bg);   color: var(--cat-estudo-text); border: 0.5px solid var(--cat-estudo-accent); }
.tag.pessoal  { background: var(--cat-pessoal-bg);  color: var(--cat-pessoal-text); border: 0.5px solid var(--cat-pessoal-accent); }

.focusTime {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 3px;
}

.arrow {
  color: var(--color-text-secondary);
  font-size: 16px;
}

.empty {
  padding: 32px 20px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}
```

- [ ] **Step 2: Criar `frontend/src/focus/CardPicker.tsx`**

```typescript
import { Icon } from '../shell/Icon'
import { fmtDuration } from '../lib/format'
import type { Card, Category } from '../types/kanban'
import styles from './CardPicker.module.css'

interface CardPickerProps {
  cards: Card[]
  categories: Category[]
  onSelect: (card: Card) => void
  onClose: () => void
}

export function CardPicker({ cards, categories, onSelect, onClose }: CardPickerProps) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog">
        <div className={styles.head}>
          <h2 className={styles.title}>Selecionar tarefa</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <Icon id="x" size={16} />
          </button>
        </div>

        <div className={styles.list}>
          {cards.length === 0 ? (
            <div className={styles.empty}>Nenhum card disponível. Crie cards no Kanban primeiro.</div>
          ) : (
            cards.map(card => {
              const cat = card.category_id ? catMap[card.category_id] : undefined
              const tagClass = cat ? (styles as Record<string, string>)[cat.slug] ?? '' : ''
              return (
                <div
                  key={card.id}
                  className={styles.item}
                  onClick={() => onSelect(card)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') onSelect(card) }}
                >
                  <div className={styles.itemLeft}>
                    <span className={styles.itemTitle}>{card.title}</span>
                    <div className={styles.itemMeta}>
                      {cat && (
                        <span className={`${styles.tag} ${tagClass}`}>{cat.name}</span>
                      )}
                      {card.total_focus_time > 0 && (
                        <span className={styles.focusTime}>
                          <Icon id="clock" size={11} />
                          {fmtDuration(card.total_focus_time)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={styles.arrow}>→</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/focus/CardPicker.tsx frontend/src/focus/CardPicker.module.css
git commit -m "feat(frontend): CardPicker — modal to select a card before starting focus"
```

---

## Task 11: Frontend — FocusScreen.tsx

**Files:**
- Create: `frontend/src/focus/FocusScreen.tsx`
- Create: `frontend/src/focus/FocusScreen.module.css`

- [ ] **Step 1: Criar `frontend/src/focus/FocusScreen.module.css`**

```css
.screen {
  margin: -32px;
  height: calc(100% + 64px);
  display: flex;
  flex-direction: column;
  animation: fade-in-up 0.22s ease both;
}

.stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 32px;
}

/* ---- Idle state ---- */

.idleIcon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-accent-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
}

.idleTitle {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}

.idleHelper {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.selectBtn {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 10px 24px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.12s ease;
}

.selectBtn:hover {
  background: var(--color-accent-hover);
}

.durSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.durLabel {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.durRow {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--color-bg-surface);
  border: 0.5px solid var(--color-border);
  border-radius: 999px;
  padding: 4px 6px;
}

.durChip {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color 0.1s ease, color 0.1s ease;
}

.durChip.active {
  background: var(--color-accent);
  color: #fff;
}

.durChip:hover:not(.active) {
  background: var(--color-bg-base);
  color: var(--color-text-primary);
}

.customInput {
  font-family: var(--font-mono);
  font-size: 12px;
  width: 52px;
  padding: 5px 8px;
  border-radius: 999px;
  border: 0.5px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  text-align: center;
  outline: none;
}

.customInput:focus {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

/* ---- Active state ---- */

.eyebrow {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.taskTitle {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.2;
  text-align: center;
  max-width: 620px;
  text-wrap: pretty;
}

.taskCat {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.catDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
}

.ringWrap {
  position: relative;
  width: 340px;
  height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timerText {
  position: absolute;
  font-family: var(--font-mono);
  font-size: 96px;
  font-weight: 400;
  letter-spacing: -0.04em;
  color: var(--color-accent);
  line-height: 1;
  transition: opacity 0.25s ease;
}

.timerText.paused {
  opacity: 0.55;
}

.freeModeBadge {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: var(--color-accent-bg);
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.controlBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 999px;
  border: 0.5px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.controlBtn:hover {
  background: var(--color-bg-base);
  border-color: var(--color-border-hover);
}

/* ---- History footer ---- */

.history {
  border-top: 0.5px solid var(--color-border);
  background: var(--color-bg-surface);
  padding: 14px 24px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.historyLabel {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.historyChips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.historyChips::-webkit-scrollbar { display: none; }

.chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-base);
  border-radius: 8px;
  padding: 6px 12px;
  flex-shrink: 0;
}

.chipTitle {
  font-size: 12px;
  color: var(--color-text-primary);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chipDur {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-accent);
}

.chipTime {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-text-secondary);
}

.historyTotal {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.historyTotalLabel {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  border-left: 0.5px solid var(--color-border);
  padding-left: 10px;
}

.historyTotalValue {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 500;
  color: var(--color-accent);
}
```

- [ ] **Step 2: Criar `frontend/src/focus/FocusScreen.tsx`**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { FocusRing } from './FocusRing'
import { CardPicker } from './CardPicker'
import { Icon } from '../shell/Icon'
import { fmtTimer, fmtDuration, fmtTime } from '../lib/format'
import { useFocusStore, type DurKey } from '../store/focusStore'
import { useCards } from '../hooks/useCards'
import { useCategories } from '../hooks/useCategories'
import { useActiveSession, useCreateSession, useDiscardSession, useEndSession, useHeartbeat, useTodaySessions } from '../hooks/useSessions'
import type { Card } from '../types/kanban'
import styles from './FocusScreen.module.css'

const DUR_OPTIONS: { key: DurKey; label: string }[] = [
  { key: '15',     label: '15min' },
  { key: '25',     label: '25min' },
  { key: '45',     label: '45min' },
  { key: '60',     label: '60min' },
  { key: 'free',   label: 'Livre' },
]

export function FocusScreen() {
  const {
    activeSessionId, elapsed, running, paused,
    mode, durKey, customMin, durationSeconds,
    setActiveSession, setElapsed, setRunning, setPaused,
    setDurKey, setCustomMin, reset,
  } = useFocusStore()

  const [showPicker, setShowPicker]         = useState(false)
  const [selectedCard, setSelectedCard]     = useState<Card | null>(null)
  const [recoverySession, setRecoverySession] = useState<{ id: string; title: string; elapsed: number } | null>(null)

  const { data: cards = [] } = useCards()
  const { data: categories = [] } = useCategories()
  const { data: activeSession } = useActiveSession()
  const { data: todaySessions = [] } = useTodaySessions()

  const createSession = useCreateSession()
  const endSession    = useEndSession()
  const discard       = useDiscardSession()
  const heartbeat     = useHeartbeat(activeSessionId)

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  // Detect orphaned session on mount (RN-FOC-05)
  useEffect(() => {
    if (!activeSession) return
    if (activeSessionId) return  // already tracking it in this session
    const started = new Date(activeSession.started_at)
    const hb = activeSession.last_heartbeat_at
      ? new Date(activeSession.last_heartbeat_at)
      : started
    const ageH = (Date.now() - hb.getTime()) / 3_600_000
    if (ageH > 24) {
      // Too old — auto-discard (RN-FOC-05)
      discard.mutate(activeSession.id)
      return
    }
    const recoveredElapsed = Math.floor((hb.getTime() - started.getTime()) / 1000)
    setRecoverySession({
      id: activeSession.id,
      title: activeSession.card_title_snapshot,
      elapsed: recoveredElapsed,
    })
  }, [activeSession])  // eslint-disable-line

  // Tick interval
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1
        if (durationSeconds !== null && next >= durationSeconds) {
          // RN-FOC-07: auto-end in fixed mode
          clearInterval(id)
          setRunning(false)
          if (activeSessionId) {
            endSession.mutate({ id: activeSessionId, elapsed_seconds: durationSeconds })
          }
          reset()
          return durationSeconds
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, durationSeconds, activeSessionId])  // eslint-disable-line

  // Heartbeat: send every 30s while running (RN-FOC-05)
  useEffect(() => {
    if (!running || !activeSessionId) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      return
    }
    heartbeatRef.current = setInterval(() => {
      heartbeat.mutate()
    }, 30_000)
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [running, activeSessionId])  // eslint-disable-line

  async function handleSelectCard(card: Card) {
    setShowPicker(false)
    const cat = card.category_id ? catMap[card.category_id] : null
    const session = await createSession.mutateAsync({
      card_id: card.id,
      card_title_snapshot: card.title,
      card_cat_snapshot: cat?.name ?? null,
      mode,
      duration_seconds: durationSeconds,
    })
    setSelectedCard(card)
    setActiveSession(session.id)
    setElapsed(0)
    setRunning(true)
    setPaused(false)
  }

  function handlePauseResume() {
    if (running && !paused) {
      setRunning(false)
      setPaused(true)
    } else {
      setRunning(true)
      setPaused(false)
    }
  }

  function handleStop() {
    if (!activeSessionId) return
    endSession.mutate({ id: activeSessionId, elapsed_seconds: elapsed })
    reset()
    setSelectedCard(null)
  }

  function handleRecoveryCountabilize() {
    if (!recoverySession) return
    endSession.mutate({ id: recoverySession.id, elapsed_seconds: recoverySession.elapsed })
    setRecoverySession(null)
  }

  function handleRecoveryDiscard() {
    if (!recoverySession) return
    discard.mutate(recoverySession.id)
    setRecoverySession(null)
  }

  const progress = (durationSeconds && elapsed > 0) ? elapsed / durationSeconds : 0
  const isActive = !!activeSessionId && running !== false
  const isFree = mode === 'free'

  const totalTodaySeconds = todaySessions.reduce((acc, s) => acc + (s.elapsed_seconds ?? 0), 0)

  return (
    <div className={styles.screen}>
      {/* Recovery modal */}
      {recoverySession && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(30,28,26,0.5)',
          zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--color-bg-surface)', borderRadius: 14,
            padding: '28px 32px', maxWidth: 420, width: '90%',
            boxShadow: 'var(--shadow-modal)', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400 }}>
              Sessão interrompida
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Você tinha uma sessão ativa para <strong>{recoverySession.title}</strong>.
              Deseja contabilizar o tempo decorrido ({fmtDuration(recoverySession.elapsed)})?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={handleRecoveryDiscard}
                style={{
                  background: 'transparent', border: '0.5px solid var(--color-border)',
                  borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer',
                }}
              >
                Descartar
              </button>
              <button
                onClick={handleRecoveryCountabilize}
                style={{
                  background: 'var(--color-accent)', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '7px 20px', fontSize: 13, cursor: 'pointer',
                }}
              >
                Contabilizar {fmtDuration(recoverySession.elapsed)}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.stage}>
        {!isActive && !paused ? (
          /* ---- IDLE ---- */
          <>
            <div className={styles.idleIcon}>
              <Icon id="focus" size={28} />
            </div>
            <h1 className={styles.idleTitle}>Nenhuma tarefa em foco</h1>
            <p className={styles.idleHelper}>Selecione um card do Kanban para começar</p>
            <button className={styles.selectBtn} onClick={() => setShowPicker(true)}>
              <Icon id="play" size={14} />
              Selecionar Tarefa
            </button>

            <div className={styles.durSection}>
              <span className={styles.durLabel}>Duração da sessão</span>
              <div className={styles.durRow}>
                {DUR_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className={`${styles.durChip} ${durKey === opt.key ? styles.active : ''}`}
                    onClick={() => setDurKey(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
                <input
                  type="number"
                  className={`${styles.customInput} ${durKey === 'custom' ? styles.active : ''}`}
                  value={customMin}
                  min={1}
                  max={999}
                  placeholder="min"
                  onChange={e => {
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v) && v > 0) {
                      setCustomMin(v)
                      setDurKey('custom')
                    }
                  }}
                  onFocus={() => setDurKey('custom')}
                  aria-label="Duração personalizada em minutos"
                />
              </div>
            </div>
          </>
        ) : (
          /* ---- ACTIVE ---- */
          <>
            <span className={styles.eyebrow}>EM FOCO</span>
            <h2 className={styles.taskTitle}>{selectedCard?.title ?? '—'}</h2>
            {selectedCard?.category_id && catMap[selectedCard.category_id] && (
              <span className={styles.taskCat}>
                <span className={styles.catDot} />
                {catMap[selectedCard.category_id].name.toUpperCase()}
              </span>
            )}

            <div className={styles.ringWrap}>
              <FocusRing progress={isFree ? 0 : progress} />
              {isFree && (
                <div className={styles.freeModeBadge}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
                  Cronômetro livre
                </div>
              )}
              <span className={`${styles.timerText} ${paused ? styles.paused : ''}`}>
                {isFree
                  ? fmtTimer(elapsed)
                  : fmtTimer(Math.max(0, (durationSeconds ?? 0) - elapsed))
                }
              </span>
            </div>

            <div className={styles.controls}>
              <button className={styles.controlBtn} onClick={handlePauseResume}>
                <Icon id={running ? 'pause' : 'play'} size={14} />
                {running ? 'Pausar' : 'Retomar'}
              </button>
              <button className={styles.controlBtn} onClick={handleStop}>
                <Icon id="stop" size={14} />
                Encerrar
              </button>
            </div>
          </>
        )}
      </div>

      {/* History footer */}
      <div className={styles.history}>
        <span className={styles.historyLabel}>Histórico hoje</span>
        <div className={styles.historyChips}>
          {todaySessions.length === 0 && (
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Nenhuma sessão hoje</span>
          )}
          {todaySessions.map(s => (
            <div key={s.id} className={styles.chip}>
              <span className={styles.chipTitle}>{s.card_title_snapshot}</span>
              <span className={styles.chipDur}>{fmtDuration(s.elapsed_seconds ?? 0)}</span>
              <span className={styles.chipTime}>{fmtTime(new Date(s.started_at))}</span>
            </div>
          ))}
        </div>
        {totalTodaySeconds > 0 && (
          <div className={styles.historyTotal}>
            <span className={styles.historyTotalLabel}>Total hoje</span>
            <span className={styles.historyTotalValue}>{fmtDuration(totalTodaySeconds)}</span>
          </div>
        )}
      </div>

      {showPicker && (
        <CardPicker
          cards={cards}
          categories={categories}
          onSelect={handleSelectCard}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/focus/
git commit -m "feat(frontend): FocusScreen — timer, ring, picker, heartbeat, recovery"
```

---

## Task 12: Conectar CalendarScreen e FocusScreen no App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Atualizar `frontend/src/App.tsx`**

```typescript
import { useAppStore } from './store/appStore'
import { Sidebar } from './shell/Sidebar'
import { TopBar } from './shell/TopBar'
import { Placeholder } from './shell/Placeholder'
import { KanbanScreen } from './kanban/KanbanScreen'
import { CalendarScreen } from './calendar/CalendarScreen'
import { FocusScreen } from './focus/FocusScreen'

export function App() {
  const { activeScreen } = useAppStore()

  function renderScreen() {
    switch (activeScreen) {
      case 'dashboard': return <Placeholder icon="dashboard" title="Dashboard" subtitle="Em breve" />
      case 'calendar':  return <CalendarScreen />
      case 'kanban':    return <KanbanScreen />
      case 'focus':     return <FocusScreen />
      case 'finance':   return <Placeholder icon="finance"   title="Financeiro" subtitle="Em desenvolvimento — Fase 2" />
    }
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="app__main">
        <TopBar activeScreen={activeScreen} />
        <main className="app__content">
          <div key={activeScreen} className="screen-enter">
            {renderScreen()}
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Smoke test no navegador (`http://localhost:3000`)**

Verificar:
- Calendário: semana atual carrega, navegação ‹ › muda a semana, "Hoje" volta à semana atual
- Hoje coluna tem gradiente coral suave e now-line coral
- "+ Novo Bloco" abre modal com 3 categorias visuais
- Salvar cria bloco no calendário (persiste após F5)
- Clicar em bloco existente abre modal de edição
- Foco: tela idle mostra icon coral + título + chips de duração
- Selecionar tarefa abre CardPicker com todos os cards
- Iniciar sessão faz o ring aparecer e timer rodar
- Pausar escurece o timer
- Encerrar registra sessão e aparece no histórico do footer
- Fechar aba com sessão ativa, reabrir → modal de recuperação aparece

- [ ] **Step 3: Tag de milestone**

```bash
git tag v0.3.0-calendar-focus
git commit --allow-empty -m "chore: calendar + focus milestone — weekly grid + timer + recovery"
```

---

## Self-Review

**Spec coverage:**
- [x] CAL-01: criar bloco com título, horário, categoria
- [x] CAL-02: editar e excluir bloco
- [x] CAL-03: navegação entre semanas
- [x] CAL-04: botão "Hoje"
- [x] CAL-05: vínculo card↔bloco (implementado no backend, wired no Plano 4)
- [x] CAL-06: diferenciação visual por categoria
- [x] RN-CAL-01: bloco sem card permitido
- [x] RN-CAL-04: excluir bloco não exclui card
- [x] RN-CAL-06: validação end > start (Pydantic + modal)
- [x] FOC-01: card obrigatório para iniciar
- [x] FOC-02: modo fixo com countdown
- [x] FOC-03: modo livre (cronômetro crescente)
- [x] FOC-04: tempo registrado no card após encerramento
- [x] FOC-05: troca de modo antes de iniciar
- [x] FOC-06: recuperação de sessão interrompida
- [x] RN-FOC-01 a RN-FOC-11: todos implementados
