import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../shell/Icon'
import { fmtDuration } from '../lib/format'
import type { Card, Category } from '../types/kanban'
import styles from './KanbanCard.module.css'

interface KanbanCardProps {
  card: Card
  category: Category | undefined
  isSelected: boolean
  isInFocus: boolean
  onClick: () => void
}

export function KanbanCard({ card, category, isSelected, isInFocus, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const tagClass = category
    ? (styles as Record<string, string>)[category.slug] ?? styles.custom
    : undefined

  const formattedDue = card.due_date
    ? new Date(card.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        styles.card,
        isSelected ? styles.selected : '',
        isInFocus ? styles.inFocus : '',
      ].join(' ')}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      <span className={styles.title}>{card.title}</span>
      <div className={styles.meta}>
        {category && (
          <span className={`${styles.tag} ${tagClass}`}>{category.name}</span>
        )}
        {isInFocus && (
          <span className={styles.inFocusBadge}>
            <span className={styles.dot} />
            Em foco
          </span>
        )}
      </div>
      {(formattedDue || card.total_focus_time > 0) && (
        <div className={styles.footer}>
          {formattedDue && <span className={styles.date}>{formattedDue}</span>}
          {card.total_focus_time > 0 && (
            <span className={styles.sessions}>
              <Icon id="clock" size={11} />
              {fmtDuration(card.total_focus_time)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
