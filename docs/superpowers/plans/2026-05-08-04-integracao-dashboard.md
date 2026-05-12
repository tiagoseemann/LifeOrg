# LifeOrg — Plano 4: Integração Cross-Screen + Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Integrar os módulos: "Iniciar Foco" no drawer do Kanban navega para Foco e inicia sessão; "Ver Card" no Foco navega para Kanban e abre o drawer do card; vínculo Card↔Bloco de Calendário funcional via Drawer e modal. (2) Implementar o Dashboard com métricas reais, gráfico de distribuição de tempo, preview do Kanban e agenda do dia.

**Architecture:** Cross-screen navigation usa apenas `useAppStore.setActive()` + `useKanbanStore.selectCard()`. Não há router. Dashboard é somente leitura — agrega dados de queries já existentes. O gráfico de pizza/donut é implementado com SVG puro (sem biblioteca de charts).

**Tech Stack:** React 18 + TypeScript + CSS Modules + Zustand + TanStack Query (sem dependências novas)

**Pré-requisito:** Planos 1, 2 e 3 concluídos — Kanban, Calendário e Foco todos funcionais com persistência.

---

## Escopo do Plano 4

Produz o produto MVP completo. Após este plano, o fluxo completo ver → planejar → executar → registrar funciona end-to-end.

---

## Estrutura de Arquivos

```
frontend/src/
├── kanban/
│   └── Drawer.tsx           ← Modify: wire "Iniciar Foco" CTA
├── focus/
│   └── FocusScreen.tsx      ← Modify: wire "Ver Card" button
├── calendar/
│   └── NewBlockModal.tsx    ← Modify: add card picker for linking
├── App.tsx                  ← Modify: pass cross-screen handlers down
├── dashboard/
│   ├── Dashboard.tsx + Dashboard.module.css
│   ├── MetricCard.tsx + MetricCard.module.css
│   ├── TimePie.tsx + TimePie.module.css
│   ├── AgendaPanel.tsx + AgendaPanel.module.css
│   └── KanbanPreview.tsx + KanbanPreview.module.css
```

---

## Task 1: Cross-screen — "Iniciar Foco" no Drawer do Kanban

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/kanban/KanbanScreen.tsx`
- Modify: `frontend/src/kanban/Drawer.tsx`

- [ ] **Step 1: Adicionar `onStartFocus` prop em `Drawer.tsx`**

A prop já existe mas está apontando para um `alert()`. Alterar a assinatura para receber `onStartFocus: (card: Card) => void` e chamar com o card atual.

Abrir `frontend/src/kanban/Drawer.tsx`. Alterar:

```typescript
interface DrawerProps {
  card: Card
  columns: Column[]
  categories: Category[]
  onClose: () => void
  onChange: (updates: Partial<Card>) => void
  onStartFocus: (card: Card) => void  // was: () => void
}
```

E no botão CTA:

```typescript
<button className={styles.ctaBtn} onClick={() => onStartFocus(card)}>
  <Icon id="play" size={14} />
  Iniciar Foco
</button>
```

- [ ] **Step 2: Implementar handler em `KanbanScreen.tsx`**

Adicionar prop `onStartFocus: (card: Card) => void` ao componente `KanbanScreen`.

No `<Drawer>`, substituir:

```typescript
onStartFocus={() => {
  alert('Módulo Foco será integrado no Plano 4')
}}
```

por:

```typescript
onStartFocus={onStartFocus}
```

- [ ] **Step 3: Wiring em `App.tsx`**

Adicionar handler em `App.tsx` que:
1. Define o card selecionado no `focusStore` antes de navegar
2. Chama `setActive('focus')`

```typescript
import { useAppStore } from './store/appStore'
import { useKanbanStore } from './store/kanbanStore'
import { useFocusStore } from './store/focusStore'
import type { Card } from './types/kanban'

// ...inside App():
const { setActive } = useAppStore()
const { selectCard } = useKanbanStore()
const { setDurKey } = useFocusStore()

