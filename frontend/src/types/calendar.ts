export type SyncStatus = 'local' | 'synced' | 'pending' | 'error'

export interface Block {
  id: string
  title: string
  start_datetime: string
  end_datetime: string
  category_id: string | null
  card_id: string | null
  recurrence: string | null
  // Campos abaixo são read-only (backend define defaults). Tornados opcionais
  // para que payloads de criação/edição não precisem informá-los.
  google_event_id?: string | null
  is_google_event?: boolean
  sync_status?: SyncStatus
}
