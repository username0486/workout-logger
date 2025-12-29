import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise, type Plan, type WorkoutTemplate } from './db'

export function useExerciseCount(): number | undefined {
  return useLiveQuery(() => db.exercises.count(), [], undefined)
}

export function useTemplateCount(): number | undefined {
  return useLiveQuery(() => db.workoutTemplates.count(), [], undefined)
}

export function useTemplates(): WorkoutTemplate[] | undefined {
  return useLiveQuery(() => db.workoutTemplates.orderBy('updatedAt').reverse().toArray(), [], undefined)
}

export function usePlan(planId: string | undefined): Plan | undefined {
  return useLiveQuery(async () => {
    if (!planId) return undefined
    return db.plans.get(planId)
  }, [planId])
}

export function useTemplate(templateId: string | undefined): WorkoutTemplate | undefined {
  return useLiveQuery(async () => {
    if (!templateId) return undefined
    return db.workoutTemplates.get(templateId)
  }, [templateId])
}

export function useExercisesByIds(ids: string[] | undefined): Exercise[] | undefined {
  return useLiveQuery(async () => {
    if (!ids) return undefined
    const items = await db.exercises.bulkGet(ids)
    const byId = new Map(items.filter(Boolean).map((e) => [e!.id, e as Exercise]))
    return ids.map((id) => byId.get(id)).filter(Boolean) as Exercise[]
  }, [ids?.join('|')])
}

export function useAllExercises(): Exercise[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.exercises.toArray()
    return all.sort((a, b) => a.name.localeCompare(b.name))
  }, [])
}

export function useActiveSessionId(): string | undefined {
  return useLiveQuery(async () => {
    const active = await db.sessions.where('endedAt').equals(null as unknown as number).first()
    return active?.id
  }, [], undefined)
}

