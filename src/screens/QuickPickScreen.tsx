import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPlanQuickPick } from '../db/actions'
import { ExercisePicker } from '../ui/ExercisePicker'
import { errorMessage } from '../domain/errorMessage'

export function QuickPickScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('Quick pick')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const canCreate = useMemo(() => selectedIds.length >= 4, [selectedIds.length])

  async function onCreate() {
    setError(null)
    try {
      const planId = await createPlanQuickPick(name, selectedIds)
      navigate(`/preview/${planId}`)
    } catch (e: unknown) {
      setError(errorMessage(e, 'Could not create plan.'))
    }
  }

  return (
    <div className="stack">
      <div className="hero">
        <div className="hero__kicker">Quick pick</div>
        <div className="hero__title">Pick 5–6 for comfort.</div>
      </div>

      <div className="card">
        <div className="card__body">
          <div className="field">
            <div className="label">Workout name</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="card__actions">
          <button className="btn btn--primary" disabled={!canCreate} onClick={onCreate}>
            Preview
          </button>
          <button className="btn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
        {!canCreate && <div className="hint">Minimum 4 exercises.</div>}
        {error && (
          <div className="hint" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        )}
      </div>

      <ExercisePicker
        selectedIds={selectedIds}
        onAdd={(id) => setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
        onRemove={(id) => setSelectedIds((prev) => prev.filter((x) => x !== id))}
        hint="You can always reorder or defer between exercises."
      />
    </div>
  )
}

