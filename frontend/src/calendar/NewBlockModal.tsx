import { useEffect, useRef, useState } from 'react'
import { Icon } from '../shell/Icon'
import { localDateStr } from '../lib/format'
import type { Category } from '../types/kanban'
import type { Block } from '../types/calendar'
import styles from './NewBlockModal.module.css'

interface NewBlockModalProps {
  categories: Category[]
  initialDate?: string
  editBlock?: Block | null
  onSave: (data: Omit<Block, 'id'>) => void
  onDelete?: () => void
  onClose: () => void
}

export function NewBlockModal({ categories, initialDate, editBlock, onSave, onDelete, onClose }: NewBlockModalProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const today = localDateStr(new Date())

  const [title,      setTitle]      = useState(editBlock?.title ?? '')
  const [date,       setDate]       = useState(editBlock ? localDateStr(new Date(editBlock.start_datetime)) : (initialDate ?? today))
  const [startTime,  setStartTime]  = useState(editBlock ? editBlock.start_datetime.slice(11, 16) : '09:00')
  const [endTime,    setEndTime]    = useState(editBlock ? editBlock.end_datetime.slice(11, 16)   : '10:00')
  const [categoryId, setCategoryId] = useState<string | null>(editBlock?.category_id ?? null)
  const [recurrence, setRecurrence] = useState(editBlock?.recurrence ?? 'none')
  const [error,      setError]      = useState('')

  useEffect(() => {
    titleRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSave() {
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    const start = new Date(`${date}T${startTime}:00`)
    const end   = new Date(`${date}T${endTime}:00`)
    if (end <= start) { setError('O horário de fim deve ser após o início.'); return }
    setError('')
    onSave({
      title: title.trim(),
      start_datetime: start.toISOString(),
      end_datetime:   end.toISOString(),
      category_id:    categoryId,
      card_id:        editBlock?.card_id ?? null,
      recurrence:     recurrence === 'none' ? null : recurrence,
    })
  }

  const isEdit = !!editBlock

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.head}>
          <h2 className={styles.title}>{isEdit ? 'Editar bloco' : 'Novo bloco'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <Icon id="x" size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="block-title">Título</label>
            <input
              id="block-title"
              ref={titleRef}
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Deep work, Aula de Cálculo, Academia…"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Categoria</label>
            <div className={styles.catGrid}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={[
                    styles.catBtn,
                    (styles as Record<string, string>)[cat.slug] ?? '',
                    categoryId === cat.id ? styles.selected : '',
                  ].join(' ')}
                  onClick={() => setCategoryId(categoryId === cat.id ? null : cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="block-date">Data</label>
            <input id="block-date" type="date" className={styles.input} value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className={styles.timeRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="block-start">Início</label>
              <input id="block-start" type="time" className={styles.input} value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="block-end">Fim</label>
              <input id="block-end" type="time" className={styles.input} value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="block-rec">Recorrência</label>
            <select id="block-rec" className={styles.select} value={recurrence} onChange={e => setRecurrence(e.target.value)}>
              <option value="none">Não repetir</option>
              <option value="daily">Todos os dias</option>
              <option value="weekdays">Dias úteis</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
            </select>
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.foot}>
          {isEdit && onDelete && (
            <button className={styles.deleteBtn} onClick={onDelete}>Excluir</button>
          )}
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={!title.trim()}>Salvar</button>
        </div>
      </div>
    </div>
  )
}
