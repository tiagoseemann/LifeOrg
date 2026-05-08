import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { Block } from '../types/calendar'

function blocksKey(weekStart?: string) {
  return ['blocks', weekStart ?? 'all']
}

export function useBlocks(weekStart?: string) {
  const url = weekStart ? `/api/blocks?week_start=${weekStart}` : '/api/blocks'
  return useQuery({
    queryKey: blocksKey(weekStart),
    queryFn: () => apiFetch<Block[]>(url),
  })
}

export function useCreateBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Block, 'id'>) =>
      apiFetch<Block>('/api/blocks', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocks'] }),
  })
}

export function useUpdateBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Block> & { id: string }) =>
      apiFetch<Block>(`/api/blocks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocks'] }),
  })
}

export function useDeleteBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/blocks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocks'] })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
  })
}
