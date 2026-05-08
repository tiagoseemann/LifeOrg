import { useEffect, useRef } from 'react'
import { Icon } from '../shell/Icon'
import { fmtDuration } from '../lib/format'
import type { Card, Category, Column } from '../types/kanban'
import styles from './Drawer.module.css'

interface DrawerProps {
  card: Card
  columns: Column[]
  categories: Category[]
  onClose: () => void
  onChange: (updates: Partial<Card>) => void
  onStartFocus: (card: Card) => void
}

export function Drawer({ card, columns, categories, onClose, onChange, onStartFocus }: DrawerProps) {
  const titleRef = useRef<HTMLInputElement>(null)

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
            value={card.title}
            onChange={e => onChange({ title: e.target.value })}
            placeholder="Título do card"
            aria-label="Título"
          />

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Descrição</label>
            <textarea
              className={styles.textarea}
              value={card.description ?? ''}
              onChange={e => onChange({ description: e.target.value || null })}
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
          <button className={styles.ctaBtn} onClick={() => onStartFocus(card)}>
            <Icon id="play" size={14} />
            Iniciar Foco
          </button>
        </div>
      </div>
    </>
  )
}
