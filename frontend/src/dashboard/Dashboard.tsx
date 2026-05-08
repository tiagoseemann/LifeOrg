import { useMemo } from 'react'
import { TasksMetricCard, FocusMetricCard, NextBlockMetricCard } from './MetricCard'
import { TimePie } from './TimePie'
import { AgendaPanel } from './AgendaPanel'
import { KanbanPreview } from './KanbanPreview'
import { useCards } from '../hooks/useCards'
import { useColumns } from '../hooks/useColumns'
import { useBlocks } from '../hooks/useBlocks'
import { useCategories } from '../hooks/useCategories'
import { useTodaySessions } from '../hooks/useSessions'
import { localDateStr } from '../lib/format'
import styles from './Dashboard.module.css'

interface DashboardProps {
  onGoToKanban: () => void
  onGoToCalendar: () => void
}

function getMondayOf(d: Date): string {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m    = new Date(d)
  m.setDate(d.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return localDateStr(m)
}

export function Dashboard({ onGoToKanban, onGoToCalendar }: DashboardProps) {
  const today = localDateStr(new Date())

  const { data: cards   = [] }         = useCards()
  const { data: columns = [] }         = useColumns()
  const { data: categories = [] }      = useCategories()
  const { data: blocks  = [] }         = useBlocks(getMondayOf(new Date()))
  const { data: todaySessions = [] }   = useTodaySessions()

  // Cards with due_date = today
  const todayCards = cards.filter(c => c.due_date === today)
  const doneCards  = todayCards.filter(c => {
    const col = columns.find(col => col.id === c.column_id)
    return col?.title.toLowerCase().includes('concluí') ||
           col?.title.toLowerCase().includes('done') ||
           col?.title.toLowerCase().includes('feito')
  })

  // Focus total today
  const totalFocusToday = todaySessions.reduce((s, sess) => s + (sess.elapsed_seconds ?? 0), 0)

  // Blocks for today
  const todayBlocks = blocks.filter(b => localDateStr(new Date(b.start_datetime)) === today)

  // Next upcoming block
  const now = new Date()
  const nextBlock = todayBlocks
    .filter(b => new Date(b.end_datetime) > now)
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())[0] ?? null

  // Time distribution slices from today's sessions
  const slices = useMemo(() => {
    const byCat: Record<string, { slug: string; name: string; seconds: number }> = {}
    todaySessions.forEach(s => {
      const catName = s.card_cat_snapshot ?? 'Sem categoria'
      const cat     = categories.find(c => c.name === catName)
      const slug    = cat?.slug ?? 'other'
      if (!byCat[slug]) byCat[slug] = { slug, name: catName, seconds: 0 }
      byCat[slug].seconds += s.elapsed_seconds ?? 0
    })
    return Object.values(byCat).filter(s => s.seconds > 0)
  }, [todaySessions, categories])

  return (
    <div className={styles.dashboard}>
      <div className={styles.metrics}>
        <TasksMetricCard done={doneCards.length} total={todayCards.length} />
        <FocusMetricCard totalSeconds={totalFocusToday} />
        <NextBlockMetricCard block={nextBlock} />
      </div>

      {slices.length > 0 && <TimePie slices={slices} />}

      <div className={styles.split}>
        <KanbanPreview columns={columns} cards={cards} onGoToKanban={onGoToKanban} />
        <AgendaPanel blocks={todayBlocks} categories={categories} onGoToCalendar={onGoToCalendar} />
      </div>
    </div>
  )
}
