import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Icon } from '../shell/Icon'
import { Column } from './Column'
import { KanbanCard } from './KanbanCard'
import { Drawer } from './Drawer'
import { useColumns, useCreateColumn, useDeleteColumn, useReorderColumns, useUpdateColumn } from '../hooks/useColumns'
import { useCards, useCreateCard, useUpdateCard, useDeleteCard, useReorderCards, type CardUpdatePayload } from '../hooks/useCards'
import { useCategories } from '../hooks/useCategories'
import { useKanbanStore } from '../store/kanbanStore'
import type { Card } from '../types/kanban'
import styles from './KanbanScreen.module.css'

interface KanbanScreenProps {
  onStartFocus: (card: Card) => void
}

interface ConfirmState {
  columnId: string
  columnTitle: string
  cardCount: number
}

export function KanbanScreen({ onStartFocus }: KanbanScreenProps) {
  const { activeFilter, selectedCardId, searchQuery, setFilter, selectCard, setSearch } = useKanbanStore()
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [draggingCard, setDraggingCard] = useState<Card | null>(null)

  const { data: columns = [] } = useColumns()
  const { data: cards = [] } = useCards()
  const { data: categories = [] } = useCategories()

  const createColumn = useCreateColumn()
  const updateColumn = useUpdateColumn()
  const deleteColumn = useDeleteColumn()
  const reorderColumns = useReorderColumns()
  const createCard = useCreateCard()
  const updateCard = useUpdateCard()
  const deleteCard = useDeleteCard()
  const reorderCards = useReorderCards()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const selectedCard = cards.find(c => c.id === selectedCardId) ?? null

  const visibleCards = searchQuery
    ? cards.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : cards

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find(c => c.id === event.active.id)
    if (card) setDraggingCard(card)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingCard(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeCard = cards.find(c => c.id === active.id)
    if (!activeCard) return

    const overCard = cards.find(c => c.id === over.id)
    const overData = over.data.current as { type: string; columnId?: string }
    const targetColumnId = overData?.type === 'column'
      ? overData.columnId!
      : overCard?.column_id ?? activeCard.column_id

    if (targetColumnId !== activeCard.column_id) {
      // Move card to new column: PATCH column_id first, then reorder within target column
      updateCard.mutate(
        { id: activeCard.id, column_id: targetColumnId },
        {
          onSuccess: () => {
            const targetCards = cards
              .filter(c => c.column_id === targetColumnId && c.id !== activeCard.id)
              .sort((a, b) => a.position - b.position)
              .map(c => c.id)
            reorderCards.mutate({ columnId: targetColumnId, orderedIds: [...targetCards, activeCard.id] })
          },
        }
      )
    } else {
      const colCards = cards
        .filter(c => c.column_id === activeCard.column_id)
        .sort((a, b) => a.position - b.position)
      const oldIdx = colCards.findIndex(c => c.id === active.id)
      const newIdx = colCards.findIndex(c => c.id === over.id)
      if (oldIdx === -1 || newIdx === -1) return
      const reordered = arrayMove(colCards, oldIdx, newIdx).map(c => c.id)
      reorderCards.mutate({ columnId: activeCard.column_id, orderedIds: reordered })
    }
  }

  const handleCardChange = useCallback((updates: Omit<CardUpdatePayload, 'id'>) => {
    if (!selectedCardId) return
    updateCard.mutate({ id: selectedCardId, ...updates })
  }, [selectedCardId, updateCard])

  function handleDeleteColumn(columnId: string, cardCount: number) {
    const col = columns.find(c => c.id === columnId)
    if (!col) return
    if (cardCount === 0) {
      deleteColumn.mutate(columnId)
    } else {
      setConfirm({ columnId, columnTitle: col.title, cardCount })
    }
  }

  function confirmDeleteColumn() {
    if (!confirm) return
    deleteColumn.mutate(confirm.columnId)
    setConfirm(null)
    const cardInCol = cards.find(c => c.id === selectedCardId && c.column_id === confirm.columnId)
    if (cardInCol) selectCard(null)
  }

  function handleDeleteCard(cardId: string) {
    deleteCard.mutate(cardId)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Kanban</h1>
          <span className={styles.countPill}>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</span>
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${activeFilter === null ? styles.active : ''}`}
            onClick={() => setFilter(null)}
          >
            todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`${styles.filterBtn} ${activeFilter === cat.slug ? styles.active : ''}`}
              onClick={() => setFilter(activeFilter === cat.slug ? null : cat.slug)}
            >
              {cat.name.toLowerCase()}
            </button>
          ))}
        </div>

        <input
          type="search"
          className={styles.searchInput}
          placeholder="Buscar cards…"
          value={searchQuery}
          onChange={e => setSearch(e.target.value)}
          aria-label="Buscar cards"
        />

        <button className={styles.ctaBtn} onClick={() => {
          const firstCol = columns[0]
          if (firstCol) createCard.mutate({ title: 'Nova tarefa', column_id: firstCol.id })
        }}>
          <Icon id="plus" size={14} />
          Novo Card
        </button>

        <button className={styles.ctaBtn} onClick={() => createColumn.mutate('Nova coluna')}>
          <Icon id="plus" size={14} />
          Nova Coluna
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.board}>
          {columns.map(col => (
            <Column
              key={col.id}
              column={col}
              cards={visibleCards.filter(c => c.column_id === col.id).sort((a, b) => a.position - b.position)}
              categories={categories}
              selectedCardId={selectedCardId}
              focusCardId={null}
              activeFilter={activeFilter}
              onCardClick={(id) => selectCard(selectedCardId === id ? null : id)}
              onAddCard={(columnId) => createCard.mutate({ title: 'Nova tarefa', column_id: columnId })}
              onRenameColumn={(id, title) => updateColumn.mutate({ id, title })}
              onDeleteColumn={handleDeleteColumn}
            />
          ))}
        </div>

        <DragOverlay>
          {draggingCard && (
            <KanbanCard
              card={draggingCard}
              category={draggingCard.category_id ? catMap[draggingCard.category_id] : undefined}
              isSelected={false}
              isInFocus={false}
              onClick={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      {selectedCard && (
        <Drawer
          card={selectedCard}
          columns={columns}
          categories={categories}
          onClose={() => selectCard(null)}
          onChange={handleCardChange}
          onStartFocus={onStartFocus}
          onDelete={handleDeleteCard}
        />
      )}

      {confirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <h2 className={styles.confirmTitle}>Excluir coluna?</h2>
            <p className={styles.confirmText}>
              A coluna "{confirm.columnTitle}" contém {confirm.cardCount} {confirm.cardCount === 1 ? 'card' : 'cards'}.
              Ao excluir a coluna, todos os cards serão permanentemente excluídos. Esta ação não pode ser desfeita.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setConfirm(null)}>Cancelar</button>
              <button className={styles.confirmDanger} onClick={confirmDeleteColumn}>Excluir tudo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
