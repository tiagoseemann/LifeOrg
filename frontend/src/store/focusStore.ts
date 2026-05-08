import { create } from 'zustand'
import type { FocusMode } from '../types/focus'

export type DurKey = '15' | '25' | '45' | '60' | 'free' | 'custom'

function resolveDuration(durKey: DurKey, customMin: number): number | null {
  if (durKey === 'free') return null
  if (durKey === 'custom') return customMin > 0 ? customMin * 60 : null
  return parseInt(durKey, 10) * 60
}

interface FocusState {
  activeSessionId: string | null
  elapsed: number
  running: boolean
  paused: boolean
  mode: FocusMode
  durKey: DurKey
  customMin: number
  durationSeconds: number | null
  pendingCardId: string | null

  setActiveSession: (id: string | null) => void
  setElapsed: (n: number | ((prev: number) => number)) => void
  setRunning: (v: boolean) => void
  setPaused: (v: boolean) => void
  setMode: (m: FocusMode) => void
  setDurKey: (k: DurKey) => void
  setCustomMin: (m: number) => void
  setPendingCardId: (id: string | null) => void
  reset: () => void
}

export const useFocusStore = create<FocusState>((set) => ({
  activeSessionId: null,
  elapsed: 0,
  running: false,
  paused: false,
  mode: 'fixed',
  durKey: '25',
  customMin: 30,
  durationSeconds: 25 * 60,
  pendingCardId: null,

  setActiveSession: (id) => set({ activeSessionId: id }),
  setElapsed: (n) => set(state => ({
    elapsed: typeof n === 'function' ? n(state.elapsed) : n,
  })),
  setRunning: (v) => set({ running: v }),
  setPaused: (v) => set({ paused: v }),
  setMode: (m) => set({ mode: m }),
  setDurKey: (k) => set(state => ({
    durKey: k,
    mode: k === 'free' ? 'free' : 'fixed',
    durationSeconds: resolveDuration(k, state.customMin),
  })),
  setCustomMin: (m) => set(state => ({
    customMin: m,
    durationSeconds: state.durKey === 'custom' ? (m > 0 ? m * 60 : null) : state.durationSeconds,
  })),
  setPendingCardId: (id) => set({ pendingCardId: id }),
  reset: () => set({
    activeSessionId: null,
    elapsed: 0,
    running: false,
    paused: false,
  }),
}))