function handleStartFocusFromCard(card: Card) {
  // Close the drawer
  selectCard(null)
  // Navigate to focus with card pre-selected
  // FocusScreen will auto-open picker with this card highlighted
  // For simplicity: store the pending card id in focusStore
  // then FocusScreen reads it on mount and auto-starts
  setActive('focus')
}
```

Since FocusScreen manages its own session start via the picker, we use a lightweight approach: store a `pendingCardId` in focusStore, and FocusScreen reads it on mount to auto-open the picker pre-selected.

Add to `focusStore.ts`:

```typescript
pendingCardId: string | null
setPendingCardId: (id: string | null) => void
```

And the default:

```typescript
pendingCardId: null,
setPendingCardId: (id) => set({ pendingCardId: id }),
```

Update `handleStartFocusFromCard` in App.tsx:

```typescript
function handleStartFocusFromCard(card: Card) {
  selectCard(null)
  useFocusStore.getState().setPendingCardId(card.id)
  setActive('focus')
}
```

In `FocusScreen.tsx`, add an effect that runs on mount:

```typescript
const { pendingCardId, setPendingCardId } = useFocusStore()

useEffect(() => {
  if (!pendingCardId) return
  const card = cards.find(c => c.id === pendingCardId)
  if (card) {
    setPendingCardId(null)
    // Auto-select the card and start session
    handleSelectCard(card)
  }
}, [pendingCardId, cards])  // eslint-disable-line
```

Pass `onStartFocus` down through `App → KanbanScreen`:

```typescript
case 'kanban': return <KanbanScreen onStartFocus={handleStartFocusFromCard} />
```

- [ ] **Step 4: Testar**

1. Ir para Kanban, clicar em um card → abrir Drawer
2. Clicar "Iniciar Foco"
3. Verificar: navega para tela de Foco com sessão iniciada automaticamente para o card selecionado

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: cross-screen — 'Iniciar Foco' from Kanban drawer starts focus session"
```

---

## Task 2: Cross-screen — "Ver Card" no FocusScreen

**Files:**
- Modify: `frontend/src/focus/FocusScreen.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Adicionar prop `onGoToCard` ao `FocusScreen`**

```typescript
interface FocusScreenProps {
  onGoToCard: (cardId: string) => void
}

export function FocusScreen({ onGoToCard }: FocusScreenProps) {
```

- [ ] **Step 2: Adicionar botão "Ver Card" nos controles do estado active**

Após o botão "Encerrar", adicionar:

```typescript
{selectedCard && (
  <button className={styles.controlBtn} onClick={() => onGoToCard(selectedCard.id)}>
    <Icon id="arrow-out" size={14} />
    Ver Card
  </button>
)}
```

- [ ] **Step 3: Implementar handler em `App.tsx`**

```typescript
function handleGoToCard(cardId: string) {
  selectCard(cardId)
  setActive('kanban')
}
```

Passar ao FocusScreen:

```typescript
case 'focus': return <FocusScreen onGoToCard={handleGoToCard} />
```

- [ ] **Step 4: Testar**

1. Iniciar sessão de foco em um card
2. Clicar "Ver Card"
3. Verificar: navega para Kanban com o drawer do card aberto

- [ ] **Step 5: Commit**

```bash
git add frontend/src/focus/FocusScreen.tsx frontend/src/App.tsx
git commit -m "feat: cross-screen — 'Ver Card' from Focus navigates to Kanban drawer"
```

---

## Task 3: Cross-screen — vínculo Card↔Bloco no modal de calendário

**Files:**
- Modify: `frontend/src/calendar/NewBlockModal.tsx`
- Modify: `frontend/src/calendar/CalendarScreen.tsx`

- [ ] **Step 1: Adicionar prop `cards` e state `cardId` ao `NewBlockModal`**

Adicionar prop:

```typescript
interface NewBlockModalProps {
  categories: Category[]
  cards: Card[]               // new
  initialDate?: string
  editBlock?: Block | null
  onSave: (data: Omit<Block, 'id'>) => void
  onDelete?: () => void
  onClose: () => void
}
```

Adicionar state:

```typescript
const [cardId, setCardId] = useState<string | null>(editBlock?.card_id ?? null)
```

- [ ] **Step 2: Adicionar campo "Vincular Card" no formulário**

Após o campo de Recorrência, antes de `{error && ...}`:

```typescript
<div className={styles.field}>
  <label className={styles.label} htmlFor="block-card">Vincular ao card (opcional)</label>
  <select
    id="block-card"
    className={styles.select}
    value={cardId ?? ''}
    onChange={e => setCardId(e.target.value || null)}
  >
    <option value="">— nenhum —</option>
    {cards.map(c => (
      <option key={c.id} value={c.id}>{c.title}</option>
    ))}
  </select>
</div>
```

- [ ] **Step 3: Incluir `card_id` no payload de `handleSave`**

```typescript
onSave({
  title: title.trim(),
  start_datetime: start.toISOString(),
  end_datetime:   end.toISOString(),
  category_id:    categoryId,
  card_id:        cardId,            // ← add
  recurrence:     recurrence === 'none' ? null : recurrence,
})
```

- [ ] **Step 4: Passar `cards` ao modal em `CalendarScreen.tsx`**

```typescript
const { data: cards = [] } = useCards()  // add this import/hook

// In the modal render:
{showModal && (
  <NewBlockModal
    categories={categories}
    cards={cards}            // ← add
    editBlock={editBlock}
    onSave={handleSave}
    onDelete={editBlock ? handleDelete : undefined}
    onClose={() => { setShowModal(false); setEditBlock(null) }}
  />
)}
```

- [ ] **Step 5: Testar**

1. Criar um bloco de calendário
2. No campo "Vincular ao card", selecionar um card existente
3. Salvar → verificar que o bloco aparece com `card_id` preenchido (inspecionar API ou reabrir modal)
4. Deletar o bloco → verificar que o card ainda existe no Kanban

- [ ] **Step 6: Commit**

```bash
git add frontend/src/calendar/
git commit -m "feat: cross-screen — card↔block linking in calendar modal (RN-CAL-01, RN-KAN-10)"
```

---

## Task 4: Dashboard — MetricCard.tsx

**Files:**
- Create: `frontend/src/dashboard/MetricCard.tsx`
- Create: `frontend/src/dashboard/MetricCard.module.css`

- [ ] **Step 1: Criar `frontend/src/dashboard/MetricCard.module.css`**

```css
.card {
  background: var(--color-bg-surface);
  border: 0.5px solid var(--color-border);
  border-radius: 12px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.12s ease, box-shadow 0.14s ease, transform 0.14s ease;
}

.card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-metric-hover);
  transform: translateY(-1px);
}

