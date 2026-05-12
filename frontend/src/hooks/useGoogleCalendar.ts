import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

interface GoogleStatus {
  connected: boolean
}

interface SyncResult {
  synced: number
  connected: boolean
  error?: string
}

const STATUS_KEY = ['google-status']

export function useGoogleStatus() {
  return useQuery<GoogleStatus>({
    queryKey: STATUS_KEY,
    queryFn: () => apiFetch<GoogleStatus>('/api/auth/google/status'),
    refetchInterval: 30_000,
  })
}

export function useGoogleSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (weekStart: string) =>
      apiFetch<SyncResult>(`/api/google/sync?week_start=${weekStart}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocks'] })
    },
  })
}

export function useGoogleDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<{ disconnected: boolean }>('/api/auth/google/disconnect', {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STATUS_KEY })
      qc.invalidateQueries({ queryKey: ['blocks'] })
    },
  })
}

export function openGoogleConnect() {
  // Caminho relativo: passa pelo proxy Vite; o middleware isenta /api/auth/google.
  window.location.href = '/api/auth/google/connect'
}

/**
 * Auto-sync com pausa quando a aba está escondida (decisão de produto #4 refinada).
 * Sincroniza ao montar, a cada 2 minutos, e quando a aba volta a ficar visível.
 */
export function useGoogleAutoSync(weekStart: string, enabled: boolean) {
  const sync = useGoogleSync()
  const [visible, setVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  )

  useEffect(() => {
    function onVisibility() {
      setVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!enabled || !visible) return
    sync.mutate(weekStart)
    const id = setInterval(() => sync.mutate(weekStart), 120_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, visible, weekStart])

  return sync
}
