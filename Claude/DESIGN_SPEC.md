# LifeOrg — Design Specification

> Handoff document for engineering. The dev does **not** have access to the
> design files; everything that matters to reproduce the product is here.
>
> Stack assumed: any modern framework (React/Vue/Svelte) + plain CSS or
> CSS modules. The design has zero hard dependency on a UI library.

---

## 0. Visual North Star

**LifeOrg should feel like _claude.ai_, not Notion, not Linear.**

Concretely that means:

| Trait                | We do                                  | We don't                          |
|----------------------|----------------------------------------|-----------------------------------|
| Surfaces             | Warm off-white paper (`#F1EFE8`)       | Cold neutral gray, pure `#FFF` everywhere |
| Accent               | Burnt-orange coral (`#CC5200`)         | Indigo / blue / purple of any kind |
| Typography (titles)  | Editorial serif (Iowan Old Style / Charter / Georgia) | Inter / Roboto / Geist for headings |
| Typography (body)    | System sans (SF Pro Text / system-ui)  | Custom display fonts in body copy |
| Numerals & code-ish  | Mono (SF Mono / JetBrains Mono / Menlo) | Sans for timer, durations, counts |
| Decoration           | 0.5px hairlines, soft shadows, calm    | Heavy borders, neon glows, gradients on flat UI |
| Density              | Generous, breathable                   | Linear-style information density  |
| Motion               | 120–260ms, ease-out, subtle slide-up   | Spring bounces, large parallax    |
| Iconography          | 1.6px stroke, rounded line caps        | Filled / glyphic / two-tone icons |
| Empty states         | Editorial serif title + helper sentence | Illustration-heavy onboarding     |

Mental model: _“a product designed by someone who reads.”_

---

## 1. Design Tokens

All tokens are declared as CSS custom properties on `:root` in `app.css`.
**Do not hardcode any of these hex values inside components.**

### 1.1 Color

```css
:root {
  /* Brand */
  --color-accent:        #CC5200;   /* burnt-orange coral, primary action */
  --color-accent-hover:  #993C1D;   /* darker coral for hover on accent fills */
  --color-accent-bg:     #FAECE7;   /* coral-50, soft fills, hover bg, tag chips */

  /* Surfaces */
  --color-bg-base:       #F1EFE8;   /* app canvas, content area */
  --color-bg-surface:    #FFFFFF;   /* cards, panels, drawers, modals */
  --color-bg-dark:       #1E1C1A;   /* sidebar ONLY */

  /* Text */
  --color-text-primary:  #2C2C2A;   /* default text */
  --color-text-secondary:#888780;   /* labels, helper, meta, "estudo" border */

  /* Lines */
  --color-border:        #D3D1C7;   /* hairline, 0.5px on every divider */
}
```

Category accent set (Calendar / Kanban tags) — these are derived, not new
tokens; documented for clarity:

| Category   | Surface fill      | Accent (border-left / icon) | Text on fill |
|------------|-------------------|------------------------------|--------------|
| Trabalho   | `#FAECE7`         | `#CC5200`                    | `#6B2D10`    |
| Estudo     | `#F1EFE8` / `#ECEEEA` | `#888780`                | `#3E4A3A`    |
| Pessoal    | `#FFFFFF`         | `#D3D1C7` (hairline)         | `#2C2C2A`    |

### 1.2 Typography

```css
:root {
  --font-sans:    ui-sans-serif, -apple-system, "SF Pro Text",
                  "Helvetica Neue", "Segoe UI", system-ui, sans-serif;
  --font-display: ui-serif, "Iowan Old Style", "Charter", "Georgia",
                  "Times New Roman", serif;
  --font-mono:    ui-monospace, "SF Mono", "JetBrains Mono",
                  "Menlo", "Consolas", monospace;
}

body { font-family: var(--font-sans); font-size: 14px; line-height: 1.5; }
```

Type scale (no abstract names — just match the values):