.label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.value {
  font-family: var(--font-display);
  font-size: 38px;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1;
  color: var(--color-text-primary);
}

.value.mono {
  font-family: var(--font-mono);
  font-size: 30px;
  font-weight: 500;
  color: var(--color-accent);
}

.sub {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.progress {
  height: 4px;
  background: var(--color-bg-base);
  border-radius: 999px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 999px;
  transition: width 0.35s ease;
}

.nextTime {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-accent);
}

.nextTitle {
  font-size: 17px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.nextPill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--color-accent-bg);
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 999px;
}

.pulseDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: pulse 2s infinite;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Criar `frontend/src/dashboard/MetricCard.tsx`**

```typescript
import { fmtDuration, fmtTime } from '../lib/format'
import type { Block } from '../types/calendar'
import styles from './MetricCard.module.css'

// ---- Metric: Tarefas hoje ----
interface TasksMetricProps {
  done: number
  total: number
}

export function TasksMetricCard({ done, total }: TasksMetricProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const remaining = total - done

  return (
    <div className={styles.card}>
      <span className={styles.label}>Tarefas hoje</span>
      <div className={styles.value}>
        {done} <span style={{ fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)' }}>/ {total}</span>
      </div>
      <div className={styles.progress}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.sub}>
        <strong>{pct}%</strong> concluído · {remaining} {remaining === 1 ? 'restante' : 'restantes'}
      </span>
    </div>
  )
}

// ---- Metric: Foco acumulado ----
interface FocusMetricProps {
  totalSeconds: number
}

export function FocusMetricCard({ totalSeconds }: FocusMetricProps) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>Foco acumulado</span>
      <div className={`${styles.value} ${styles.mono}`}>{fmtDuration(totalSeconds)}</div>
      <span className={styles.sub}>tempo total de sessões hoje</span>
    </div>
  )
}

// ---- Metric: Próximo bloco ----
interface NextBlockMetricProps {
  block: Block | null
}

export function NextBlockMetricCard({ block }: NextBlockMetricProps) {
  if (!block) {
    return (
      <div className={styles.card}>
        <span className={styles.label}>Próximo bloco</span>
        <span className={styles.sub} style={{ marginTop: 8 }}>Nenhum bloco agendado para hoje</span>
      </div>
    )
  }

  const start = new Date(block.start_datetime)
  const now = Date.now()
  const diffMs = start.getTime() - now
  const diffMin = Math.max(0, Math.floor(diffMs / 60_000))
  const diffH = Math.floor(diffMin / 60)
  const remMin = diffMin % 60

  let countdown = ''
  if (diffMs <= 0) {
    countdown = 'em andamento'
  } else if (diffH > 0) {
    countdown = remMin > 0 ? `em ${diffH}h ${remMin}min` : `em ${diffH}h`
  } else {
    countdown = `em ${diffMin}min`
  }

  return (
    <div className={styles.card}>
      <span className={styles.label}>Próximo bloco</span>
      <span className={styles.nextTime}>{fmtTime(start)} – {fmtTime(new Date(block.end_datetime))}</span>
      <span className={styles.nextTitle}>{block.title}</span>
      <div className={styles.nextPill}>
        <span className={styles.pulseDot} />
        {countdown}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/dashboard/MetricCard.tsx frontend/src/dashboard/MetricCard.module.css
git commit -m "feat(frontend): MetricCards — tasks today, focus total, next block"
```

