import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createWorkoutTemplate } from '../db/actions'
import { useAllExercises, useExercisesByIds } from '../db/queries'
import { normalizeName } from '../domain/normalize'
import { errorMessage } from '../domain/errorMessage'

export function CreateTemplateScreen() {
  const navigate = useNavigate()
  const all = useAllExercises()
  const [name, setName] = useState('Workout')
  const [q, setQ] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selected = useExercisesByIds(selectedIds)
  const [error, setError] = useState<string | null>(null)

  const results = useMemo(() => {
    const query = normalizeName(q)
    const items = all ?? []
    if (!query) return items.slice(0, 30)
    return items
      .filter((e) => e.normalizedName.includes(query) || e.normalizedAliases.some((a) => a.includes(query)))
      .slice(0, 50)
  }, [all, q])

  function move(index: number, delta: number) {
    setSelectedIds((prev) => {
      const next = prev.slice()
      const to = index + delta
      if (to < 0 || to >= next.length) return prev
      const [m] = next.splice(index, 1)
      next.splice(to, 0, m)
      return next
    })
  }

  async function onCreate() {
    setError(null)
    try {
      const id = await createWorkoutTemplate(name, selectedIds)
      navigate('/templates', { replace: true, state: { highlightTemplateId: id } })
    } catch (e: unknown) {
      setError(errorMessage(e, 'Could not create template.'))
    }
  }

  const canCreate = selectedIds.length >= 4

  return (
    <div className="stack">
      <div className="hero">
        <div className="hero__kicker">New workout template</div>
        <div className="hero__title">A container, not a prescription.</div>
      </div>

      <div className="card">
        <div className="card__body">
          <div className="stack">
            <div className="field">
              <div className="label">Name</div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Upper A" />
              <div className="hint">Minimum 4 exercises. Default 5–6 feels easiest.</div>
            </div>

            <div className="card">
              <div className="card__title">Order ({selectedIds.length})</div>
              <div className="card__body">
                <div className="stack">
                  {(selected ?? []).map((e, idx) => (
                    <div key={e.id} className="row">
                      <div>
                        <div className="row__title">
                          {idx + 1}. {e.name}
                        </div>
                        <div className="row__meta">{e.equipment.join(', ') || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button className="btn" onClick={() => move(idx, -1)} disabled={idx === 0}>
                          ↑
                        </button>
                        <button className="btn" onClick={() => move(idx, +1)} disabled={idx === selectedIds.length - 1}>
                          ↓
                        </button>
                        <button className="btn btn--danger" onClick={() => setSelectedIds((prev) => prev.filter((x) => x !== e.id))}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedIds.length === 0 && <div className="hint">Add exercises below.</div>}
                </div>
              </div>
            </div>

            <div className="card__actions">
              <button className="btn btn--primary" disabled={!canCreate} onClick={onCreate}>
                Save template
              </button>
              <button className="btn" onClick={() => navigate(-1)}>
                Cancel
              </button>
            </div>
            {!canCreate && <div className="hint">Add at least 4 exercises.</div>}
            {error && (
              <div className="hint" style={{ color: 'var(--danger)' }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__title">Add exercises</div>
        <div className="card__body">
          <div className="stack">
            <div className="field">
              <div className="label">Search</div>
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="bench, squat, row…" />
            </div>
            <div className="stack">
              {results.map((e) => {
                const isSelected = selectedIds.includes(e.id)
                return (
                  <div key={e.id} className="row">
                    <div>
                      <div className="row__title">{e.name}</div>
                      <div className="row__meta">
                        {e.equipment.join(', ') || '—'} · {e.primaryMuscles.join(', ') || '—'}
                      </div>
                    </div>
                    <button
                      className="btn"
                      disabled={isSelected}
                      onClick={() => setSelectedIds((prev) => (prev.includes(e.id) ? prev : [...prev, e.id]))}
                    >
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
    </div>
  )
}

