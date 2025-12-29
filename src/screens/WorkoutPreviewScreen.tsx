import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { usePlan, useExercisesByIds, useActiveSessionId, useAllExercises } from '../db/queries'
import { deferPlanExercise, reorderPlanExercise, startSessionFromPlan, updatePlan } from '../db/actions'
import { useLastPerformance } from '../db/sessionQueries'
import { suggestStart } from '../domain/progression'
import { normalizeName } from '../domain/normalize'
import { errorMessage } from '../domain/errorMessage'

function ExercisePreviewRow(props: { exerciseId: string; index: number }) {
  const exercise = useExercisesByIds([props.exerciseId])?.[0]
  const last = useLastPerformance(props.exerciseId)
  const start = useMemo(() => (exercise ? suggestStart(exercise, last) : undefined), [exercise, last])

  if (!exercise) return null

  return (
    <div className="row">
      <div>
        <div className="row__title">
          {props.index + 1}. {exercise.name}
        </div>
        <div className="row__meta">
          {exercise.equipment.join(', ') || '—'} · {exercise.primaryMuscles.join(', ') || '—'}
        </div>
        <div className="row__meta">
          {last ? (
            <>
              Last: {last.lastWeight} × {last.lastReps}
            </>
          ) : (
            <>Last: —</>
          )}
          {start?.note ? <> · {start.note}</> : null}
        </div>
      </div>
    </div>
  )
}

export function WorkoutPreviewScreen() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const plan = usePlan(planId)
  const exercises = useExercisesByIds(plan?.plannedExerciseIds)
  const activeSessionId = useActiveSessionId()
  const allExercises = useAllExercises()

  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canStart = (plan?.plannedExerciseIds.length ?? 0) >= 4 && activeSessionId == null

  const searchResults = useMemo(() => {
    const query = normalizeName(q)
    const items = allExercises ?? []
    if (!query) return []
    return items
      .filter((e) => e.normalizedName.includes(query) || e.normalizedAliases.some((a) => a.includes(query)))
      .slice(0, 30)
  }, [allExercises, q])

  async function onStart() {
    if (!planId) return
    setError(null)
    setBusy(true)
    try {
      const sessionId = await startSessionFromPlan(planId)
      navigate(`/session/${sessionId}`, { replace: true })
    } catch (e: unknown) {
      setError(errorMessage(e, 'Could not start.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(exerciseId: string) {
    if (!plan) return
    const next = plan.plannedExerciseIds.filter((x) => x !== exerciseId)
    await updatePlan(plan.id, { plannedExerciseIds: next })
  }

  async function add(exerciseId: string) {
    if (!plan) return
    if (plan.plannedExerciseIds.includes(exerciseId)) return
    const next = [...plan.plannedExerciseIds, exerciseId]
    await updatePlan(plan.id, { plannedExerciseIds: next })
  }

  return (
    <div className="stack">
      <div className="hero">
        <div className="hero__kicker">Preview</div>
        <div className="hero__title">{plan?.planName ?? 'Workout'}</div>
      </div>

      {activeSessionId && (
        <div className="card">
          <div className="card__title">Workout in progress</div>
          <div className="card__body">Continuity assumed. Finish or resume before starting another.</div>
          <div className="card__actions">
            <Link className="btn btn--primary" to={`/session/${activeSessionId}`}>
              Start Workout
            </Link>
            <Link className="btn" to={`/session/${activeSessionId}/summary`}>
              Summary
            </Link>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card__title">Exercises ({plan?.plannedExerciseIds.length ?? 0})</div>
        <div className="card__body">
          <div className="stack">
            {(plan?.plannedExerciseIds ?? []).map((id, idx) => (
              <div key={id} className="card" style={{ padding: 10 }}>
                <ExercisePreviewRow exerciseId={id} index={idx} />
                <div className="card__actions">
                  <button className="btn" disabled={idx === 0} onClick={() => planId && reorderPlanExercise(planId, idx, idx - 1)}>
                    Move up
                  </button>
                  <button
                    className="btn"
                    disabled={plan?.plannedExerciseIds == null || idx === plan.plannedExerciseIds.length - 1}
                    onClick={() => planId && reorderPlanExercise(planId, idx, idx + 1)}
                  >
                    Move down
                  </button>
                  <button className="btn" onClick={() => planId && deferPlanExercise(planId, idx)}>
                    Defer
                  </button>
                  <button className="btn btn--danger" onClick={() => remove(id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {(plan?.plannedExerciseIds.length ?? 0) === 0 && <div className="hint">No exercises.</div>}
          </div>
        </div>
        <div className="card__actions">
          <button className="btn btn--primary" disabled={!canStart || busy} onClick={onStart}>
            Start Workout
          </button>
          <Link className="btn" to="/start">
            Change start mode
          </Link>
        </div>
        {(plan?.plannedExerciseIds.length ?? 0) < 4 && <div className="hint">Minimum 4 exercises.</div>}
        {error && (
          <div className="hint" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card__title">Minor edits</div>
        <div className="card__body">
          <div className="field">
            <div className="label">Add existing exercise</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search…" />
          </div>
          <div className="stack" style={{ marginTop: 10 }}>
            {searchResults.map((e) => {
              const isInPlan = plan?.plannedExerciseIds.includes(e.id) ?? false
              return (
                <div key={e.id} className="row">
                  <div>
                    <div className="row__title">{e.name}</div>
                    <div className="row__meta">{e.equipment.join(', ') || '—'}</div>
                  </div>
                  <button className="btn" disabled={isInPlan} onClick={() => add(e.id)}>
                    {isInPlan ? 'Added' : 'Add'}
                  </button>
                </div>
              )
            })}
            {q.trim() && searchResults.length === 0 && <div className="hint">No matches.</div>}
          </div>
        </div>
      </div>

      {exercises && (
        <div className="card">
          <div className="card__title">Rules</div>
          <div className="card__body">
            Reorder/Defer only between exercises (never mid-set). Skips are logged but do not change templates.
          </div>
        </div>
      )}
    </div>
  )
}

