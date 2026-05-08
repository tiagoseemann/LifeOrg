import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { Column } from '../types/kanban'

const COLUMNS_KEY = ['columns']

export function useColumns() {
  return useQuery({
    queryKey: COLUMNS_KEY,
    queryFn: () => apiFetch<Column[]>('/api/columns'),
  })
}

export function useCreateColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title: string) =>
      apiFetch<Column>('/api/columns', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: COLUMNS_KEY }),
  })
}

export function useUpdateColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiFetch<Column>(`/api/columns/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: COLUMNS_KEY }),
  })
}

export function useDeleteColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/columns/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COLUMNS_KEY })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
  })
}

export function useReorderColumns() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiFetch<Column[]>('/api/columns/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ ordered_ids: orderedIds }),
      }),
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: COLUMNS_KEY })
      const previous = qc.getQueryData<Column[]>(COLUMNS_KEY)
      if (previous) {
        const reordered = orderedIds
          .map((id, i) => ({ ...previous.find(c => c.id === id)!, position: i }))
          .filter(Boolean)
        qc.setQueryData(COLUMNS_KEY, reordered)
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(COLUMNS_KEY, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: COLUMNS_KEY }),
  })
}
