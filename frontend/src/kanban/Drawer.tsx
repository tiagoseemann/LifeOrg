import { useEffect, useRef, useState } from 'react'
import { Icon } from '../shell/Icon'
import { fmtDuration } from '../lib/format'
import type { CardUpdatePayload } from '../hooks/useCards'
import { useBlocks } from '../hooks/useBlocks'
import type { Card, Category, Column } from '../types/kanban'
import styles from './Drawer.module.css'

interface DrawerProps {
  card: Card
  columns: Column[]
  categories: Category[]
  onClose: () => void
  onChange: (updates: Omit<CardUpdatePayload, 'id'>) => void
  onStartFocus: (card: Card) => void
  onDelete: (cardId: string) => void
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function Drawer({ card, columns, categories, onClose, onChange, onStartFocus, onDelete }: DrawerProps) {
  const titleRef = useRef<HTMLInputElement>(null)

  // Local state for text fields that need debounce
  const [localTitle, setLocalTitle] = useState(card.title)
  const [localDesc, setLocalDesc] = useState(card.description ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: allBlocks } = useBlocks()
  const linkedBlock = allBlocks?.find(b => b.card_id === card.id) ?? null

  useEffect(() => {
    setConfirmDelete(false)
  }, [card.id])

  const debouncedTitle = useDebounce(localTitle, 450)
  const debouncedDesc  = useDebounce(localDesc,  450)

  // Keep local state in sync when a different card is opened
  useEffect(() => {
    setLocalTitle(card.title)
    setLocalDesc(card.description ?? '')
  }, [card.id])

  // Flush debounced title to parent
  useEffect(() => {
    const trimmed = debouncedTitle.trim()
    if (trimmed && trimmed !== card.title) {
      onChange({ title: trimmed })
    }
  }, [debouncedTitle])  // eslint-disable-line

  // Flush debounced description to parent
  useEffect(() => {
    const value = debouncedDesc || null
    if (value !== card.description) {
      onChange({ description: value })
    }
  }, [debouncedDesc])  // eslint-disable-line

  useEffect(() => {
    titleRef.current?.focus()
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const column = columns.find(c => c.id === card.column_id)

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Detalhes do card">
        <div className={styles.head}>
          <span className={styles.eyebrow}>Card · {column?.title ?? '—'}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <Icon id="x" size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <input
            ref={titleRef}
            className={styles.titleInput}
            value={localTitle}
            onChange={e => setLocalTitle(e.target.value)}
            placeholder="Título do card"
            aria-label="Título"
          />

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Descrição</label>
            <textarea
              className={styles.textarea}
              value={localDesc}
              onChange={e => setLocalDesc(e.target.value)}
              placeholder="Adicione uma descrição..."
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Coluna</label>
              <select
                className={styles.select}
                value={card.column_id}
                onChange={e => onChange({ column_id: e.target.value })}
              >
                {columns.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Data</label>
              <input
                type="date"
                className={styles.dateInput}
                value={card.due_date ?? ''}
                onChange={e => onChange({ due_date: e.target.value || null })}
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Etiqueta</label>
              <select
                className={styles.select}
                value={card.category_id ?? ''}
                onChange={e => onChange({ category_id: e.target.value || null })}
              >
                <option value="">Sem etiqueta</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Prioridade</label>
              <select
                className={styles.select}
                value={card.priority ?? ''}
                onChange={e => onChange({ priority: (e.target.value || null) as Card['priority'] })}
              >
                <option value="">—</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.focusHistory}>
              <div className={styles.focusHistoryTitle}>Histórico de Foco</div>
              {card.total_focus_time === 0 ? (
                <div className={styles.focusHistoryEmpty}>Nenhuma sessão registrada</div>
              ) : (
                <div className={styles.focusTotal}>
                  <span>Total acumulado</span>
                  <span className={styles.focusTotalValue}>{fmtDuration(card.total_focus_time)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.foot}>
          {confirmDelete ? (
            <div className={styles.deleteConfirm}>
              <p className={linkedBlock ? styles.deleteWarningLinked : styles.deleteWarning}>
                {linkedBlock
                  ? 'Este card está vinculado a um bloco no calendário. Ao excluir o card, o bloco será mantido, mas perderá a associação. Continuar?'
                  : 'Excluir este card permanentemente?'}
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
              <button className={styles.ctaBtn} onClick={() => onStartFocus(card)}>
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
      </div>
    </>
  )
}
