import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useExercisesByIds } from '../db/queries'
import { useSession, useSessionExercises, useSessionSets } from '../db/sessionQueries'
import { endSession } from '../db/actions'
import { formatSeconds } from '../domain/rest'
import { suggestNextTime } from '../domain/progression'

function fmtDate(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleString()
}

export function SessionSummaryScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const session = useSession(sessionId)
  const sessionExercises = useSessionExercises(sessionId)
  const sessionSets = useSessionSets(sessionId)
  const exerciseIds = useMemo(() => (sessionExercises ?? []).map((x) => x.exerciseId), [sessionExercises])
  const exercises = useExercisesByIds(exerciseIds)
  const exerciseById = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises])
  const [busy, setBusy] = useState(false)

  const setsByExercise = useMemo(() => {
    const map = new Map<string, typeof sessionSets>()
    for (const s of sessionSets ?? []) {
      const arr = map.get(s.exerciseId) ?? []
      arr.push(s)
      map.set(s.exerciseId, arr)
    }
    return map
  }, [sessionSets])

  async function finalizeIfNeeded() {
    if (!sessionId) return
    if (session?.endedAt != null) return
    setBusy(true)
    try {
      await endSession(sessionId)
    } finally {
      setBusy(false)
    }
  }

  if (!sessionId) return null

  return (
    <div className="stack">
      <div className="hero">
        <div className="hero__kicker">Summary</div>
        <div className="hero__title">{session?.planName ?? 'Workout'}</div>
      </div>

      <div className="card">
        <div className="card__title">Session</div>
        <div className="card__body">
          <div className="stack">
            <div className="row">
              <div>
                <div className="row__title">Started</div>
                <div className="row__meta">{session?.startedAt ? fmtDate(session.startedAt) : '—'}</div>
              </div>
              <div className="pill">{session?.endedAt ? 'Ended' : 'In progress'}</div>
            </div>
            {session?.endedAt && (
              <div className="row">
                <div>
                  <div className="row__title">Ended</div>
                  <div className="row__meta">{fmtDate(session.endedAt)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="card__actions">
          {session?.endedAt == null && (
            <button className="btn btn--primary" disabled={busy} onClick={finalizeIfNeeded}>
              Finish workout
            </button>
          )}
          <Link className="btn" to="/">
            Home
          </Link>
          {session?.endedAt == null && (
            <Link className="btn" to={`/session/${sessionId}`}>
              Resume
            </Link>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card__title">Completed</div>
        <div className="card__body">
          <div className="stack">
            {(sessionExercises ?? []).map((r, idx) => {
              const ex = exerciseById.get(r.exerciseId)
              if (!ex) return null
              const sets = setsByExercise.get(r.exerciseId) ?? []
              const suggestion = suggestNextTime(ex, sets)
              return (
                <div key={r.id} className="card" style={{ padding: 10 }}>
                  <div className="row">
                    <div>
                      <div className="row__title">
                        {idx + 1}. {ex.name}
                      </div>
                      <div className="row__meta">
                        Status: {r.status}
                        {r.deferredCount > 0 ? ` · Deferred ×${r.deferredCount}` : ''}
                        {sets.length > 0 ? ` · Sets ${sets.length}` : ''}
                      </div>
                    </div>
                    {r.status === 'skipped' ? <div className="pill">Skipped</div> : <div className="pill">Logged</div>}
                  </div>

                  {sets.length > 0 && (
                    <div className="stack" style={{ marginTop: 10 }}>
                      {sets.map((s) => (
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
                    </div>
                  )}

                  {suggestion && (
                    <div className="row" style={{ marginTop: 10 }}>
                      <div>
                        <div className="row__title">Next time</div>
                        <div className="row__meta">{suggestion.note}</div>
                      </div>
                      <div className="pill">{suggestion.suggestedWeight}</div>
                    </div>
                  )}
                </div>
              )
            })}
            {(sessionExercises?.length ?? 0) === 0 && <div className="hint">No exercises.</div>}
          </div>
        </div>
        <div className="card__actions">
          <button className="btn" onClick={() => navigate('/')}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