---

## Task 5: Dashboard — TimePie.tsx (gráfico SVG)

**Files:**
- Create: `frontend/src/dashboard/TimePie.tsx`
- Create: `frontend/src/dashboard/TimePie.module.css`

- [ ] **Step 1: Criar `frontend/src/dashboard/TimePie.module.css`**

```css
.panel {
  background: var(--color-bg-surface);
  border: 0.5px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.panelHead {
  padding: 18px 20px;
  border-bottom: 0.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panelTitle {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 400;
}

.panelBody {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.chartWrap {
  position: relative;
  flex-shrink: 0;
}

.centerLabel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.centerTotal {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 400;
  color: var(--color-text-primary);
}

.centerSub {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 140px;
}

.legendRow {
  display: flex;
  align-items: center;
  gap: 10px;
}

.legendDot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legendName {
  font-size: 13px;
  color: var(--color-text-primary);
  flex: 1;
}

.legendTime {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
}

.legendPct {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
  width: 36px;
  text-align: right;
}

.empty {
  padding: 32px 20px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}
```

- [ ] **Step 2: Criar `frontend/src/dashboard/TimePie.tsx`**

```typescript
import { fmtDuration } from '../lib/format'
import styles from './TimePie.module.css'

const CAT_COLORS: Record<string, string> = {
  trabalho: '#CC5200',
  estudo:   '#5B6356',
  pessoal:  '#B08C5E',
}
const DEFAULT_COLOR = '#D3D1C7'

interface Slice {
  slug: string
  name: string
  seconds: number
}

interface TimePieProps {
  slices: Slice[]
  size?: number
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg)
  const end   = polarToCartesian(cx, cy, r, startDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`
}

