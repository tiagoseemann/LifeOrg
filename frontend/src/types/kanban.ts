export interface Category {
  id: string
  name: string
  slug: string
  is_default: boolean
}

export interface Column {
  id: string
  title: string
  position: number
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export type Priority = 'high' | 'medium' | 'low'

export interface Card {
  id: string
  title: string
  column_id: string
  description: string | null
  category_id: string | null
  priority: Priority | null
  due_date: string | null
  time_estimate: number | null
  total_focus_time: number
  checklist: ChecklistItem[] | null
  position: number
}
