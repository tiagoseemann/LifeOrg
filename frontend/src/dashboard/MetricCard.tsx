import { fmtDuration, fmtTime } from '../lib/format'
import type { Block } from '../types/calendar'
import styles from './MetricCard.module.css'

interface TasksMetricProps {
  done: number
  total: number
}

export function TasksMetricCard({ done, total }: TasksMetricProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const remaining = total - done

  return (
    <div className={styles.card}>
      <span className={styles.label}>Tarefas hoje</span>
      <div className={styles.value}>
        {done}
        <span className={styles.valueSuffix}>
          {' '}/ {total}
        </span>
      </div>
      <div className={styles.progress}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.sub}>
        <strong>{pct}%</strong> concluído · {remaining} {remaining === 1 ? 'restante' : 'restantes'}
      </span>
    </div>
  )
}

interface FocusMetricProps {
  totalSeconds: number
}

export function FocusMetricCard({ totalSeconds }: FocusMetricProps) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>Foco acumulado</span>
      <div className={styles.valueMono}>{fmtDuration(totalSeconds)}</div>
      <span className={styles.sub}>tempo total de sessões hoje</span>
    </div>
  )
}

interface NextBlockMetricProps {
  block: Block | null
}

export function NextBlockMetricCard({ block }: NextBlockMetricProps) {
  if (!block) {
    return (
      <div className={styles.card}>
        <span className={styles.label}>Próximo bloco</span>
        <span className={`${styles.sub} ${styles.subTop}`}>Nenhum bloco agendado para hoje</span>
      </div>
    )
  }

  const start = new Date(block.start_datetime)
  const now = Date.now()
  const diffMs = start.getTime() - now
  const diffMin = Math.max(0, Math.floor(diffMs / 60_000))
  const diffH = Math.floor(diffMin / 60)
  const remMin = diffMin % 60

  let countdown = ''
  if (diffMs <= 0) countdown = 'em andamento'
  else if (diffH > 0) countdown = remMin > 0 ? `em ${diffH}h ${remMin}min` : `em ${diffH}h`
  else countdown = `em ${diffMin}min`

  return (
    <div className={styles.card}>
      <span className={styles.label}>Próximo bloco</span>
      <span className={styles.nextTime}>{fmtTime(start)} – {fmtTime(new Date(block.end_datetime))}</span>
      <span className={styles.nextTitle}>{block.title}</span>
      <div className={styles.nextPill}>
        <span className={styles.pulseDot} />
        {countdown}
      </div>
    </div>
  )
}
