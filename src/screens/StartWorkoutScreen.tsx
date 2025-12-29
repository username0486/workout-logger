import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { createPlanFromFocus, createPlanFromTemplate, createPlanSuggested } from '../db/actions'
import { useActiveSessionId, useTemplates } from '../db/queries'
import { errorMessage } from '../domain/errorMessage'

export function StartWorkoutScreen() {
  const navigate = useNavigate()
  const activeSessionId = useActiveSessionId()
  const templates = useTemplates()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function goToPlan(create: () => Promise<string>) {
    setError(null)
    try {
      setBusy('busy')
      const planId = await create()
      navigate(`/preview/${planId}`)
    } catch (e: unknown) {
      setError(errorMessage(e, 'Could not start.'))
    } finally {
      setBusy(null)
    }
  }

  if (activeSessionId) {
    return (
      <div className="stack">
        <div className="card">
          <div className="card__title">Workout in progress</div>
          <div className="card__body">Continuity assumed. Resume, or finish it to start a new one.</div>
          <div className="card__actions">
            <button className="btn btn--primary" onClick={() => navigate(`/session/${activeSessionId}`)}>
              Start Workout
            </button>
            <Link className="btn" to={`/session/${activeSessionId}/summary`}>
              Summary
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="hero">
        <div className="hero__kicker">Start</div>
        <div className="hero__title">Pick a container.</div>
      </div>

      <div className="card">
        <div className="card__title">Primary</div>
        <div className="card__body">
          <div className="stack">
            <button className="btn btn--primary" disabled={busy != null} onClick={() => goToPlan(() => createPlanFromFocus('upper'))}>
              Start Upper (auto-assembled)
            </button>
            <button className="btn btn--primary" disabled={busy != null} onClick={() => goToPlan(() => createPlanFromFocus('lower'))}>
              Start Lower (auto-assembled)
            </button>
            <button className="btn" disabled={busy != null} onClick={() => goToPlan(() => createPlanSuggested())}>
              Suggested (from your history)
            </button>
            <Link className="btn" to="/quick-pick">
              Quick pick (choose exercises)
            </Link>
          </div>
          {error && (
            <div className="hint" style={{ color: 'var(--danger)', marginTop: 10 }}>
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card__title">Predefined workouts</div>
        <div className="card__body">
          <div className="stack">
            {(templates ?? []).map((t) => (
              <div key={t.id} className="row">
                <div>
                  <div className="row__title">{t.name}</div>
                  <div className="row__meta">{t.exerciseIds.length} exercises</div>
                </div>
                <button className="btn" disabled={busy != null} onClick={() => goToPlan(() => createPlanFromTemplate(t.id))}>
                  Preview
                </button>
              </div>
            ))}
            {(templates?.length ?? 0) === 0 && <div className="hint">No templates yet.</div>}
          </div>
        </div>
        <div className="card__actions">
          <Link className="btn" to="/templates/new">
            Create workout template
          </Link>
        </div>
      </div>
    </div>
  )
}

