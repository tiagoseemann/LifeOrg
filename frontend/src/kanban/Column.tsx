import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Icon } from '../shell/Icon'
import { KanbanCard } from './KanbanCard'
import type { Card, Category, Column as ColumnType } from '../types/kanban'
import styles from './Column.module.css'

interface ColumnProps {
  column: ColumnType
  cards: Card[]
  categories: Category[]
  selectedCardId: string | null
  focusCardId: string | null
  activeFilter: string | null
  onCardClick: (id: string) => void
  onAddCard: (columnId: string) => void
  onRenameColumn: (id: string, title: string) => void
  onDeleteColumn: (id: string, cardCount: number) => void
}

export function Column({
  column, cards, categories, selectedCardId, focusCardId,
  activeFilter, onCardClick, onAddCard, onRenameColumn, onDeleteColumn,
}: ColumnProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(column.title)

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const filtered = activeFilter
    ? cards.filter(card => {
        const cat = card.category_id ? catMap[card.category_id] : null
        return cat?.slug === activeFilter
      })
    : cards

  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.id}`,
    data: { type: 'column', columnId: column.id },
  })

  const isProgress = column.title.toLowerCase().includes('progress') ||
                     column.title.toLowerCase().includes('andamento')

  function commitRename() {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== column.title) {
      onRenameColumn(column.id, trimmed)
    } else {
      setEditTitle(column.title)
    }
    setEditing(false)
  }

  return (
    <div
      className={`${styles.column} ${isProgress ? styles.progress : ''}`}
      style={{ outline: isOver ? '2px dashed var(--color-accent)' : undefined }}
    >
      <div className={styles.head}>
        <div style={{ flex: 1 }}>
          {editing ? (
            <input
              className={styles.labelInput}
              value={editTitle}
              autoFocus
              onChange={e => setEditTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') { setEditTitle(column.title); setEditing(false) }
              }}
            />
          ) : (
            <span className={styles.label}>{column.title}</span>
          )}
        </div>
        <span className={styles.countBadge}>{filtered.length}</span>
        <div className={styles.headActions}>
          <button
            className={styles.headBtn}
            aria-label="Renomear coluna"
            onClick={() => setEditing(true)}
          >
            <Icon id="pencil" size={14} />
          </button>
          <button
            className={`${styles.headBtn} ${styles.danger}`}
            aria-label="Excluir coluna"
            onClick={() => onDeleteColumn(column.id, cards.length)}
          >
            <Icon id="x" size={14} />
          </button>
        </div>
      </div>

      <div ref={setNodeRef} className={styles.cards}>
        <SortableContext items={filtered.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {filtered.map(card => (
            <KanbanCard
              key={card.id}
              card={card}
              category={card.category_id ? catMap[card.category_id] : undefined}
              isSelected={selectedCardId === card.id}
              isInFocus={focusCardId === card.id}
              onClick={() => onCardClick(card.id)}
            />
          ))}
        </SortableContext>
      </div>

      <button className={styles.addBtn} onClick={() => onAddCard(column.id)}>
        <Icon id="plus" size={14} />
        Adicionar
      </button>
    </div>
  )
}
