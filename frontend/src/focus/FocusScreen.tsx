import { useCallback, useEffect, useRef, useState } from 'react'
import { FocusRing } from './FocusRing'
import { CardPicker } from './CardPicker'
import { Icon } from '../shell/Icon'
import { fmtTimer, fmtDuration, fmtTime } from '../lib/format'
import { useFocusStore, type DurKey } from '../store/focusStore'
import { useCards } from '../hooks/useCards'
import { useCategories } from '../hooks/useCategories'
import { useActiveSession, useCreateSession, useDiscardSession, useEndSession, useHeartbeat, useTodaySessions } from '../hooks/useSessions'
import type { Card } from '../types/kanban'
import styles from './FocusScreen.module.css'

const DUR_OPTIONS: { key: DurKey; label: string }[] = [
  { key: '15', label: '15min' },
  { key: '25', label: '25min' },
  { key: '45', label: '45min' },
  { key: '60', label: '60min' },
  { key: 'free', label: 'Livre' },
]

interface FocusScreenProps {
  onGoToCard: (cardId: string) => void
}

export function FocusScreen({ onGoToCard }: FocusScreenProps) {
  const {
    activeSessionId, elapsed, running, paused,
    mode, durKey, customMin, durationSeconds, pendingCardId,
    setActiveSession, setElapsed, setRunning, setPaused,
    setDurKey, setCustomMin, setPendingCardId, reset,
  } = useFocusStore()

  const [showPicker, setShowPicker]           = useState(false)
  const [selectedCard, setSelectedCard]       = useState<Card | null>(null)
  const [recoverySession, setRecoverySession] = useState<{ id: string; title: string; elapsed: number } | null>(null)

  const { data: cards = [] }          = useCards()
  const { data: categories = [] }     = useCategories()
  const { data: activeSession }       = useActiveSession()
  const { data: todaySessions = [] }  = useTodaySessions()

  const createSession = useCreateSession()
  const endSession    = useEndSession()
  const discard       = useDiscardSession()
  const heartbeat     = useHeartbeat(activeSessionId)

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  // Detect orphaned session on mount (RN-FOC-05)
  useEffect(() => {
    if (!activeSession || activeSessionId) return
    const started = new Date(activeSession.started_at)
    const hb      = activeSession.last_heartbeat_at ? new Date(activeSession.last_heartbeat_at) : started
    const ageH    = (Date.now() - hb.getTime()) / 3_600_000
    if (ageH > 24) {
      discard.mutate(activeSession.id)
      return
    }
    const recoveredElapsed = Math.floor((hb.getTime() - started.getTime()) / 1000)
    setRecoverySession({ id: activeSession.id, title: activeSession.card_title_snapshot, elapsed: recoveredElapsed })
  }, [activeSession])  // eslint-disable-line

  // Auto-start from pendingCardId (set by Kanban "Iniciar Foco")
  useEffect(() => {
    if (!pendingCardId || cards.length === 0) return
    const card = cards.find(c => c.id === pendingCardId)
    if (card) {
      setPendingCardId(null)
      handleSelectCard(card)
    }
  }, [pendingCardId, cards])  // eslint-disable-line

  // Tick interval
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1
        if (durationSeconds !== null && next >= durationSeconds) {
          clearInterval(id)
          setRunning(false)
          if (activeSessionId) endSession.mutate({ id: activeSessionId, elapsed_seconds: durationSeconds })
          reset()
          return durationSeconds
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, durationSeconds, activeSessionId])  // eslint-disable-line

  // Heartbeat every 30s
  useEffect(() => {
    if (!running || !activeSessionId) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      return
    }
    heartbeatRef.current = setInterval(() => heartbeat.mutate(), 30_000)
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
  }, [running, activeSessionId])  // eslint-disable-line

  const handleSelectCard = useCallback(async (card: Card) => {
    setShowPicker(false)
    const cat = card.category_id ? catMap[card.category_id] : null
    const session = await createSession.mutateAsync({
      card_id: card.id,
      card_title_snapshot: card.title,
      card_cat_snapshot: cat?.name ?? null,
      mode,
      duration_seconds: durationSeconds,
    })
    setSelectedCard(card)
    setActiveSession(session.id)
    setElapsed(0)
    setRunning(true)
    setPaused(false)
  }, [mode, durationSeconds, catMap, createSession, setActiveSession, setElapsed, setRunning, setPaused])

  function handlePauseResume() {
    if (running) { setRunning(false); setPaused(true) }
    else         { setRunning(true);  setPaused(false) }
  }

  function handleStop() {
    if (!activeSessionId) return
    endSession.mutate({ id: activeSessionId, elapsed_seconds: elapsed })
    reset()
    setSelectedCard(null)
  }

  function handleRecoveryCountabilize() {
    if (!recoverySession) return
    endSession.mutate({ id: recoverySession.id, elapsed_seconds: recoverySession.elapsed })
    setRecoverySession(null)
  }

  function handleRecoveryDiscard() {
    if (!recoverySession) return
    discard.mutate(recoverySession.id)
    setRecoverySession(null)
  }

  const progress = (durationSeconds && elapsed > 0) ? elapsed / durationSeconds : 0
  const isActive = !!activeSessionId
  const isFree   = mode === 'free'
  const totalTodaySeconds = todaySessions.reduce((acc, s) => acc + (s.elapsed_seconds ?? 0), 0)

  return (
    <div className={styles.screen}>
      {/* Recovery modal */}
      {recoverySession && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(30,28,26,0.5)',
          zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--color-bg-surface)', borderRadius: 14,
            padding: '28px 32px', maxWidth: 420, width: '90%',
            boxShadow: 'var(--shadow-modal)', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400 }}>
              Sessão interrompida
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Você tinha uma sessão ativa para <strong>{recoverySession.title}</strong>.
              Deseja contabilizar {fmtDuration(recoverySession.elapsed)}?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={handleRecoveryDiscard}
                style={{ background: 'transparent', border: '0.5px solid var(--color-border)', borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer' }}
              >
                Descartar
              </button>
              <button
                onClick={handleRecoveryCountabilize}
                style={{ background: 'var(--color-accent)', color: 'var(--color-white)', border: 'none', borderRadius: 8, padding: '7px 20px', fontSize: 13, cursor: 'pointer' }}
              >
                Contabilizar {fmtDuration(recoverySession.elapsed)}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.stage}>
        {!isActive ? (
          <>
            <div className={styles.idleIcon}><Icon id="focus" size={28} /></div>
            <h1 className={styles.idleTitle}>Nenhuma tarefa em foco</h1>
            <p className={styles.idleHelper}>Selecione um card do Kanban para começar</p>
            <button className={styles.selectBtn} onClick={() => setShowPicker(true)}>
              <Icon id="play" size={14} />
              Selecionar Tarefa
            </button>
            <div className={styles.durSection}>
              <span className={styles.durLabel}>Duração da sessão</span>
              <div className={styles.durRow}>
                {DUR_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className={`${styles.durChip} ${durKey === opt.key ? styles.active : ''}`}
                    onClick={() => setDurKey(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
                <input
                  type="number"
                  className={`${styles.customInput} ${durKey === 'custom' ? styles.active : ''}`}
                  value={customMin}
                  min={1} max={999}
                  placeholder="min"
                  onChange={e => {
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v) && v > 0) { setCustomMin(v); setDurKey('custom') }
                  }}
                  onFocus={() => setDurKey('custom')}
                  aria-label="Duração personalizada em minutos"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <span className={styles.eyebrow}>EM FOCO</span>
            <h2 className={styles.taskTitle}>{selectedCard?.title ?? '—'}</h2>
            {selectedCard?.category_id && catMap[selectedCard.category_id] && (
              <span className={styles.taskCat}>
                <span className={styles.catDot} />
                {catMap[selectedCard.category_id].name.toUpperCase()}
              </span>
            )}
            <div className={styles.ringWrap}>
              <FocusRing progress={isFree ? 0 : progress} />
              {isFree && (
                <div className={styles.freeModeBadge}>
                  <span className={styles.freeModeDot} />
                  Cronômetro livre
                </div>
              )}
              <span className={`${styles.timerText} ${paused ? styles.paused : ''}`}>
                {isFree
                  ? fmtTimer(elapsed)
                  : fmtTimer(Math.max(0, (durationSeconds ?? 0) - elapsed))
                }
              </span>
            </div>
            <div className={styles.controls}>
              <button className={styles.controlBtn} onClick={handlePauseResume}>
                <Icon id={running ? 'pause' : 'play'} size={14} />
                {running ? 'Pausar' : 'Retomar'}
              </button>
              <button className={styles.controlBtn} onClick={handleStop}>
                <Icon id="stop" size={14} />
                Encerrar
              </button>
              {selectedCard && (
                <button className={styles.controlBtn} onClick={() => onGoToCard(selectedCard.id)}>
                  <Icon id="arrow-out" size={14} />
                  Ver Card
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className={styles.history}>
        <span className={styles.historyLabel}>Histórico hoje</span>
        <div className={styles.historyChips}>
          {todaySessions.length === 0 && (
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Nenhuma sessão hoje</span>
          )}
          {todaySessions.map(s => (
            <div key={s.id} className={styles.chip}>
              <span className={styles.chipTitle}>{s.card_title_snapshot}</span>
              <span className={styles.chipDur}>{fmtDuration(s.elapsed_seconds ?? 0)}</span>
              <span className={styles.chipTime}>{fmtTime(new Date(s.started_at))}</span>
            </div>
          ))}
        </div>
        {totalTodaySeconds > 0 && (
          <div className={styles.historyTotal}>
            <span className={styles.historyTotalLabel}>Total hoje</span>
            <span className={styles.historyTotalValue}>{fmtDuration(totalTodaySeconds)}</span>
          </div>
        )}
      </div>

      {showPicker && (
        <CardPicker
          cards={cards}
          categories={categories}
          onSelect={handleSelectCard}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
