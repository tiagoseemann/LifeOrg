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
                      {cat && <span className={`${styles.tag} ${tagClass}`}>{cat.name}</span>}
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