| Use                                  | Family    | Size  | Weight | Letter-spacing | Line-height |
|--------------------------------------|-----------|-------|--------|----------------|-------------|
| Page eyebrow / label uppercase       | sans      | 11px  | 500    | 0.07em         | 1           |
| Tiny eyebrow (drawer, modal hd)      | sans      | 10px  | 500    | 0.09em         | 1           |
| Body                                 | sans      | 14px  | 400    | 0              | 1.5         |
| Card title (kb-card, ablock)         | sans      | 13.5px| 400    | 0              | 1.35        |
| Topbar title / panel title           | display   | 18–19px| 400   | -0.005em       | 1.2         |
| Screen title (Kanban "Kanban")       | display   | 26px  | 400    | -0.01em        | 1.2         |
| Screen title (Calendar range)        | display   | 22px  | 400    | -0.005em       | 1.2         |
| Idle title (Foco)                    | display   | 28px  | 400    | -0.01em        | 1.2         |
| Foco active task name                | display   | 32px  | 400    | -0.01em        | 1.2         |
| Editorial hero (placeholder title)   | display   | 36px  | 400    | -0.01em        | 1.1         |
| Metric value                         | display   | 38px  | 400    | -0.01em        | 1           |
| Mono metric (focus accumulated)      | mono      | 30px  | 500    | -0.01em        | 1           |
| Pie center total                     | mono      | 22px  | 400    | -0.01em        | 1           |
| Foco timer (fixed mode)              | mono      | 96px  | 400    | -0.04em        | 1           |
| Foco timer (free mode, HH:MM:SS)     | mono      | 84px  | 400    | -0.04em        | 1           |
| Foco history total                   | mono      | 20px  | 500    | -0.01em        | 1.1         |
| Calendar block title                 | sans      | 11.5px| 500    | 0              | 1.25        |
| Calendar block time                  | mono      | 9.5px | 400    | 0              | 1           |

Rules:
- All numerals shown as data (timers, durations, counts, hours, dates inside
  blocks) use `var(--font-mono)`.
- All page/section titles use `var(--font-display)` — never sans for an h1.
- Body, buttons, inputs, labels: `var(--font-sans)`.

### 1.3 Spacing

Spacing is on a 2-px subscale (we frequently use `2 / 4 / 6 / 8 / 10 / 12 /
14 / 16 / 18 / 20 / 22 / 24 / 28 / 32`). There is no token system — match
the values literally.

Anchors for layout:
- Sidebar width: **56px**
- Topbar height: **56px**
- Content padding: **32px**
- Drawer width: **380px** (full-width below 880px)
- Modal width: **420–460px**, max 80vh tall
- Card-internal padding: **12px 13px**
- Panel-internal padding: **18px 20px** (head) / **0 20px 20px** (body)
- Calendar hour row: **52px**
- Agenda hour row (dashboard): **64px**

### 1.4 Radius & Borders

- Hairline: **0.5px solid var(--color-border)** — used on every divider
  and panel/card edge. Never 1px unless on `:focus`.
- Card / panel radius: **12px**
- Card-on-card / inner card: **8px**
- Pill / button / chip / tag: **999px**
- Input / select / textarea: **8px**
- Modal: **14px**
- Tooltip: **6px**

Hover-elevated border: `#c0bdb1` (one notch darker than `--color-border`).
Use it for `:hover` on cards, buttons, inputs.

### 1.5 Shadow

```css
/* card hover */
box-shadow:
  0 1px 3px rgba(30,28,26,0.05),
  0 8px 18px rgba(30,28,26,0.06);

/* drawer */
box-shadow: -16px 0 40px rgba(30,28,26,0.08);

/* modal */
box-shadow: 0 24px 60px rgba(30,28,26,0.22);

/* metric card hover */
box-shadow:
  0 1px 3px rgba(30,28,26,0.04),
  0 6px 16px rgba(30,28,26,0.04);
```

All shadow colors are tinted with the warm dark `rgba(30,28,26,…)` —
**never `rgba(0,0,0,…)`** in this product. Cool shadows feel wrong.

### 1.6 Motion

