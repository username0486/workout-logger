import { Link, useNavigate } from 'react-router-dom'
import { useTemplates } from '../db/queries'
import { createPlanFromTemplate } from '../db/actions'
import { useState } from 'react'

export function TemplatesScreen() {
  const templates = useTemplates()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function preview(templateId: string) {
    setBusyId(templateId)
    try {
      const planId = await createPlanFromTemplate(templateId)
      navigate(`/preview/${planId}`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="stack">
      <div className="hero">
        <div className="hero__kicker">Workouts</div>
        <div className="hero__title">Containers you reuse.</div>
      </div>

      <div className="card">
        <div className="card__body">
          <div className="stack">
            {(templates ?? []).map((t) => (
              <div key={t.id} className="row">
                <div>
                  <div className="row__title">{t.name}</div>
                  <div className="row__meta">{t.exerciseIds.length} exercises</div>
                </div>
                <button className="btn" disabled={busyId === t.id} onClick={() => preview(t.id)}>
                  Preview
                </button>
              </div>
            ))}
            {(templates?.length ?? 0) === 0 && (
              <div className="hint">No templates yet. Make one with 5–6 exercises for low cognitive load.</div>
            )}
          </div>
        </div>
        <div className="card__actions">
          <Link className="btn btn--primary" to="/templates/new">
            Create workout template
          </Link>
        </div>
      </div>
    </div>
  )
}

