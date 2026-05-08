import { useEffect, useRef } from 'react'
import { useFocusStore } from '../store/focusStore'
import { useEndSession, useHeartbeat } from './useSessions'

export function useFocusTimer() {
  const {
    activeSessionId, running, durationSeconds,
    setElapsed, setRunning, reset,
  } = useFocusStore()

  const endSession    = useEndSession()
  const heartbeat     = useHeartbeat(activeSessionId)
  const heartbeatRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const endSessionRef = useRef(endSession)
  const resetRef      = useRef(reset)

  useEffect(() => { endSessionRef.current = endSession }, [endSession])
  useEffect(() => { resetRef.current = reset }, [reset])

  // Tick interval — runs regardless of which screen is active
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1
        if (durationSeconds !== null && next >= durationSeconds) {
          clearInterval(id)
          setRunning(false)
          if (activeSessionId) {
            endSessionRef.current.mutate({ id: activeSessionId, elapsed_seconds: durationSeconds })
          }
          resetRef.current()
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
}