```css
/* default UI state changes */
transition: background-color .12s ease,
            color .12s ease,
            border-color .12s ease;

/* hovers that translate / scale */
transition: transform .14s ease, box-shadow .14s ease;

/* progress / fills */
transition: width .35s ease, stroke-dashoffset 0.95s linear;

/* drawer slide */
transition: transform .26s cubic-bezier(0.32, 0.72, 0, 1);

/* modal pop */
transition: transform .22s cubic-bezier(0.32, 0.72, 0, 1);

/* screen entrance */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* applied to .dashboard, .kb, .foco, .cal, .placeholder — .22s ease both */
```

---

## 2. App Shell

```
┌───────────────────────────────────────────────────────┐
│ sidebar │ topbar                                      │
│  56px   │ 56px tall                                   │
│         ├──────────────────────────────────────────── │
│         │ content (overflow:auto, padding:32px)       │
│         │                                             │
│         │  ─ screen area ─                            │
│         │                                             │
└───────────────────────────────────────────────────────┘
```

### 2.1 Sidebar (`aside.sidebar`)

- Background: `--color-bg-dark` (`#1E1C1A`).  **The only dark surface in
  the entire product.**
- Width: 56px. Vertical column, 14px padding-y, 6px gap.
- Brand mark `OS`: 36×36, serif 18px, `--color-accent`.
- Nav buttons: 40×40, radius 8px.
  - Default: `color: --color-text-secondary`, no bg.
  - Hover: `bg: rgba(255,255,255,0.04)`, `color: #d6d4cd`.
  - Active: `bg: --color-accent`, `color: #fff`. Active does **not** change on hover.
  - Tooltip on hover: dark pill (`bg: --color-text-primary`, white text, 12px,
    appears 10px to the right, fades in 120ms).
- Foot: 28px circular avatar with warm gradient
  `linear-gradient(135deg, #d4a373, #b07452)`, white initials.

### 2.2 Topbar (`header.topbar`)

- Height 56px, white surface, hairline bottom border.
- Left: page title in `--font-display`, 19px.
- Right (gap 14px): search icon, bell icon, weekday+date in 13px,
  "HOJE" badge.
- "Hoje" badge: coral-50 fill, coral text, 11px uppercase, leading dot
  (6px) in coral. Pulse animation on the dot:

```css
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(204,82,0,0.45); }
  70%  { box-shadow: 0 0 0 6px rgba(204,82,0,0); }
  100% { box-shadow: 0 0 0 0 rgba(204,82,0,0); }
}
```

### 2.3 Content area

- `flex: 1; overflow: auto; padding: 32px;` over `--color-bg-base`.
- Each screen mounts inside this area and is its own component.
- Foco screen overrides padding via `margin: -32px;` so its sticky footer
  reaches the content edges. Other screens respect the 32px padding.

### 2.4 Iconography

A single inline SVG `<symbol>` library lives at the top of `<body>`. All
icons use:
- `viewBox="0 0 24 24"`
- `stroke="currentColor"`, `stroke-width="1.6"`, round caps & joins
- No fills (except `i-play`, `i-pause`, `i-stop` which are filled glyphs)

Required icons: `dashboard`, `calendar`, `kanban`, `focus`, `finance`,
`search`, `bell`, `plus`, `check-square`, `hourglass`, `bolt`,
`paperclip`, `message`, `x`, `play`, `pause`, `stop`, `arrow-out`,
`clock`.

**Never use emoji** unless explicitly added to the brand later. Use the
icon set or a placeholder.

---

## 3. Navigation Model

```
┌─ Sidebar nav (single source of truth) ─┐
│  dashboard  → <Dashboard />            │
│  calendar   → <CalendarScreen />       │
│  kanban     → <KanbanScreen />         │
│  focus      → <FocusScreen />          │
│  finance    → <Placeholder mod=…/>     │  (future)
└────────────────────────────────────────┘
```

- App holds `active` state (string key). Sidebar calls `setActive`.
- Screen entrance animation runs every time `active` changes (key on the
  outer screen element forces remount).
