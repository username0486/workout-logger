import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db, type Session, type SessionExercise, type SessionSet } from './db'
import type { LastPerformance } from '../domain/progression'

export function useSession(sessionId: string | undefined): Session | undefined {
  return useLiveQuery(async () => {
    if (!sessionId) return undefined
    return db.sessions.get(sessionId)
  }, [sessionId])
}

export function useSessionExercises(sessionId: string | undefined): SessionExercise[] | undefined {
  return useLiveQuery(async () => {
    if (!sessionId) return undefined
    return db.sessionExercises.where('sessionId').equals(sessionId).sortBy('orderIndex')
  }, [sessionId])
}

export function useSessionSets(sessionId: string | undefined): SessionSet[] | undefined {
  return useLiveQuery(async () => {
    if (!sessionId) return undefined
    const all = await db.sessionSets.where('sessionId').equals(sessionId).toArray()
    return all.sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
  }, [sessionId])
}

export function useSetsForExerciseInSession(sessionId: string | undefined, exerciseId: string | undefined): SessionSet[] | undefined {
  return useLiveQuery(async () => {
    if (!sessionId || !exerciseId) return undefined
    const all = await db.sessionSets.where('[sessionId+exerciseId]').equals([sessionId, exerciseId]).toArray()
    return all.sort((a, b) => a.setIndex - b.setIndex)
  }, [sessionId, exerciseId])
}

export function useLastPerformance(exerciseId: string | undefined): LastPerformance | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return undefined
    const range = await db.sessionSets
      .where('[exerciseId+completedAt]')
      .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
      .filter((s) => s.completedAt != null)
      .toArray()
    const last = range.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0]
    if (!last || last.completedAt == null) return undefined
    return {
      lastCompletedAt: last.completedAt,
      lastWeight: last.weight,
      lastReps: last.repsCompleted,
      lastRestSeconds: last.restSecondsBefore,
    }
  }, [exerciseId])
}

