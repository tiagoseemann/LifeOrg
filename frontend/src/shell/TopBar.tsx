import { fmtDate } from '../lib/format'
import { Icon } from './Icon'
import styles from './TopBar.module.css'

const SCREEN_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  calendar:  'Calendário',
  kanban:    'Kanban',
  focus:     'Foco',
  finance:   'Financeiro',
}

interface TopBarProps {
  activeScreen: string
}

export function TopBar({ activeScreen }: TopBarProps) {
  const today = fmtDate(new Date())

  return (
    <header className={styles.topbar}>
      <span className={styles.title}>{SCREEN_TITLES[activeScreen] ?? activeScreen}</span>
      <div className={styles.right}>
        <button className={styles.iconBtn} aria-label="Buscar">
          <Icon id="search" size={18} />
        </button>
        <button className={styles.iconBtn} aria-label="Notificações">
          <Icon id="bell" size={18} />
        </button>
        <span className={styles.dateText}>{today}</span>
        <div className={styles.hojeBadge}>
          <span className={styles.hojeDot} />
          HOJE
        </div>
      </div>
    </header>
  )
}
