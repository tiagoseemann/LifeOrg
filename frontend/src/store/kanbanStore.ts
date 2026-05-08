import { create } from 'zustand'

interface KanbanState {
  activeFilter: string | null
  selectedCardId: string | null
  searchQuery: string
  setFilter: (slug: string | null) => void
  selectCard: (id: string | null) => void
  setSearch: (q: string) => void
}

export const useKanbanStore = create<KanbanState>((set) => ({
  activeFilter: null,
  selectedCardId: null,
  searchQuery: '',
  setFilter: (slug) => set({ activeFilter: slug }),
  selectCard: (id) => set({ selectedCardId: id }),
  setSearch: (q) => set({ searchQuery: q }),
}))
