import { fmtTime } from '../lib/format'
import type { Block } from '../types/calendar'
import type { Category } from '../types/kanban'
import styles from './AgendaPanel.module.css'

const AGENDA_START = 6
const AGENDA_END   = 22

interface AgendaPanelProps {
  blocks: Block[]
  categories: Category[]
  onGoToCalendar: () => void
}

export function AgendaPanel({ blocks, categories, onGoToCalendar }: AgendaPanelProps) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const now    = new Date()
  const nowH   = now.getHours() + now.getMinutes() / 60
  const hours  = Array.from({ length: AGENDA_END - AGENDA_START }, (_, i) => AGENDA_START + i)

  function blocksForHour(h: number): Block[] {
    return blocks.filter(b => new Date(b.start_datetime).getHours() === h)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Agenda de hoje</span>
        <button className={styles.link} onClick={onGoToCalendar}>Calendário →</button>
      </div>
      <div className={styles.scroll}>
        {blocks.length === 0 && (
          <div className={styles.empty}>Nenhum bloco agendado para hoje</div>
        )}
        {hours.map(h => {
          const hBlocks = blocksForHour(h)
          const showNow = nowH >= h && nowH < h + 1

          return (
            <div key={h}>
              {showNow && (
                <div className={styles.nowLine}>
                  <div className={styles.nowLineBar} />
                  <span className={styles.nowLineTime}>{fmtTime(now)}</span>
                </div>
              )}
              {hBlocks.length > 0 && (
                <div className={styles.hourRow}>
                  <span className={styles.hourLabel}>{String(h).padStart(2, '0')}:00</span>
                  <div className={styles.blocksWrap}>
                    {hBlocks.map(block => {
                      const cat = block.category_id ? catMap[block.category_id] : undefined
                      const catClass = cat ? (styles as Record<string, string>)[cat.slug] ?? styles.default : styles.default
                      return (
                        <div key={block.id} className={`${styles.ablock} ${catClass}`}>
                          <span className={styles.ablockTitle}>{block.title}</span>
                          <span className={styles.ablockTime}>
                            {fmtTime(new Date(block.start_datetime))} – {fmtTime(new Date(block.end_datetime))}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
