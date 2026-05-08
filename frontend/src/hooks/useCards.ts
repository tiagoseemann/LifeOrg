import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { Card } from '../types/kanban'

const CARDS_KEY = ['cards']

// Excludes read-only fields managed by the backend
export type CardUpdatePayload = {
  id: string
  title?: string
  column_id?: string
  description?: string | null
  category_id?: string | null
  priority?: Card['priority'] | null
  due_date?: string | null
  time_estimate?: number | null
  checklist?: Card['checklist']
}

export function useCards() {
  return useQuery({
    queryKey: CARDS_KEY,
    queryFn: () => apiFetch<Card[]>('/api/cards'),
  })
}

export function useCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { title: string; column_id: string }) =>
      apiFetch<Card>('/api/cards', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARDS_KEY }),
  })
}

export function useUpdateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: CardUpdatePayload) =>
      apiFetch<Card>(`/api/cards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARDS_KEY }),
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/cards/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARDS_KEY }),
  })
}

export function useReorderCards() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, orderedIds }: { columnId: string; orderedIds: string[] }) =>
      apiFetch<Card[]>('/api/cards/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ column_id: columnId, ordered_ids: orderedIds }),
      }),
    onMutate: async ({ columnId, orderedIds }) => {
      await qc.cancelQueries({ queryKey: CARDS_KEY })
      const previous = qc.getQueryData<Card[]>(CARDS_KEY)
      if (previous) {
        const updated = previous.map(card => {
          const idx = orderedIds.indexOf(card.id)
          if (idx === -1) return card
          return { ...card, column_id: columnId, position: idx }
        })
        qc.setQueryData(CARDS_KEY, updated)
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(CARDS_KEY, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CARDS_KEY }),
  })
}
