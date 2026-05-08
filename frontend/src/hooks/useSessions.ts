import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { Session } from '../types/focus'

const ACTIVE_KEY = ['sessions', 'active']
const TODAY_KEY  = ['sessions', 'today']

export function useActiveSession() {
  return useQuery({
    queryKey: ACTIVE_KEY,
    queryFn: () =>
      apiFetch<Session[]>('/api/sessions?active=true').then(arr => arr[0] ?? null),
    refetchInterval: false,
    staleTime: Infinity,
  })
}

export function useTodaySessions() {
  return useQuery({
    queryKey: TODAY_KEY,
    queryFn: () => apiFetch<Session[]>('/api/sessions?today=true'),
    refetchInterval: 60_000,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      card_id: string
      card_title_snapshot: string
      card_cat_snapshot?: string | null
      mode: 'fixed' | 'free'
      duration_seconds?: number | null
    }) =>
      apiFetch<Session>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVE_KEY }),
  })
}

export function useHeartbeat(sessionId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!sessionId) throw new Error('No session')
      return apiFetch<Session>(`/api/sessions/${sessionId}/heartbeat`, { method: 'PATCH' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVE_KEY }),
  })
}

export function useEndSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, elapsed_seconds }: { id: string; elapsed_seconds: number }) =>
      apiFetch<Session>(`/api/sessions/${id}/end`, {
        method: 'PATCH',
        body: JSON.stringify({ elapsed_seconds }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_KEY })
      qc.invalidateQueries({ queryKey: TODAY_KEY })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
  })
}

export function useDiscardSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_KEY })
      qc.invalidateQueries({ queryKey: TODAY_KEY })
    },
  })
}
