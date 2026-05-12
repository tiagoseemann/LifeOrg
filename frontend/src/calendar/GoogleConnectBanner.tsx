import { useEffect } from 'react'
import {
  openGoogleConnect,
  useGoogleAutoSync,
  useGoogleDisconnect,
  useGoogleStatus,
  useGoogleSync,
} from '../hooks/useGoogleCalendar'
import styles from './GoogleConnectBanner.module.css'

interface Props {
  weekStart: string
}

export function GoogleConnectBanner({ weekStart }: Props) {
  const { data: status } = useGoogleStatus()
  const sync = useGoogleSync()
  const disconnect = useGoogleDisconnect()

  useGoogleAutoSync(weekStart, status?.connected === true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_connected') === 'true') {
      window.history.replaceState({}, '', window.location.pathname)
      sync.mutate(weekStart)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!status) return null

  if (!status.connected) {
    return (
      <div className={styles.banner}>
        <span className={styles.bannerText}>Sincronize com o Google Calendar</span>
        <button className={styles.connectBtn} onClick={openGoogleConnect}>
          Conectar Google
        </button>
      </div>
    )
  }

  return (
    <div className={styles.bannerConnected}>
      <div className={styles.connectedInfo}>
        <span className={styles.dot} />
        <span className={styles.bannerText}>Google Calendar conectado</span>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.syncBtn}
          onClick={() => sync.mutate(weekStart)}
          disabled={sync.isPending}
        >
          {sync.isPending ? 'Sincronizando…' : '↻ Sincronizar'}
        </button>
        <button className={styles.disconnectBtn} onClick={() => disconnect.mutate()}>
          Desconectar
        </button>
      </div>
    </div>
  )
}
