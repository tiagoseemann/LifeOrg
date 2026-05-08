import { fmtTime } from '../lib/format'
import type { Block } from '../types/calendar'
import type { Category } from '../types/kanban'
import styles from './CalBlock.module.css'

const HOUR_HEIGHT = 52

interface CalBlockProps {
  block: Block
  category: Category | undefined
  dayStartHour: number
  onClick: (e: React.MouseEvent) => void
}

export function CalBlock({ block, category, dayStartHour, onClick }: CalBlockProps) {
  const start = new Date(block.start_datetime)
  const end   = new Date(block.end_datetime)

  const startH = start.getHours() + start.getMinutes() / 60
  const endH   = end.getHours()   + end.getMinutes()   / 60

  const top    = (startH - dayStartHour) * HOUR_HEIGHT
  const height = Math.max((endH - startH) * HOUR_HEIGHT - 2, 14)

  const slug = category?.slug ?? 'default'
  const catClass = (styles as Record<string, string>)[slug] ?? styles.default

  const tooltipText = [block.title, category?.name ?? '', `${fmtTime(start)} – ${fmtTime(end)}`]
    .filter(Boolean).join('\n')

  const showTime = height >= 28

  return (
    <div
      className={`${styles.block} ${catClass}`}
      style={{ top: `${top}px`, height: `${height}px` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(e as unknown as React.MouseEvent) }}
      title={tooltipText}
      aria-label={`${block.title}, ${fmtTime(start)} – ${fmtTime(end)}`}
    >
      <div className={styles.title}>{block.title}</div>
      {showTime && <div className={styles.time}>{fmtTime(start)} – {fmtTime(end)}</div>}
    </div>
  )
}
