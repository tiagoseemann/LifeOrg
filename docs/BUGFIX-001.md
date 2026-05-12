# BUGFIX-001 — Kanban Delete Card + Focus Layout

> Branch: feature/mvp
> Data: 2026-05-11
> Prioridade: alta — corrigir antes de implementar novas features

---

## Bug 1 — Kanban: botão de excluir card ausente

### Contexto

O backend já tem DELETE /api/cards/{id} e o hook useDeleteCard existe em
frontend/src/hooks/useCards.ts. O que falta é apenas a UI.

O botão fica no Drawer (painel lateral que abre ao clicar no card), não no
hover do card. Isso evita cliques acidentais. O fluxo usa confirmação inline
(o rodapé do Drawer muda de estado), sem abrir um modal separado.

### Arquivo 1/3: frontend/src/kanban/Drawer.tsx

1. Importar useState se ainda não estiver importado.

2. Adicionar onDelete à interface DrawerProps:
```tsx
interface DrawerProps {
  card: Card
  columns: Column[]
  categories: Category[]
  onClose: () => void
  onChange: (updates: Partial<Card>) => void
  onStartFocus: () => void
  onDelete: (cardId: string) => void   // NOVO
}
```

3. Adicionar estado local dentro do componente:
```tsx
const [confirmDelete, setConfirmDelete] = useState(false)
```

4. Substituir o bloco <div className={styles.foot}> inteiro por:
```tsx
<div className={styles.foot}>
  {confirmDelete ? (
    <div className={styles.deleteConfirm}>
      <p className={styles.deleteWarning}>
        Excluir este card permanentemente?
      </p>
      <div className={styles.deleteActions}>
        <button
          className={styles.cancelBtn}
          onClick={() => setConfirmDelete(false)}
        >
          Cancelar
        </button>
        <button
          className={styles.dangerBtn}
          onClick={() => {
            onDelete(card.id)
            onClose()
          }}
        >
          Excluir
        </button>
      </div>
    </div>
  ) : (
    <>
      <button className={styles.ctaBtn} onClick={onStartFocus}>
        <Icon id="play" size={14} />
        Iniciar Foco
      </button>
      <button
        className={styles.deleteLink}
        onClick={() => setConfirmDelete(true)}
      >
        Excluir card
      </button>
    </>
  )}
</div>
```

### Arquivo 2/3: frontend/src/kanban/Drawer.module.css

Adicionar ao final do arquivo:

```css
.deleteLink {
  width: 100%;
  background: none;
  border: none;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  margin-top: 8px;
  padding: 4px 0;
  text-align: center;
  transition: color 0.12s ease;
}
.deleteLink:hover {
  color: #c0392b;
}

.deleteConfirm {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.deleteWarning {
  font-size: 13px;
  color: var(--color-text-primary);
  text-align: center;
  margin: 0;
}

.deleteActions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.cancelBtn {
  background: var(--color-bg-base);
  border: 0.5px solid var(--color-border);
  border-radius: 8px;
  padding: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}
.cancelBtn:hover {
  background: var(--color-border);
}

.dangerBtn {
  background: #c0392b;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}
.dangerBtn:hover {
  background: #a93226;
}
```

### Arquivo 3/3: frontend/src/kanban/KanbanScreen.tsx

1. Adicionar handler junto aos outros (ex: ao lado do handleDeleteColumn):
```tsx
function handleDeleteCard(cardId: string) {
  deleteCard.mutate(cardId)
}
```

2. Na renderização do Drawer, adicionar a prop onDelete:
```tsx
<Drawer
  card={selectedCard}
  columns={columns}
  categories={categories}
  onClose={() => selectCard(null)}
  onChange={handleCardChange}
  onStartFocus={handleStartFocus}
  onDelete={handleDeleteCard}
/>
```

### Commit

```bash
git add frontend/src/kanban/Drawer.tsx \
        frontend/src/kanban/Drawer.module.css \
        frontend/src/kanban/KanbanScreen.tsx
git commit -m "fix(kanban): add delete card from drawer with inline confirmation"
```

---

## Bug 2 — FocusScreen: seletor de duração centralizado ao invés de no fundo

### Contexto

O layout atual do FocusScreen é:

```
.screen (flex column)
  .stage (flex: 1, justify-content: center)  <- tudo aqui fica centralizado
    ícone + título + botão
    .durSection    <- PROBLEMA: está aqui junto, fica no meio da tela
  .history         <- histórico do dia
```

A correção move .durSection para fora do .stage:

```
.screen (flex column)
  .stage (flex: 1, justify-content: center)  <- só ícone + título + botão
  .durWrap    <- NOVO: wrapper independente, fica acima do histórico
  .history    <- histórico do dia (sem mudança)
```

### Arquivo 1/2: frontend/src/focus/FocusScreen.tsx

ANTES (estrutura atual do JSX):
```tsx
<div className={styles.stage}>
  {!isActive && !paused ? (
    <>
      <div className={styles.idleIcon}>...</div>
      <h1 className={styles.idleTitle}>...</h1>
      <p className={styles.idleHelper}>...</p>
      <button className={styles.selectBtn}>...</button>

      <div className={styles.durSection}>   <- AQUI, DENTRO DO STAGE
        ...chips de duração...
      </div>
    </>
  ) : (
    ...estado ativo...
  )}
</div>

<div className={styles.history}>...
```

DEPOIS (estrutura corrigida):
```tsx
<div className={styles.stage}>
  {!isActive && !paused ? (
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
      {/* durSection foi REMOVIDO daqui */}
    </>
  ) : (
    ...estado ativo sem mudança...
  )}
</div>

{/* Seletor de duração — FORA do stage, só visível no idle */}
{!isActive && !paused && (
  <div className={styles.durWrap}>
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
  </div>
)}

<div className={styles.history}>...
```

### Arquivo 2/2: frontend/src/focus/FocusScreen.module.css

Adicionar a classe .durWrap (nova). As outras classes de duração não mudam.

```css
/* Wrapper do seletor de duração — entre o stage e o histórico */
.durWrap {
  border-top: 0.5px solid var(--color-border);
  background: var(--color-bg-surface);
  padding: 16px 32px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}
```

### Commit

```bash
git add frontend/src/focus/FocusScreen.tsx \
        frontend/src/focus/FocusScreen.module.css
git commit -m "fix(focus): move duration selector out of stage — now anchored above history footer"
```
