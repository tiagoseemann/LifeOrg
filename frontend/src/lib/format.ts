const PT_BR = 'pt-BR'

/** "Sex, 8 de maio" */
export function fmtDate(date: Date): string {
  return date.toLocaleDateString(PT_BR, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).replace('.', '')
}

/** "4 – 10 de maio de 2026" — en-dash with spaces */
export function fmtDateRange(start: Date, end: Date): string {
  const startDay = start.getDate()
  const endFull  = end.toLocaleDateString(PT_BR, { day: 'numeric', month: 'long', year: 'numeric' })
  return `${startDay} – ${endFull}`
}

/** "HH:MM" 24h */
export function fmtTime(date: Date): string {
  return date.toLocaleTimeString(PT_BR, { hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * Formats seconds as "Hh Mmin" / "Hh" / "Mmin" — never decimals.
 * Examples: 3661 → "1h 1min" | 3600 → "1h" | 90 → "1min"
 */
export function fmtDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

/**
 * Formats seconds as MM:SS or HH:MM:SS when >= 1 hour.
 * Used for the focus timer display.
 */
export function fmtTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) {
    const hh = String(h).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}

/** Returns "YYYY-MM-DD" in the user's LOCAL timezone (not UTC) */
export function localDateStr(date: Date): string {
  return date.toLocaleDateString('sv')  // 'sv' locale always formats as YYYY-MM-DD
}
