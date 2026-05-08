export type FocusMode = 'fixed' | 'free'

export interface Session {
  id: string
  card_id: string | null
  card_title_snapshot: string
  card_cat_snapshot: string | null
  mode: FocusMode
  duration_seconds: number | null
  elapsed_seconds: number | null
  last_heartbeat_at: string | null
  started_at: string
  ended_at: string | null
}
