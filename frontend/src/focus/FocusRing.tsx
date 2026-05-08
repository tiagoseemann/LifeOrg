interface FocusRingProps {
  progress: number
  size?: number
}

export function FocusRing({ progress, size = 340 }: FocusRingProps) {
  const r = (size - 12) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)))

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}
      aria-hidden="true"
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth="2" opacity="0.6" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.95s linear' }}
      />
    </svg>
  )
}
