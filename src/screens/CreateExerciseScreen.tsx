import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCustomExercise } from '../db/actions'

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function CreateExerciseScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [aliases, setAliases] = useState('')
  const [equipment, setEquipment] = useState('')
  const [primary, setPrimary] = useState('')
  const [secondary, setSecondary] = useState('')
  const [type, setType] = useState<'compound' | 'isolation' | 'cardio' | 'other'>('other')
  const [instructions, setInstructions] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSave() {
    setError(null)
    if (!name.trim()) return setError('Name is required.')
    const id = await createCustomExercise({
      name,
      aliases: splitList(aliases),
      equipment: splitList(equipment),
      primaryMuscles: splitList(primary),
      secondaryMuscles: splitList(secondary),
      type,
      instructions: instructions.trim() || undefined,
    })
    navigate('/start', { replace: true, state: { highlightExerciseId: id } })
  }

  return (
    <div className="stack">
      <div className="hero">
        <div className="hero__kicker">New exercise</div>
        <div className="hero__title">Keep it simple.</div>
      </div>

      <div className="card">
        <div className="card__body">
          <div className="stack">
            <div className="field">
              <div className="label">Name</div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Incline DB press" />
            </div>

            <div className="field">
              <div className="label">Aliases (optional, comma-separated)</div>
              <input className="input" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="e.g. Incline press" />
            </div>

            <div className="grid2">
              <div className="field">
                <div className="label">Type</div>
                <select
                  className="select"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'compound' | 'isolation' | 'cardio' | 'other')}
                >
                  <option value="compound">Compound</option>
                  <option value="isolation">Isolation</option>
                  <option value="cardio">Cardio</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field">
                <div className="label">Equipment (comma-separated)</div>
                <input className="input" value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="barbell, bench" />
              </div>
            </div>

            <div className="grid2">
              <div className="field">
                <div className="label">Primary muscles (comma-separated)</div>
                <input className="input" value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="chest" />
              </div>
              <div className="field">
                <div className="label">Secondary muscles (comma-separated)</div>
                <input className="input" value={secondary} onChange={(e) => setSecondary(e.target.value)} placeholder="triceps, shoulders" />
              </div>
            </div>

            <div className="field">
              <div className="label">Instructions (optional)</div>
              <textarea className="textarea" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="A few cues you actually use." />
            </div>

            {error && <div className="hint" style={{ color: 'var(--danger)' }}>{error}</div>}

            <div className="card__actions">
              <button className="btn btn--primary" onClick={onSave}>
                Save exercise
              </button>
              <button className="btn" onClick={() => navigate(-1)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

