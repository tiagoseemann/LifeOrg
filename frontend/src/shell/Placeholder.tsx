import { Icon } from './Icon'
import styles from './Placeholder.module.css'

interface PlaceholderProps {
  title: string
  subtitle?: string
  icon: string
}

export function Placeholder({ title, subtitle = 'Em desenvolvimento', icon }: PlaceholderProps) {
  return (
    <div className={styles.placeholder}>
      <div className={styles.icon}>
        <Icon id={icon} size={28} />
      </div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  )
}
