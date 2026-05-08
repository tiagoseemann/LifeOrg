import { create } from 'zustand'

interface FocusState {
  pendingCardId: string | null
  setPendingCardId: (id: string | null) => void
}

export const useFocusStore = create<FocusState>((set) => ({
  pendingCardId: null,
  setPendingCardId: (id) => set({ pendingCardId: id }),
}))
