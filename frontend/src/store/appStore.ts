import { create } from 'zustand'

export type Screen = 'dashboard' | 'calendar' | 'kanban' | 'focus' | 'finance'

interface AppState {
  activeScreen: Screen
  setActive: (screen: Screen) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeScreen: 'dashboard',
  setActive: (screen) => set({ activeScreen: screen }),
}))
