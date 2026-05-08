import { fmtDuration } from '../lib/format'
import styles from './TimePie.module.css'

const CAT_COLORS: Record<string, string> = {
  trabalho: '#CC5200',
  estudo:   '#5B6356',
  pessoal:  '#B08C5E',
}
const DEFAULT_COLOR = '#D3D1C7'

interface Slice {
  slug: string
  name: string
  seconds: number
}

interface TimePieProps {
  slices: Slice[]
  size?: number
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg)
  const end   = polarToCartesian(cx, cy, r, startDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`
}

export function TimePie({ slices, size = 160 }: TimePieProps) {
  const total = slices.reduce((s, sl) => s + sl.seconds, 0)
  const cx = size / 2
  const cy = size / 2
  const r  = size / 2 - 10

  if (total === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Distribuição do tempo</span>
        </div>
        <div className={styles.empty}>Nenhuma sessão registrada hoje</div>
      </div>
    )
  }

  let angle = 0
  const arcs = slices.map(sl => {
    const deg   = (sl.seconds / total) * 360
    const path  = describeArc(cx, cy, r, angle, angle + deg)
    const color = CAT_COLORS[sl.slug] ?? DEFAULT_COLOR
    angle += deg
    return { ...sl, path, color, pct: Math.round((sl.seconds / total) * 100) }
  })

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Distribuição do tempo</span>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.chartWrap}>
          <svg width={size} height={size}>
            {arcs.map((arc, i) => (
              <path
                key={i}
                d={arc.path}
                fill={arc.color}
                style={{ transition: 'opacity 0.12s ease', cursor: 'default' }}
                onMouseEnter={e => { (e.target as SVGPathElement).style.opacity = '0.82' }}
                onMouseLeave={e => { (e.target as SVGPathElement).style.opacity = '1' }}
              >
                <title>{arc.name} · {fmtDuration(arc.seconds)} ({arc.pct}%)</title>
              </path>
            ))}
            <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--color-bg-surface)" />
          </svg>
          <div className={styles.centerLabel}>
            <span className={styles.centerTotal}>{fmtDuration(total)}</span>
            <span className={styles.centerSub}>total</span>
          </div>
        </div>
        <div className={styles.legend}>
          {arcs.map((arc, i) => (
            <div key={i} className={styles.legendRow}>
              <span className={styles.legendDot} style={{ background: arc.color }} />
              <span className={styles.legendName}>{arc.name}</span>
              <span className={styles.legendTime}>{fmtDuration(arc.seconds)}</span>
              <span className={styles.legendPct}>{arc.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