- Cross-screen jumps:
  - Foco active state: **Ver Card** button calls `goToKanban()` → switches
    `active` to `"kanban"`. (Future: also opens that card's drawer.)
  - Dashboard kanban preview "Abrir quadro →" link → `active = "kanban"`.
  - Dashboard agenda "Calendário →" link → `active = "calendar"`.
- There is no router, no URLs. State only. (Add a router later — the
  five top-level keys are stable.)

---

## 4. Screens

### 4.1 Dashboard (`<Dashboard />`)

Layout: vertical stack, max-width 1280px, gap 20px.

1. **Metric strip** — 3 cards in a 1fr×3 grid:
   - **Tarefas hoje**: big serif `4 / 7`, `/ 7` in 15px sans secondary;
     progress bar (4px tall, coral fill); subline `<strong>57%</strong> concluído · 3 restantes`.
   - **Foco acumulado**: mono coral `2h 34min`, 30px, weight 500; subline.
   - **Próximo bloco**: mono coral `14:00 – 15:00` (13px); 17px sans-medium
     title `Revisão de código`; coral-50 countdown pill `em 1h 20min`
     with a pulsing dot.
   Each card: white surface, hairline border, 12px radius, 22px padding,
   hover lifts 1px and tightens border to `#c0bdb1`.
2. **Distribuição do tempo por etiqueta** — chart panel with donut/pie.
   Toggleable via Tweaks. Slices: trabalho coral, estudo `#5B6356`,
   pessoal `#B08C5E`. Legend rows include name, mono time, mono pct, and
   an optional 3px progress bar.
3. **Split**: 6fr/4fr.
   - Left panel `<Kanban preview>`: 3 columns (A fazer / Em andamento /
     Revisão), card mini-format.
   - Right panel `<Agenda>`: time-slotted day with category-tinted
     blocks and a coral now-line at 12:40.

### 4.2 Calendar (`<CalendarScreen />`)

**Header** (gap 16px, wrap):
- Left cluster: chevrons (`‹` `›`, 30×30 ghost) + range
  "4 – 10 de maio de 2026" in display 22px + ghost "Hoje" pill.
- Right: coral pill "+ Novo Bloco".

**Grid**:
- Outer: white surface, hairline border, 12px radius, fills remaining
  height.
- Header row (sticky, non-scrolling): empty corner + 7 day heads.
  Each day head shows uppercase weekday (10px) + day number (display 19px).
  **Today**: weekday turns coral, number turns coral and gains a 2px
  coral underline.
- Body (scroll-y): 56px hours column + 7 day columns.
  - Hours column: mono 10px labels, right-aligned, anchored at exact
    hour positions, `06:00 … 23:00`.
  - Day columns: 0.5px-dashed (`#E5E3DA`) gridlines per hour.
  - Today's column: gentle coral-50 vertical gradient
    `linear-gradient(180deg, rgba(250,236,231,0.32), rgba(250,236,231,0))`.

**Now-line**: coral 1px line spanning the full width of the today column,
at `((NOW_H - 6) + NOW_M/60) * 52px`. Has a 7×7 coral dot at left and a
mono coral label "12:40" sitting in a small white badge to the left.

**Block** (`.cblock`):
- `position: absolute; left:4; right:4; top: yStart; height: yEnd-yStart-2`
- 6px radius, 5px×7px padding. Title 11.5px sans-medium, ellipsized.
  Time 9.5px mono. Time row hidden when block height < 28px.
- Categories:
  - `.cblock--trabalho` → bg `#FAECE7`, border-left 2px `#CC5200`,
    title `#6B2D10`, time `#CC5200`.
  - `.cblock--estudo` → bg `#F1EFE8`, border-left 2px `#888780`,
    title `#3E4A3A`, time `#5B6356`.
  - `.cblock--pessoal` → bg `#FFFFFF`, full hairline border (no left
    accent), title default, time secondary.
- Hover: `filter: brightness(0.97); transform: translateX(1px); box-shadow`,
  z-index 4. Tooltip via native `title` attr — multi-line: title +
  category + duration. (Custom tooltip is acceptable as a follow-up; not
  required for v1.)

**Modal "Novo bloco"** (`<NewBlockModal />`):
- Width 460px. Header "Novo bloco" + close X.
- Fields, in order:
  1. **Título** — text input, autofocused, placeholder
     `Ex: Deep work, Aula de Cálculo, Academia…`.
  2. **Categoria** — three buttons in a 1fr×3 grid, each rendered in its
     own category style (so the dev sees the color while choosing).
     Selected state: double-ring shadow
     `0 0 0 2px var(--color-bg-surface), 0 0 0 4px var(--color-accent)`.
  3. **Data** — `<input type="date">`.
  4. **Início / Fim** — two `<input type="time">` side by side.
  5. **Recorrência** — `<select>` with: não repetir, todos os dias,
     dias úteis, semanal, quinzenal.
- Footer: ghost **Cancelar**, coral **Salvar**.
- Save: parse the date → compute Mon-indexed weekday → append a block to
  the in-memory schedule. (Persistence: out of scope for the design; the
  shape `{ day, sH, sM, eH, eM, t, cat }` is stable.)

### 4.3 Kanban (`<KanbanScreen />`)

**Header**:
- Title `Kanban` (display 26px) + mono pill `8 cards`.
- Filter pills: `todos · trabalho · estudo · pessoal`. Default: white
  surface + hairline. Hover: coral-50 bg, coral text, coral-tinted
  border `#f0d8cd`. Active: solid coral fill, white text.
- CTA `+ Novo Card` (coral pill).

**Board**: 3 columns × `1fr`, gap 16px, items aligned to top.

**Column** (`.kbcol`):
- White surface, hairline border, 12px radius, 16px×14px padding,
  min-height 320px, gap 12px.
- Head: uppercase coral label (11px, 0.07em tracking) + mono count badge
  `--color-bg-base` fill.
- Cards stack (gap 8px).
- Foot: ghost dashed-on-hover `+ Adicionar`.
- **`Em Progresso` only**: vertical gradient
  `linear-gradient(180deg, var(--color-accent-bg), rgba(250,236,231,0))`
  on top of the white surface — visibly different but not loud.

**Card** (`.kb-card`):
- White, hairline, 8px radius, 12px×13px padding, gap 8px.
- Body: title 13.5px; first row = tag pill + optional `Em foco` badge;
  second row = mono date + optional mono `Icon clock + N sessões`.
- States:
  - Hover: lift 1px, soft shadow, border tightens.
  - **Selected** (drawer open on this card): coral border + 3px coral-50
    outer ring `box-shadow: 0 0 0 3px var(--color-accent-bg)`.
  - **In focus** (`card.inFocus === true`): 2px coral left border +
    coral pill badge `● Em foco` (uppercase, 10px, coral text, dot
    inside).

**Drawer** (`.drawer`, 380px wide, slides from right):
- Overlay: `rgba(30,28,26,0.18)` fade in 200ms.
- Panel: white, 0.5px left border, big left-shadow, slide
  `transform: translateX(100%) → 0` over 260ms.
- Head: uppercase eyebrow `Card · {column name}` + close X (30×30 ghost).
- Body fields, in order:
  1. Editable title (display 22px, transparent input, underline appears
     on hover, coral underline on focus).
  2. Description textarea.
  3. Coluna `<select>` + Data text input (1fr×2 grid).
  4. Etiqueta `<select>`.
  5. Histórico de sessões: list with bordered rows, mono coral
     duration on the right, "Total acumulado" footer with mono total.
- Foot: full-width coral CTA `▶ Iniciar Foco` (12px×16px padding,
  10px radius). On click → switch to focus screen and start.

### 4.4 Focus (`<FocusScreen />`)

Two states inside `.foco__stage` (vertically centered).

**Idle**:
1. 64px coral-50 disk with `i-focus` icon (28px, coral).
2. Display 28px title `Nenhuma tarefa em foco`.
3. Secondary 14px helper.
4. Coral CTA `▶ Selecionar Tarefa` → opens the picker modal.
5. **Duration selector**: uppercase 10px label `Duração da sessão` + a
   white pill row containing mono chips: `15min · 25min · 45min · 60min
   · Livre` + a `custom` text input (3-digit numeric). The active chip
   has solid coral bg + white text. The custom input adopts the same
   active state on focus and stores the typed minutes.

**Picker modal** lists every kanban card whose column is `progress`.
Each row shows title + tag pill + date + sessions count, with a `→`
arrow. Click → starts the timer with the currently selected duration.

**Active**:
1. Eyebrow `EM FOCO`, then display 32px task title (centered, max 620px,
   `text-wrap: pretty`), then uppercase tag label with leading coral dot.
2. **Timer ring**: 340×340. Two SVG circles, rotated -90°.
   - Bg: `stroke: var(--color-border); stroke-width: 2; opacity: .6`.
   - Fg: `stroke: var(--color-accent); stroke-width: 3; stroke-linecap: round;
     transition: stroke-dashoffset .95s linear;`
   - `stroke-dasharray = 2πr`, `stroke-dashoffset = C * (1 - progress)`
     where `progress = elapsed / duration` (fixed mode) or `0` (free mode).
3. **Timer**: mono 96px coral, centered absolutely inside the ring.
   - Fixed mode: counts down from `duration`, formats `MM:SS`, switches
     to `HH:MM:SS` automatically if ≥ 1 hour shown.
   - Free mode: counts up from `00:00`, no auto-stop. Coral pill
     `● Cronômetro livre` floats above the timer (top of the ring).
   - Paused: timer text drops to opacity 0.55 (transition .25s).
4. Controls (ghost pill row, gap 8px):
   - `⏸ Pausar` ↔ `▶ Retomar` (toggle).
   - `⏹ Encerrar` (saves the session if elapsed ≥ 30s, then returns to
     idle).
   - `↗ Ver Card` → calls `goToKanban()`.

**Sticky history footer** (`.foco__history`, sits at the bottom of the
content area regardless of viewport):
- Border-top hairline, white surface, 14px×24px padding.
- Grid: `auto 1fr auto`.
- Left: uppercase eyebrow `Histórico hoje`.
- Middle: horizontal-scrollable row of session chips. Each chip:
  `--color-bg-base` fill, 8px radius, 8px×12px padding; title 12px
  ellipsized, mono coral duration, mono 10px secondary time.
- Right: divider + uppercase eyebrow `Total hoje` + mono coral 20px value.

**Tick logic**:

```
state: { activeId, duration, elapsed, running, sessions, durKey, customMin }

useEffect(() => {
  if (!running) return;
  const id = setInterval(() => {
    setElapsed(e => {
      const next = e + 1;
      if (duration !== null && next >= duration) {
        clearInterval(id);
        setRunning(false);
        appendSession(activeId, duration);
        return duration;
      }
      return next;
    });
  }, 1000);
  return () => clearInterval(id);
}, [running, duration, activeId]);
```

---

## 5. Component Inventory

| Component               | File / where to place         | States / props of note                                                                |
|-------------------------|--------------------------------|---------------------------------------------------------------------------------------|
| `Sidebar`               | `shell/Sidebar`               | `active` key, `onSelect`. Tooltip on hover.                                           |
| `TopBar`                | `shell/TopBar`                | `title`. Renders search/bell icons + date + Hoje badge.                               |
| `Avatar`                | `shell/Avatar`                | size, gradient. Currently 28px in sidebar foot.                                       |
| `Icon`                  | `shell/Icon`                  | `id` only. Pulls from inline SVG library.                                             |
| `MetricCard`            | `dashboard/MetricCard`        | label, glyph, mono?, hover lift.                                                      |
| `Pie` + `Legend`        | `dashboard/TimePie`           | data, total, donut?, accent override. Slice hover dims to 0.82.                       |
| `Agenda`                | `dashboard/Agenda`            | renders `--hour-h` rows, now-line, blocks per category.                               |
| `KCard` (preview)       | `dashboard/KCard`             | preview-only mini card.                                                               |
| `KanbanScreen`          | `kanban/KanbanScreen`         | filter state, selectedId, drawer in-place.                                            |
| `KanbanCard`            | `kanban/Card`                 | `is-focus`, `is-selected`. Click → opens Drawer.                                      |
| `Drawer`                | `kanban/Drawer`               | open by `card !== null`. Editable title, description, fields, sessions, CTA.         |
| `FocusScreen`           | `focus/FocusScreen`           | idle ↔ active. Holds the tick interval.                                               |
| `FocusRing`             | `focus/FocusRing`             | `progress` 0..1.                                                                      |
| `FocusModal`            | `focus/Picker`                | lists in-progress cards.                                                              |
| `CalendarScreen`        | `calendar/CalendarScreen`     | header, grid, modal. Today index hardcoded for v1.                                    |
| `CalBlock`              | `calendar/Block`              | block geometry, native title tooltip.                                                 |
| `NewBlockModal`         | `calendar/NewBlockModal`      | controlled form, validates start < end (TODO).                                        |
| `Placeholder`           | `shell/Placeholder`           | renders modules not yet built (currently only `finance`).                             |
| `TweaksPanel` + helpers | `shell/Tweaks/*`              | dev-only floating panel; honors host messages `__activate_edit_mode`, etc.            |

---

## 6. Interaction Specs (per module)

### Dashboard
- Hover any metric card: lifts 1px, border tightens.
- Pie slice: hover → opacity 0.82, native `<title>` shows
  `{Tag} · {Hh Mmin} (NN%)`.
- "Abrir quadro →" / "Calendário →" links navigate via `setActive`.

### Calendar
- Chevrons currently visual-only; spec'd to advance the week by ±7d.
- "Hoje" pill snaps the view back to the current week.
- "+ Novo Bloco" opens the modal; Save closes it and inserts a block.
- Click on existing block: spec'd to open an edit modal (same form,
  prefilled). Not yet implemented.
