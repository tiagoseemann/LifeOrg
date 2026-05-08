import { useAppStore, Screen } from '../store/appStore'
import { Icon } from './Icon'
import styles from './Sidebar.module.css'

const NAV_ITEMS: { screen: Screen; icon: string; label: string }[] = [
  { screen: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { screen: 'calendar',  icon: 'calendar',  label: 'Calendário' },
  { screen: 'kanban',    icon: 'kanban',    label: 'Kanban' },
  { screen: 'focus',     icon: 'focus',     label: 'Foco' },
  { screen: 'finance',   icon: 'finance',   label: 'Financeiro' },
]

export function Sidebar() {
  const { activeScreen, setActive } = useAppStore()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand} aria-label="LifeOrg">OS</div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ screen, icon, label }) => (
          <button
            key={screen}
            className={`${styles.navBtn} ${activeScreen === screen ? styles.active : ''}`}
            onClick={() => setActive(screen)}
            aria-label={label}
            aria-current={activeScreen === screen ? 'page' : undefined}
          >
            <Icon id={icon} size={20} />
            <span className={styles.tooltip}>{label}</span>
          </button>
        ))}
      </nav>
      <div className={styles.foot}>
        <div className={styles.avatar} aria-label="Usuário">TS</div>
      </div>
    </aside>
  )
}
