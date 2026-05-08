export interface Block {
  id: string
  title: string
  start_datetime: string
  end_datetime: string
  category_id: string | null
  card_id: string | null
  recurrence: string | null
}