- Drag-to-create on an empty day column is **out of scope for v1**.

### Kanban
- Filter pills are mutually exclusive; clicking a filter toggles which
  cards render in each column. Counts in column heads show filtered count.
- Card click → opens drawer. Drawer overlay click or X closes it.
- Editing inside the drawer mutates the card live (no Save button —
  every change is autosaved to in-memory state).
- Changing `Coluna` in the drawer moves the card across columns.
- "Iniciar Foco" CTA: starts a focus session for that card and
  navigates to the Focus screen. (Wiring TODO; for v1, alerts.)

### Focus
- Duration chip click sets `durKey`. The selected chip drives
  `resolveSelected()` at start time.
- Custom input: typing focuses it and sets `durKey="custom"`. Input is
  numeric-only, ≤ 3 digits.
- `▶ Selecionar Tarefa` opens picker. Picking a card → start.
- Pause toggles `running`. Paused timer text dims.
- Encerrar saves the session if `elapsed ≥ 30s`, returns to idle, resets
  `elapsed = 0`.
- Auto-completion (fixed mode): when `elapsed ≥ duration`, append a
  session of `duration` seconds and stop.
- Free mode: never auto-stops, format auto-grows to `HH:MM:SS`.

---

## 7. Tweaks panel (dev-only)

Floating bottom-right card, glassy backdrop. It is the contract surface
for the prototyping host (`__edit_mode_*` postMessages). For production
this whole panel is removed. Tweaks currently exposed:

