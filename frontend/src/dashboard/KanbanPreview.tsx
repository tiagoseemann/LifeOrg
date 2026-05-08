import type { Card, Column } from '../types/kanban'
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
              {extra > 0 && <span className={styles.more}>+{extra} mais</span>}
              {shown.length === 0 && <span className={styles.more}>— vazio —</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