export function TimePie({ slices, size = 160 }: TimePieProps) {
  const total = slices.reduce((s, sl) => s + sl.seconds, 0)
  const cx = size / 2
  const cy = size / 2
  const r  = size / 2 - 10

  if (total === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Distribuição do tempo</span>
        </div>
        <div className={styles.empty}>Nenhuma sessão registrada hoje</div>
      </div>
    )
  }

  let angle = 0
  const arcs = slices.map(sl => {
    const deg = (sl.seconds / total) * 360
    const path = describeArc(cx, cy, r, angle, angle + deg)
    const color = CAT_COLORS[sl.slug] ?? DEFAULT_COLOR
    angle += deg
    return { ...sl, path, color, pct: Math.round((sl.seconds / total) * 100) }
  })

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Distribuição do tempo</span>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.chartWrap}>
          <svg width={size} height={size}>
            {arcs.map((arc, i) => (
              <path
                key={i}
                d={arc.path}
                fill={arc.color}
                style={{ transition: 'opacity 0.12s ease', cursor: 'default' }}
                onMouseEnter={e => { (e.target as SVGPathElement).style.opacity = '0.82' }}
                onMouseLeave={e => { (e.target as SVGPathElement).style.opacity = '1' }}
              >
                <title>{arc.name} · {fmtDuration(arc.seconds)} ({arc.pct}%)</title>
              </path>
            ))}
            {/* Donut hole */}
            <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--color-bg-surface)" />
          </svg>
          <div className={styles.centerLabel}>
            <span className={styles.centerTotal}>{fmtDuration(total)}</span>
            <span className={styles.centerSub}>total</span>
          </div>
        </div>

        <div className={styles.legend}>
          {arcs.map((arc, i) => (
            <div key={i} className={styles.legendRow}>
              <span className={styles.legendDot} style={{ background: arc.color }} />
              <span className={styles.legendName}>{arc.name}</span>
              <span className={styles.legendTime}>{fmtDuration(arc.seconds)}</span>
              <span className={styles.legendPct}>{arc.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/dashboard/TimePie.tsx frontend/src/dashboard/TimePie.module.css
git commit -m "feat(frontend): TimePie — SVG donut chart for focus time distribution"
```

---

## Task 6: Dashboard — AgendaPanel.tsx (agenda do dia)

**Files:**
- Create: `frontend/src/dashboard/AgendaPanel.tsx`
- Create: `frontend/src/dashboard/AgendaPanel.module.css`

- [ ] **Step 1: Criar `frontend/src/dashboard/AgendaPanel.module.css`**

```css
.panel {
  background: var(--color-bg-surface);
  border: 0.5px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panelHead {
  padding: 18px 20px;
  border-bottom: 0.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panelTitle {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 400;
}

.link {
  font-size: 12px;
  color: var(--color-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.scroll {
  overflow-y: auto;
  flex: 1;
  max-height: 380px;
  padding: 12px 0;
}

.hourRow {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 0 16px;
  min-height: 64px;
  position: relative;
}

.hourLabel {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
  width: 36px;
  flex-shrink: 0;
  padding-top: 4px;
}

.blocksWrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.ablock {
  border-radius: 6px;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ablock.trabalho { background: var(--cat-trabalho-bg); border-left: 2px solid var(--cat-trabalho-accent); }
.ablock.estudo   { background: var(--cat-estudo-bg);   border-left: 2px solid var(--cat-estudo-accent); }
.ablock.pessoal  { background: var(--cat-pessoal-bg);  border: 0.5px solid var(--color-border); }
.ablock.default  { background: var(--color-bg-base);   border-left: 2px solid var(--color-text-secondary); }

.ablockTitle {
  font-size: 13.5px;
  color: var(--color-text-primary);
}

.ablockTime {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.nowLine {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 16px;
}

.nowLineBar {
  flex: 1;
  height: 1px;
  background: var(--color-accent);
}

.nowLineTime {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-accent);
  white-space: nowrap;
}

.empty {
  padding: 24px 16px;
  font-size: 14px;
  color: var(--color-text-secondary);
}
```

- [ ] **Step 2: Criar `frontend/src/dashboard/AgendaPanel.tsx`**

```typescript
import { fmtTime } from '../lib/format'
import type { Block } from '../types/calendar'
import type { Category } from '../types/kanban'
import styles from './AgendaPanel.module.css'

const AGENDA_START = 6
const AGENDA_END   = 22

interface AgendaPanelProps {
  blocks: Block[]
  categories: Category[]
  onGoToCalendar: () => void
}

export function AgendaPanel({ blocks, categories, onGoToCalendar }: AgendaPanelProps) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const now = new Date()
  const nowH = now.getHours() + now.getMinutes() / 60

  const hours = Array.from(
    { length: AGENDA_END - AGENDA_START },
    (_, i) => AGENDA_START + i
  )

  function blocksForHour(h: number): Block[] {
    return blocks.filter(b => {
      const startH = new Date(b.start_datetime).getHours()
      return startH === h
    })
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Agenda de hoje</span>
        <button className={styles.link} onClick={onGoToCalendar}>Calendário →</button>
      </div>
      <div className={styles.scroll}>
        {blocks.length === 0 && (
          <div className={styles.empty}>Nenhum bloco agendado para hoje</div>
        )}
        {hours.map(h => {
          const hBlocks = blocksForHour(h)
          const showNow = nowH >= h && nowH < h + 1

          return (
            <div key={h}>
              {showNow && (
                <div className={styles.nowLine}>
                  <div className={styles.nowLineBar} />
                  <span className={styles.nowLineTime}>{fmtTime(now)}</span>
                </div>
              )}
              <div className={styles.hourRow}>
                <span className={styles.hourLabel}>{String(h).padStart(2, '0')}:00</span>
                <div className={styles.blocksWrap}>
                  {hBlocks.map(block => {
                    const cat = block.category_id ? catMap[block.category_id] : undefined
                    const catClass = (styles as Record<string, string>)[cat?.slug ?? ''] ?? styles.default
                    return (
                      <div key={block.id} className={`${styles.ablock} ${catClass}`}>
                        <span className={styles.ablockTitle}>{block.title}</span>
                        <span className={styles.ablockTime}>
                          {fmtTime(new Date(block.start_datetime))} – {fmtTime(new Date(block.end_datetime))}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/dashboard/AgendaPanel.tsx frontend/src/dashboard/AgendaPanel.module.css
git commit -m "feat(frontend): AgendaPanel — today's schedule with now-line"
```

---

## Task 7: Dashboard — KanbanPreview.tsx

**Files:**
- Create: `frontend/src/dashboard/KanbanPreview.tsx`
- Create: `frontend/src/dashboard/KanbanPreview.module.css`

- [ ] **Step 1: Criar `frontend/src/dashboard/KanbanPreview.module.css`**

```css
.panel {
  background: var(--color-bg-surface);
  border: 0.5px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panelHead {
  padding: 18px 20px;
  border-bottom: 0.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panelTitle {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 400;
}

.link {
  font-size: 12px;
  color: var(--color-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.columns {
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  overflow: hidden;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.colLabel {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.miniCard {
  background: var(--color-bg-base);
  border: 0.5px solid var(--color-border);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more {
  font-size: 11px;
  color: var(--color-text-secondary);
  padding: 2px 8px;
}
```

- [ ] **Step 2: Criar `frontend/src/dashboard/KanbanPreview.tsx`**

```typescript
import type { Card } from '../types/kanban'
import type { Column } from '../types/kanban'
import styles from './KanbanPreview.module.css'

const MAX_CARDS_SHOWN = 3

interface KanbanPreviewProps {
  columns: Column[]
  cards: Card[]
  onGoToKanban: () => void
}

export function KanbanPreview({ columns, cards, onGoToKanban }: KanbanPreviewProps) {
  const firstThree = columns.slice(0, 3)

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Kanban</span>
        <button className={styles.link} onClick={onGoToKanban}>Abrir quadro →</button>
      </div>
      <div className={styles.columns}>
        {firstThree.map(col => {
          const colCards = cards
            .filter(c => c.column_id === col.id)
            .sort((a, b) => a.position - b.position)
          const shown = colCards.slice(0, MAX_CARDS_SHOWN)
          const extra = colCards.length - MAX_CARDS_SHOWN

          return (
            <div key={col.id} className={styles.col}>
              <span className={styles.colLabel}>{col.title}</span>
              {shown.map(card => (
                <div key={card.id} className={styles.miniCard} title={card.title}>
                  {card.title}
                </div>
              ))}
              {extra > 0 && (
                <span className={styles.more}>+{extra} mais</span>
              )}
              {shown.length === 0 && (
                <span className={styles.more}>— vazio —</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/dashboard/KanbanPreview.tsx frontend/src/dashboard/KanbanPreview.module.css
git commit -m "feat(frontend): KanbanPreview — mini board showing first 3 columns"
```

---

## Task 8: Dashboard — Dashboard.tsx principal

**Files:**
- Create: `frontend/src/dashboard/Dashboard.tsx`
- Create: `frontend/src/dashboard/Dashboard.module.css`

- [ ] **Step 1: Criar `frontend/src/dashboard/Dashboard.module.css`**

```css
.dashboard {
  max-width: 1280px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fade-in-up 0.22s ease both;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.split {
  display: grid;
  grid-template-columns: 6fr 4fr;
  gap: 16px;
  align-items: start;
}

@media (max-width: 880px) {
  .metrics {
    grid-template-columns: 1fr;
  }
  .split {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Criar `frontend/src/dashboard/Dashboard.tsx`**

```typescript
import { useMemo } from 'react'
import { TasksMetricCard, FocusMetricCard, NextBlockMetricCard } from './MetricCard'
import { TimePie } from './TimePie'
import { AgendaPanel } from './AgendaPanel'
import { KanbanPreview } from './KanbanPreview'
import { useCards } from '../hooks/useCards'
import { useColumns } from '../hooks/useColumns'
import { useBlocks } from '../hooks/useBlocks'
import { useCategories } from '../hooks/useCategories'
import { useTodaySessions } from '../hooks/useSessions'
import styles from './Dashboard.module.css'

interface DashboardProps {
  onGoToKanban: () => void
  onGoToCalendar: () => void
}

export function Dashboard({ onGoToKanban, onGoToCalendar }: DashboardProps) {
  const today = new Date().toISOString().slice(0, 10)

  // Monday of current week for calendar query
  function getMonday(d: Date) {
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1 - day)
    const m = new Date(d)
    m.setDate(d.getDate() + diff)
    return m.toISOString().slice(0, 10)
  }

  const { data: cards = [] }        = useCards()
  const { data: columns = [] }      = useColumns()
  const { data: categories = [] }   = useCategories()
  const { data: blocks = [] }       = useBlocks(getMonday(new Date()))
  const { data: todaySessions = [] } = useTodaySessions()

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  // Tasks today: cards with due_date = today
  const todayCards = cards.filter(c => c.due_date === today)
  const doneCards = todayCards.filter(c => {
    const col = columns.find(col => col.id === c.column_id)
    return col?.title.toLowerCase().includes('concluído') ||
           col?.title.toLowerCase().includes('done') ||
           col?.title.toLowerCase().includes('feito')
  })

  // Focus total today
  const totalFocusToday = todaySessions.reduce((s, sess) => s + (sess.elapsed_seconds ?? 0), 0)

  // Next block today
  const todayBlocks = blocks.filter(b => b.start_datetime.startsWith(today))
  const now = new Date()
  const nextBlock = todayBlocks
    .filter(b => new Date(b.end_datetime) > now)
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())[0] ?? null

  // Time pie slices (by category, from today's sessions)
  const slices = useMemo(() => {
    const byCat: Record<string, { slug: string; name: string; seconds: number }> = {}
    todaySessions.forEach(s => {
      const catName = s.card_cat_snapshot ?? 'Sem categoria'
      const cat = categories.find(c => c.name === catName)
      const slug = cat?.slug ?? 'other'
      if (!byCat[slug]) byCat[slug] = { slug, name: catName, seconds: 0 }
      byCat[slug].seconds += s.elapsed_seconds ?? 0
    })
    return Object.values(byCat).filter(s => s.seconds > 0)
  }, [todaySessions, categories])

  return (
    <div className={styles.dashboard}>
      <div className={styles.metrics}>
        <TasksMetricCard done={doneCards.length} total={todayCards.length} />
        <FocusMetricCard totalSeconds={totalFocusToday} />
        <NextBlockMetricCard block={nextBlock} />
      </div>

      {slices.length > 0 && <TimePie slices={slices} />}

      <div className={styles.split}>
        <KanbanPreview
          columns={columns}
          cards={cards}
          onGoToKanban={onGoToKanban}
        />
        <AgendaPanel
          blocks={todayBlocks}
          categories={categories}
          onGoToCalendar={onGoToCalendar}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/dashboard/
git commit -m "feat(frontend): Dashboard — metrics, pie chart, kanban preview, agenda"
```

---

## Task 9: Conectar Dashboard no App.tsx e smoke test final

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Atualizar `frontend/src/App.tsx` para o estado final**

```typescript
import { useAppStore } from './store/appStore'
import { useKanbanStore } from './store/kanbanStore'
import { useFocusStore } from './store/focusStore'
import { Sidebar } from './shell/Sidebar'
import { TopBar } from './shell/TopBar'
import { Placeholder } from './shell/Placeholder'
import { KanbanScreen } from './kanban/KanbanScreen'
import { CalendarScreen } from './calendar/CalendarScreen'
import { FocusScreen } from './focus/FocusScreen'
import { Dashboard } from './dashboard/Dashboard'
import type { Card } from './types/kanban'

export function App() {
  const { activeScreen, setActive } = useAppStore()
  const { selectCard } = useKanbanStore()

  function handleStartFocusFromCard(card: Card) {
    selectCard(null)
    useFocusStore.getState().setPendingCardId(card.id)
    setActive('focus')
  }

  function handleGoToCard(cardId: string) {
    selectCard(cardId)
    setActive('kanban')
  }

  function renderScreen() {
    switch (activeScreen) {
      case 'dashboard':
        return (
          <Dashboard
            onGoToKanban={() => setActive('kanban')}
            onGoToCalendar={() => setActive('calendar')}
          />
        )
      case 'calendar':
        return <CalendarScreen />
      case 'kanban':
        return <KanbanScreen onStartFocus={handleStartFocusFromCard} />
      case 'focus':
        return <FocusScreen onGoToCard={handleGoToCard} />
      case 'finance':
        return <Placeholder icon="finance" title="Financeiro" subtitle="Em desenvolvimento — Fase 2" />
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

- [ ] **Step 2: Smoke test — Jornada completa (`http://localhost:3000`)**

Executar o fluxo central descrito em `etapa1-visao-e-mvp.md §1.6`:

1. **Dashboard:** Abrir a app. Verificar 3 metric cards, agenda vazia se não há blocos.
2. **Calendário:** Criar um bloco "Deep work" de 14:00–16:00 para hoje.
3. **Kanban:** Criar um card "Implementar feature X", prioridade Alta, vincular ao bloco criado.
4. **Foco via Kanban:** Abrir o drawer do card → clicar "Iniciar Foco" → verificar que navega para Foco com o card pré-selecionado e o timer iniciando.
5. **Ver Card:** No Foco, clicar "Ver Card" → verificar que volta para o Kanban com o drawer aberto.
6. **Encerrar sessão:** Voltar para Foco, encerrar. Verificar:
   - Chip aparece no histórico do footer com duração
   - Total do dia atualiza
7. **Dashboard:** Voltar ao Dashboard. Verificar:
   - Foco acumulado mostra o tempo da sessão
   - TimePie mostra fatia (se sessão ≥ 1 min)
   - Preview do Kanban mostra o card criado
   - Agenda mostra o bloco "Deep work"

- [ ] **Step 3: Tag de milestone final**

```bash
git tag v1.0.0-mvp
git commit --allow-empty -m "chore: MVP complete — all modules integrated, full user journey works"
```

---

## Self-Review

**Spec coverage:**
- [x] UC-01: criar card + vincular ao calendário (Plano 3 + Task 3 deste plano)
- [x] UC-02: excluir card com bloco vinculado (cascade no banco, Plano 2)
- [x] UC-03: excluir bloco — mantém card (Plano 3)
- [x] UC-04: excluir coluna com cards — confirmação (Plano 2)
- [x] UC-05: iniciar sessão de foco via "Iniciar Foco" do Kanban (Task 1)
- [x] UC-06: encerrar sessão com registro de tempo (Plano 3)
- [x] Dashboard §1.4: métricas reais (Task 8)
- [x] Dashboard: gráfico de distribuição de tempo (Task 5)
- [x] Dashboard: preview do Kanban (Task 7)
- [x] Dashboard: agenda do dia com now-line (Task 6)
- [x] Integração: "Ver Card" do Foco → Kanban (Task 2)
- [x] Integração: "Abrir quadro →" e "Calendário →" do Dashboard (Tasks 7/6)
- [x] RN-KAN-10: re-link desvincula bloco anterior (Task 3 + backend Plano 3)

**Placeholder scan:** Nenhum TBD encontrado.

**Type consistency:**
- `Card`, `Column`, `Category` definidos em `types/kanban.ts` (Plano 2) — usados em todos os componentes
- `Block` definido em `types/calendar.ts` (Plano 3) — usados em CalendarScreen, AgendaPanel, MetricCard
- `Session` definido em `types/focus.ts` (Plano 3) — usado em FocusScreen, TimePie
- `Screen` definido em `store/appStore.ts` (Plano 1) — usado em Sidebar, App
- Todas as props de navegação (`onGoToKanban`, `onGoToCalendar`, `onGoToCard`, `onStartFocus`) passadas de App.tsx para baixo — sem acoplamento lateral entre módulos