- Show chart (toggle)
- Chart style (donut / pizza)
- Show bars in legend (toggle)
- Accent color (`#CC5200`, `#7A5AE0`, `#1F8A5B`, `#2A6FDB`, `#B0894A`)

The accent override is applied by writing `--color-accent` on
`document.documentElement` in a `useEffect`. Anything keyed off
`--color-accent` re-tints automatically; SVG strokes that hardcoded the
hex (e.g. pie slices) are re-passed via prop.

---

## 8. Accessibility checkpoints

- All icon-only buttons have `aria-label`.
- Sidebar nav items use `aria-current="page"` on the active item.
- Modal/drawer overlays close on click outside; Esc-to-close is **TODO**
  (add it in v1.1).
- Focus order in the drawer: title → description → coluna → data →
  etiqueta → CTA.
- Tag chips are decorative; the actual tag value is in the underlying
  data (`card.tag`), not derived from the visual class.
- Color is never the only signal: focus state has the left-border AND
  the `Em foco` text badge; today in calendar has weekday color AND
  underline.
- Tab targets: all clickable cards use `<button>`, never `<div onClick>`.

---

## 9. Hard rules — _never_ break these

1. **No blue, no purple, no indigo.** Brand accent is burnt-orange coral.
   The only acceptable secondary tint is the desaturated olive
   `#5B6356` used for "estudo" and the warm sand `#B08C5E` used for
   "pessoal" in charts.
