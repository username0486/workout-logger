import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Exercise } from '../db/db'
import { useExercisesByIds } from '../db/queries'
import { useLastPerformance, useSession, useSessionExercises, useSetsForExerciseInSession } from '../db/sessionQueries'
import {
  deferSessionExercise,
  endSession,
  logSet,
  markSessionExerciseCompleted,
  reorderRemainingSessionExercises,
  setIntentionalMiss,
  skipSessionExercise,
} from '../db/actions'
import { formatSeconds, suggestRestSeconds } from '../domain/rest'
import { suggestStart } from '../domain/progression'
import { errorMessage } from '../domain/errorMessage'

function ExerciseLoggingCard(props: {
  sessionId: string
  exerciseId: string
  exercise: Exercise
  onComplete: () => Promise<void>
  onSkip: () => Promise<void>
}) {
  const currentSets = useSetsForExerciseInSession(props.sessionId, props.exerciseId) ?? []
  const lastPerf = useLastPerformance(props.exerciseId)
  const startSuggestion = useMemo(() => suggestStart(props.exercise, lastPerf), [props.exercise, lastPerf])

  const [weightText, setWeightText] = useState('')
  const [repsText, setRepsText] = useState('')
  const [missedText, setMissedText] = useState('0')
  const [error, setError] = useState<string | null>(null)

  const [pendingIntentSetId, setPendingIntentSetId] = useState<string | null>(null)

  const [restRunning, setRestRunning] = useState(false)
  const [restStartMs, setRestStartMs] = useState<number | null>(null)
  const [restSuggested, setRestSuggested] = useState<number>(120)
  const [restElapsed, setRestElapsed] = useState<number>(0)

  useEffect(() => {
    if (!restRunning || restStartMs == null) return
    const id = window.setInterval(() => {
      setRestElapsed(Math.floor((Date.now() - restStartMs) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [restRunning, restStartMs])

  async function onLogSet() {
    setError(null)
    if (pendingIntentSetId) return setError('Answer the missed-reps intent question first.')

    const suggestedWeight = startSuggestion.suggestedWeight ?? 0
    const suggestedReps = startSuggestion.suggestedRepsTarget ?? 8

    const weight = weightText.trim() ? Number(weightText) : suggestedWeight
    const repsCompleted = repsText.trim() ? Number(repsText) : suggestedReps
    const missedReps = missedText.trim() ? Number(missedText) : 0

    const restSecondsBefore = restRunning ? restElapsed : undefined

    try {
      const setId = await logSet({
        sessionId: props.sessionId,
        exerciseId: props.exerciseId,
        repsCompleted,
        weight,
        missedReps,
        restSecondsBefore,
      })

      if (missedReps > 0) setPendingIntentSetId(setId)

      setRestSuggested(suggestRestSeconds(props.exercise, missedReps > 0))
      setRestRunning(true)
      setRestStartMs(Date.now())
      setRestElapsed(0)
      setMissedText('0')
    } catch (e: unknown) {
      setError(errorMessage(e, 'Could not log set.'))
    }
  }

  async function answerIntent(intentional: boolean) {
    if (!pendingIntentSetId) return
    await setIntentionalMiss(pendingIntentSetId, intentional)
    setPendingIntentSetId(null)
  }

  async function onSkipSmart() {
    if (currentSets.length > 0) return props.onComplete()
    return props.onSkip()
  }

  return (
    <div className="card">
      <div className="card__title">Set logging</div>
      <div className="card__body">
        <div className="stack">
          <div className="row">
            <div>
              <div className="row__title">Last</div>
              <div className="row__meta">{lastPerf ? `${lastPerf.lastWeight} × ${lastPerf.lastReps}` : '—'}</div>
            </div>
            <div className="pill">
              Suggest: {startSuggestion.suggestedWeight} × {startSuggestion.suggestedRepsTarget}
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <div className="label">Weight</div>
              <input
                className="input"
                inputMode="decimal"
                value={weightText}
                placeholder={String(startSuggestion.suggestedWeight)}
                onChange={(e) => setWeightText(e.target.value)}
              />
            </div>
            <div className="field">
              <div className="label">Reps completed</div>
              <input
                className="input"
                inputMode="numeric"
                value={repsText}
                placeholder={String(startSuggestion.suggestedRepsTarget)}
                onChange={(e) => setRepsText(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <div className="label">Missed reps (optional)</div>
            <input className="input" inputMode="numeric" value={missedText} onChange={(e) => setMissedText(e.target.value)} />
          </div>

          {pendingIntentSetId && (
            <div className="card" style={{ padding: 10 }}>
              <div className="card__title">Missed reps</div>
              <div className="card__body">Was this intentional?</div>
              <div className="card__actions">
                <button className="btn" onClick={() => answerIntent(true)}>
                  Yes
                </button>
                <button className="btn btn--primary" onClick={() => answerIntent(false)}>
                  No
                </button>
              </div>
              <div className="hint">Yes → no progression change. No → next-time suggestion will adjust.</div>
            </div>
          )}

          <div className="card__actions">
            <button className="btn btn--primary" onClick={onLogSet} disabled={pendingIntentSetId != null}>
              Log set
            </button>
            <button className="btn" onClick={props.onComplete}>
              Complete exercise
            </button>
            <button className="btn" onClick={onSkipSmart}>
              Skip
            </button>
          </div>

          {error && (
            <div className="hint" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div className="card" style={{ padding: 10 }}>
            <div className="card__title">Rest</div>
            <div className="card__body">
              <div className="row">
                <div>
                  <div className="row__title">{restRunning ? 'Resting…' : '—'}</div>
                  <div className="row__meta">
                    {restRunning ? `Elapsed ${formatSeconds(restElapsed)} · Suggested ${formatSeconds(restSuggested)}` : 'Rest starts after you log a set.'}
                  </div>
                </div>
                <div className="pill">{restRunning ? formatSeconds(restElapsed) : '—'}</div>
              </div>
            </div>
            <div className="card__actions">
              <button
                className="btn"
                disabled={!restRunning}
                onClick={() => {
                  setRestStartMs(Date.now())
                  setRestElapsed(0)
                }}
              >
                Skip rest
              </button>
              <button className="btn" disabled={!restRunning} onClick={() => setRestRunning(false)}>
                Stop timer
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card__title">This exercise</div>
            <div className="card__body">
              <div className="stack">
                {currentSets.map((s) => (
                  <div key={s.id} className="row">
                    <div>
                      <div className="row__title">
                        Set {s.setIndex + 1}: {s.weight} × {s.repsCompleted}
                        {s.missedReps > 0 ? ` (+${s.missedReps} missed)` : ''}
                      </div>
                      <div className="row__meta">
                        Rest: {s.restSecondsBefore != null ? formatSeconds(s.restSecondsBefore) : '—'}
                        {s.missedReps > 0 ? ` · Intentional: ${s.intentionalMiss === true ? 'Yes' : s.intentionalMiss === false ? 'No' : '—'}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
                {currentSets.length === 0 && <div className="hint">No sets logged yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SessionScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const session = useSession(sessionId)
  const sessionExercises = useSessionExercises(sessionId)
  const exerciseIds = useMemo(() => (sessionExercises ?? []).map((x) => x.exerciseId), [sessionExercises])
  const exercises = useExercisesByIds(exerciseIds)
  const exerciseById = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises])

  const currentRow = useMemo(() => (sessionExercises ?? []).find((x) => x.status === 'pending'), [sessionExercises])
  const currentExerciseId = currentRow?.exerciseId
  const currentExercise = currentExerciseId ? exerciseById.get(currentExerciseId) : undefined

  const remaining = useMemo(() => {
    const rows = sessionExercises ?? []
    if (!currentExerciseId) return rows
    const currentIdx = rows.findIndex((r) => r.exerciseId === currentExerciseId)
    return rows.slice(currentIdx + 1)
  }, [sessionExercises, currentExerciseId])

  async function onFinishWorkout() {
    if (!sessionId) return
    await endSession(sessionId)
    navigate(`/session/${sessionId}/summary`, { replace: true })
  }

  if (!sessionId) return null

  return (
    <div className="stack">
      <div className="hero">
        <div className="hero__kicker">{session?.planName ?? 'Workout'}</div>
        <div className="hero__title">{currentExercise ? currentExercise.name : 'All done'}</div>
      </div>

      {!currentExercise && (
        <div className="card">
          <div className="card__title">Finished</div>
          <div className="card__body">No more pending exercises.</div>
          <div className="card__actions">
            <button className="btn btn--primary" onClick={onFinishWorkout}>
              Finish workout
            </button>
            <Link className="btn" to={`/session/${sessionId}/summary`}>
              Summary
            </Link>
          </div>
        </div>
      )}

      {currentExercise && currentExerciseId && (
        <ExerciseLoggingCard
          key={currentExerciseId}
          sessionId={sessionId}
          exerciseId={currentExerciseId}
          exercise={currentExercise}
          onComplete={async () => markSessionExerciseCompleted(sessionId, currentExerciseId)}
          onSkip={async () => skipSessionExercise(sessionId, currentExerciseId)}
        />
      )}

      <div className="card">
        <div className="card__title">Up next</div>
        <div className="card__body">
          <div className="stack">
            {remaining.map((r) => {
              const ex = exerciseById.get(r.exerciseId)
              if (!ex) return null
              return (
                <div key={r.id} className="row">
                  <div>
                    <div className="row__title">{ex.name}</div>
                    <div className="row__meta">{r.deferredCount > 0 ? `Deferred ×${r.deferredCount}` : '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={() => deferSessionExercise(sessionId, r.exerciseId)} title="Defer to the end">
                      Defer
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        const rows = sessionExercises ?? []
                        const to = Math.max(0, rows.findIndex((x) => x.exerciseId === r.exerciseId) - 1)
                        void reorderRemainingSessionExercises(sessionId, r.exerciseId, to)
                      }}
                    >
                      ↑
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        const rows = sessionExercises ?? []
                        const to = Math.min(rows.length - 1, rows.findIndex((x) => x.exerciseId === r.exerciseId) + 1)
                        void reorderRemainingSessionExercises(sessionId, r.exerciseId, to)
                      }}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              )
            })}
            {remaining.length === 0 && <div className="hint">Nothing queued.</div>}
          </div>
        </div>
        <div className="card__actions">
          <button className="btn btn--danger" onClick={onFinishWorkout}>
            Finish workout
          </button>
          <button
            className="btn"
            onClick={async () => {
              await endSession(sessionId)
              navigate('/', { replace: true })
            }}
          >
            End (no summary)
          </button>
        </div>
      </div>
    </div>
  )
}

