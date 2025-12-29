import { useMemo, useState } from 'react'
import type { Exercise } from '../db/db'
import { useAllExercises, useExercisesByIds } from '../db/queries'
import { normalizeName } from '../domain/normalize'

export function ExercisePicker(props: {
  selectedIds: string[]
  onAdd: (exerciseId: string) => void
  onRemove: (exerciseId: string) => void
  hint?: string
}) {
  const all = useAllExercises()
  const selected = useExercisesByIds(props.selectedIds)
  const [q, setQ] = useState('')

  const results = useMemo(() => {
    const query = normalizeName(q)
    const items = all ?? []
    if (!query) return items.slice(0, 30)
    return items
      .filter((e) => {
        if (e.normalizedName.includes(query)) return true
        return e.normalizedAliases.some((a) => a.includes(query))
      })
      .slice(0, 50)
  }, [all, q])

  return (
    <div className="stack">
      <div className="field">
        <div className="label">Search exercises</div>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="bench, squat, curl…" />
        {props.hint && <div className="hint">{props.hint}</div>}
      </div>

      <div className="card">
        <div className="card__title">Selected ({props.selectedIds.length})</div>
        <div className="card__body">
          <div className="stack">
            {(selected ?? []).map((e) => (
              <div key={e.id} className="row">
                <div>
                  <div className="row__title">{e.name}</div>
                  <div className="row__meta">
                    {e.equipment.join(', ') || '—'} · {e.primaryMuscles.join(', ') || '—'}
                  </div>
                </div>
                <button className="btn btn--danger" onClick={() => props.onRemove(e.id)}>
                  Remove
                </button>
              </div>
            ))}
            {props.selectedIds.length === 0 && <div className="hint">Nothing selected yet.</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__title">Results</div>
        <div className="card__body">
          <div className="stack">
            {results.map((e: Exercise) => {
              const isSelected = props.selectedIds.includes(e.id)
              return (
                <div key={e.id} className="row">
                  <div>
                    <div className="row__title">{e.name}</div>
                    <div className="row__meta">
                      {e.equipment.join(', ') || '—'} · {e.primaryMuscles.join(', ') || '—'}
                    </div>
                  </div>
                  <button className="btn" disabled={isSelected} onClick={() => props.onAdd(e.id)}>
                    {isSelected ? 'Added' : 'Add'}
                  </button>
                </div>
              )
            })}
            {results.length === 0 && <div className="hint">No matches.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