2. **No dark surfaces in the content area.** Dark (`#1E1C1A`) appears
   exclusively on the sidebar. Cards, panels, modals, drawers, the
   topbar — all light.
3. **No emoji as UI**, ever. Use the icon library or a typographic
   placeholder.
4. **No drop shadows tinted with pure black** (`rgba(0,0,0,…)`). Always
   the warm-dark `rgba(30,28,26,…)`.
5. **No 1px borders for separators.** Hairlines are always 0.5px.
   1px is reserved for `:focus` outlines.
6. **No system sans on titles, no serif on body.** The display/sans
   split is the product's voice.
7. **No mono on body text.** Mono is for numerals and durations only.
8. **No fully-rounded corner abuse.** Cards/panels are 12px, inner cards
   8px. 999px is for pills/buttons/tags, never for cards.
9. **No gradient on flat UI.** The two acceptable gradients in the
   product are: the avatar disk (warm sand) and the "today" / "Em
   Progresso" column tints (coral-50 vertical fade). That's it.
10. **No "Inter" / "Roboto" / "Geist" / "SF Pro Display"** anywhere. The
    declared font stacks are the source of truth.
11. **Categories are coral / olive / pebble**, never red / green / blue.
    Mapping is fixed (see §1.1).
12. **Coral is the only "primary" color.** A button cannot be both coral
    and another solid hue; secondary actions are ghost (transparent +
    hairline border).
