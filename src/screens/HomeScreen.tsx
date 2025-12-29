import { Link, useNavigate } from 'react-router-dom'
import { useActiveSessionId, useExerciseCount, useTemplateCount } from '../db/queries'

export function HomeScreen() {
  const navigate = useNavigate()
  const activeSessionId = useActiveSessionId()
  const exerciseCount = useExerciseCount()
  const templateCount = useTemplateCount()

  const isNew = (exerciseCount ?? 0) === 0 && (templateCount ?? 0) === 0

  return (
    <div className="stack">
      <div className="hero">
        <div className="hero__kicker">Low-noise workout logging</div>
        <div className="hero__title">Start where you left off.</div>
      </div>

      {activeSessionId && (
        <div className="card">
          <div className="card__title">In progress</div>
          <div className="card__body">Continuity assumed. Resume your workout.</div>
          <div className="card__actions">
            <button className="btn btn--primary" onClick={() => navigate(`/session/${activeSessionId}`)}>
              Start Workout
            </button>
          </div>
        </div>
      )}

      {!activeSessionId && (
        <div className="card">
          <div className="card__title">{isNew ? 'New here' : 'Ready'}</div>
          <div className="card__body">
            {isNew ? (
              <>
                Create an exercise (or two), then start your first workout.
                <div className="hint">No goals. No coaching. Just memory.</div>
              </>
            ) : (
              <>
                Start a predefined workout, assemble by focus, or reuse your recent exercises.
                <div className="hint">The app assumes continuity unless you correct it.</div>
              </>
            )}
          </div>
          <div className="card__actions">
            {isNew ? (
              <>
                <Link className="btn btn--primary" to="/exercises/new">
                  Create first exercise
                </Link>
                <Link className="btn" to="/start">
                  Start Workout
                </Link>
              </>
            ) : (
              <Link className="btn btn--primary" to="/start">
                Start Workout
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card__title">Workouts are containers</div>
        <div className="card__body">
          Templates store exercise lists (minimum 4; default 5–6). Skips are logged but never change the template.
        </div>
        <div className="card__actions">
          <Link className="btn" to="/templates">
            Workouts
          </Link>
        </div>
      </div>
    </div>
  )
}

