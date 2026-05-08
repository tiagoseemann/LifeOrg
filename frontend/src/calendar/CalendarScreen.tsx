import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '../shell/Icon'
import { CalBlock } from './CalBlock'
import { NewBlockModal } from './NewBlockModal'
import { useBlocks, useCreateBlock, useDeleteBlock, useUpdateBlock } from '../hooks/useBlocks'
import { useCategories } from '../hooks/useCategories'
import { fmtDateRange, fmtTime, localDateStr } from '../lib/format'
import type { Block } from '../types/calendar'
import styles from './CalendarScreen.module.css'

const DAY_START   = 6
const DAY_END     = 23
const HOUR_HEIGHT = 52

const PT_WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getMondayOf(d: Date): Date {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function CalendarScreen() {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()))
  const [now, setNow] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editBlock, setEditBlock] = useState<Block | null>(null)

  const weekParam = localDateStr(weekStart)
  const { data: blocks = [] }     = useBlocks(weekParam)
  const { data: categories = [] } = useCategories()
  const createBlock = useCreateBlock()
  const updateBlock = useUpdateBlock()
  const deleteBlock = useDeleteBlock()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d
    }),
    [weekStart]
  )

  const hours       = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)
  const gridHeight  = (DAY_END - DAY_START) * HOUR_HEIGHT
  const nowOffsetY  = ((now.getHours() + now.getMinutes() / 60) - DAY_START) * HOUR_HEIGHT

  function blocksForDay(day: Date): Block[] {
    const dateStr = localDateStr(day)
    return blocks.filter(b => localDateStr(new Date(b.start_datetime)) === dateStr)
  }

  const rangeLabel = fmtDateRange(days[0], days[6])

  const handleSave = useCallback((data: Omit<Block, 'id'>) => {
    if (editBlock) {
      updateBlock.mutate({ id: editBlock.id, ...data })
    } else {
      createBlock.mutate(data)
    }
    setShowModal(false)
    setEditBlock(null)
  }, [editBlock, createBlock, updateBlock])

  const handleDelete = useCallback(() => {
    if (!editBlock) return
    if (editBlock.card_id) {
      const confirmed = window.confirm(
        `Este bloco está vinculado a um card. Ao excluir o bloco, o card será mantido. Deseja continuar?`
      )
      if (!confirmed) return
    }
    deleteBlock.mutate(editBlock.id)
    setShowModal(false)
    setEditBlock(null)
  }, [editBlock, deleteBlock])

  function navigateWeek(delta: number) {
    setWeekStart(prev => {
      const next = new Date(prev)
      next.setDate(prev.getDate() + delta * 7)
      return next
    })
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.navCluster}>
          <button className={styles.chevron} aria-label="Semana anterior" onClick={() => navigateWeek(-1)}>‹</button>
          <span className={styles.range}>{rangeLabel}</span>
          <button className={styles.chevron} aria-label="Próxima semana" onClick={() => navigateWeek(1)}>›</button>
          <button className={styles.todayBtn} onClick={() => setWeekStart(getMondayOf(new Date()))}>Hoje</button>
        </div>
        <button className={styles.newBlockBtn} onClick={() => { setEditBlock(null); setShowModal(true) }}>
          <Icon id="plus" size={14} />
          Novo Bloco
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.gridHeader}>
          <div className={styles.cornerCell} />
          {days.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString()
            return (
              <div key={i} className={`${styles.dayHead} ${isToday ? styles.today : ''}`}>
                <span className={styles.dayName}>{PT_WEEKDAYS[day.getDay()]}</span>
                <span className={styles.dayNum}>{day.getDate()}</span>
              </div>
            )
          })}
        </div>

        <div className={styles.gridBody}>
          <div className={styles.hoursCol} style={{ height: `${gridHeight}px` }}>
            {hours.map(h => (
              <span
                key={h}
                className={styles.hourLabel}
                style={{ top: `${(h - DAY_START) * HOUR_HEIGHT}px` }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {days.map((day, colIdx) => {
            const isToday = day.toDateString() === new Date().toDateString()
            const dayBlocks = blocksForDay(day)

            return (
              <div
                key={colIdx}
                className={`${styles.dayCol} ${isToday ? styles.today : ''}`}
                style={{ height: `${gridHeight}px` }}
                onClick={() => { setEditBlock(null); setShowModal(true) }}
              >
                {hours.map(h => (
                  <div
                    key={h}
                    className={styles.hourLine}
                    style={{ top: `${(h - DAY_START) * HOUR_HEIGHT}px` }}
                  />
                ))}

                {isToday && nowOffsetY >= 0 && nowOffsetY <= gridHeight && (
                  <div className={styles.nowLine} style={{ top: `${nowOffsetY}px` }}>
                    <div className={styles.nowDot} />
                    <span className={styles.nowLabel}>{fmtTime(now)}</span>
                  </div>
                )}

                {dayBlocks.map(block => (
                  <CalBlock
                    key={block.id}
                    block={block}
                    category={block.category_id ? catMap[block.category_id] : undefined}
                    dayStartHour={DAY_START}
                    onClick={e => {
                      e.stopPropagation()
                      setEditBlock(block)
                      setShowModal(true)
                    }}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {showModal && (
        <NewBlockModal
          categories={categories}
          editBlock={editBlock}
          onSave={handleSave}
          onDelete={editBlock ? handleDelete : undefined}
          onClose={() => { setShowModal(false); setEditBlock(null) }}
        />
      )}
    </div>
  )
}