13. **Now-line is coral**, full stop. Don't tint it by category.
14. **No motion longer than 350ms** for state changes. The hero
    "screen entrance" (`fade-in-up`) is 220ms; nothing UX-blocking
    should exceed that.
15. **No animation on page load that delays interaction.** The fade-in-up
    is opacity+translate only — pointer events remain live throughout.

---

## 10. Localization

All UI strings are pt-BR. The codebase should externalize them to a
`pt-BR.json` (or equivalent) before shipping. Notable strings already in
use are listed in the source files; the dev should treat the current
copy as authoritative and not paraphrase.

Date formatting:
- Short weekday + day + month, e.g. `Sex, 8 de maio`.
- Range: `4 – 10 de maio de 2026` (en-dash, spaces).
- Relative: `hoje`, `ontem`, `8 mai`, `12 mai` — used in card meta.
- Time: `HH:MM` 24h, mono.
- Duration: `Hh Mmin` / `Hh` / `Mmin` — never decimals.

---

## 11. Out of scope for v1 (explicitly)

> **Atenção:** Esta seção refere-se ao escopo do **protótipo HTML interativo** (`LifeOrg Shell.html`), não ao MVP do produto. O MVP do produto inclui persistência em PostgreSQL, drag-and-drop no Kanban e busca funcional — ver `etapa1-visao-e-mvp.md` para o escopo completo do produto.

Itens abaixo que **não fazem parte do protótipo HTML**, mas que **fazem parte do MVP do produto**:
- Persistência (o protótipo usa estado in-memory; o produto usa PostgreSQL)
- Drag-and-drop no Kanban (o protótipo é estático; o produto usa @dnd-kit)
- Busca funcional (o ícone de lupa é decorativo no protótipo; no produto a busca é real)

Itens fora do escopo tanto do **protótipo quanto do MVP**:
- Drag-and-drop no Calendário
- Visões de dia e mês no Calendário
- Blocos recorrentes expandidos em múltiplas semanas
- Backend de notificações (o ícone de sino é decorativo)
- Autenticação / login real
- Light/dark theming (o produto é light-only por design)
- Mobile-first redesign (os breakpoints `@media (max-width: 880px)` e `640px` são reflows gentis, não um produto mobile separado)

---

_End of spec._
