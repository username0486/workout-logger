import { nanoid } from 'nanoid'
import { db, type BodyFocus, type Exercise, type Plan, type Session, type SessionExercise, type WorkoutTemplate } from './db'
import { normalizeName } from '../domain/normalize'
import { assembleFocusPlan, assembleSuggestedPlan } from '../domain/workoutAssembler'

export type CreateExerciseInput = {
  name: string
  aliases: string[]
  equipment: string[]
  primaryMuscles: string[]
  secondaryMuscles: string[]
  category?: string
  type?: Exercise['type']
  instructions?: string
  imageUrls?: string[]
  videoUrls?: string[]
}

export async function createCustomExercise(input: CreateExerciseInput): Promise<string> {
  const now = Date.now()
  const id = `custom:${nanoid()}`
  const aliases = input.aliases.filter(Boolean)
  await db.exercises.add({
    id,
    name: input.name.trim(),
    aliases,
    normalizedName: normalizeName(input.name),
    normalizedAliases: aliases.map(normalizeName),
    category: input.category,
    type: input.type ?? 'other',
    primaryMuscles: input.primaryMuscles,
    secondaryMuscles: input.secondaryMuscles,
    equipment: input.equipment,
    instructions: input.instructions,
    imageUrls: input.imageUrls ?? [],
    videoUrls: input.videoUrls ?? [],
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export async function createWorkoutTemplate(name: string, exerciseIds: string[]): Promise<string> {
  if (exerciseIds.length < 4) throw new Error('Workout templates need at least 4 exercises.')
  const now = Date.now()
  const id = `tmpl:${nanoid()}`
  const item: WorkoutTemplate = { id, name: name.trim(), exerciseIds, createdAt: now, updatedAt: now }
  await db.workoutTemplates.add(item)
  return id
}

export async function updateWorkoutTemplate(templateId: string, patch: Partial<WorkoutTemplate>): Promise<void> {
  await db.workoutTemplates.update(templateId, { ...patch, updatedAt: Date.now() })
}

export async function createPlanFromTemplate(templateId: string): Promise<string> {
  const tmpl = await db.workoutTemplates.get(templateId)
  if (!tmpl) throw new Error('Template not found')
  const now = Date.now()
  const id = `plan:${nanoid()}`
  const plan: Plan = {
    id,
    createdAt: now,
    mode: 'template',
    planName: tmpl.name,
    templateId,
    plannedExerciseIds: tmpl.exerciseIds.slice(),
  }
  await db.plans.add(plan)
  return id
}

export async function createPlanFromFocus(focus: BodyFocus): Promise<string> {
  const now = Date.now()
  const id = `plan:${nanoid()}`
  const plannedExerciseIds = await assembleFocusPlan(db, focus)
  if (plannedExerciseIds.length < 4) {
    throw new Error('Not enough exercises available for that focus yet.')
  }
  const plan: Plan = { id, createdAt: now, mode: 'focus', focus, planName: focus === 'upper' ? 'Upper' : 'Lower', plannedExerciseIds }
  await db.plans.add(plan)
  return id
}

export async function createPlanSuggested(): Promise<string> {
  const now = Date.now()
  const id = `plan:${nanoid()}`
  const plannedExerciseIds = await assembleSuggestedPlan(db)
  if (plannedExerciseIds.length < 4) {
    throw new Error('Not enough history yet for a suggestion. Use Quick pick or a focus workout.')
  }
  const plan: Plan = { id, createdAt: now, mode: 'suggested', planName: 'Suggested', plannedExerciseIds }
  await db.plans.add(plan)
  return id
}

export async function createPlanQuickPick(name: string, exerciseIds: string[]): Promise<string> {
  if (exerciseIds.length < 4) throw new Error('Pick at least 4 exercises.')
  const now = Date.now()
  const id = `plan:${nanoid()}`
  const plan: Plan = { id, createdAt: now, mode: 'quickpick', planName: name.trim() || 'Quick pick', plannedExerciseIds: exerciseIds.slice() }
  await db.plans.add(plan)
  return id
}

export async function updatePlan(planId: string, patch: Partial<Plan>): Promise<void> {
  await db.plans.update(planId, { ...patch })
}

export async function reorderPlanExercise(planId: string, fromIndex: number, toIndex: number): Promise<void> {
  const plan = await db.plans.get(planId)
  if (!plan) return
  const ids = plan.plannedExerciseIds.slice()
  const [moved] = ids.splice(fromIndex, 1)
  ids.splice(toIndex, 0, moved)
  await db.plans.update(planId, { plannedExerciseIds: ids })
}

export async function deferPlanExercise(planId: string, index: number): Promise<void> {
  const plan = await db.plans.get(planId)
  if (!plan) return
  const ids = plan.plannedExerciseIds.slice()
  const [moved] = ids.splice(index, 1)
  ids.push(moved)
  await db.plans.update(planId, { plannedExerciseIds: ids })
}

export async function startSessionFromPlan(planId: string): Promise<string> {
  const plan = await db.plans.get(planId)
  if (!plan) throw new Error('Plan not found')
  if (plan.plannedExerciseIds.length < 4) throw new Error('Workouts need at least 4 exercises.')

  const now = Date.now()
  const sessionId = `sess:${nanoid()}`
  const session: Session = {
    id: sessionId,
    startedAt: now,
    endedAt: null,
    mode: plan.mode,
    templateId: plan.templateId,
    focus: plan.focus,
    planName: plan.planName,
    plannedExerciseIds: plan.plannedExerciseIds.slice(),
  }

  const sessionExercises: SessionExercise[] = plan.plannedExerciseIds.map((exerciseId, idx) => ({
    id: `se:${nanoid()}`,
    sessionId,
    exerciseId,
    orderIndex: idx,
    status: 'pending',
    deferredCount: 0,
    createdAt: now,
    updatedAt: now,
  }))

  await db.transaction('rw', db.sessions, db.sessionExercises, async () => {
    // Continuity assumption: only one active session at a time.
    const active = await db.sessions.where('endedAt').equals(null as unknown as number).first()
    if (active) {
      // If one exists, just return it (user can end it to "correct" continuity).
      throw new Error('A workout is already in progress.')
    }
    await db.sessions.add(session)
    await db.sessionExercises.bulkAdd(sessionExercises)
  })

  return sessionId
}

export async function endSession(sessionId: string): Promise<void> {
  await db.sessions.update(sessionId, { endedAt: Date.now() })
}

export async function skipSessionExercise(sessionId: string, exerciseId: string): Promise<void> {
  const row = await db.sessionExercises.where('[sessionId+exerciseId]').equals([sessionId, exerciseId]).first()
  if (!row) return
  await db.sessionExercises.update(row.id, { status: 'skipped', updatedAt: Date.now() })
}

export async function markSessionExerciseCompleted(sessionId: string, exerciseId: string): Promise<void> {
  const row = await db.sessionExercises.where('[sessionId+exerciseId]').equals([sessionId, exerciseId]).first()
  if (!row) return
  await db.sessionExercises.update(row.id, { status: 'completed', updatedAt: Date.now() })
}

export async function deferSessionExercise(sessionId: string, exerciseId: string): Promise<void> {
  const rows = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('orderIndex')
  const idx = rows.findIndex((r) => r.exerciseId === exerciseId)
  if (idx < 0) return
  const [moved] = rows.splice(idx, 1)
  moved.deferredCount += 1
  rows.push(moved)
  await db.transaction('rw', db.sessionExercises, async () => {
    const now = Date.now()
    for (let i = 0; i < rows.length; i++) {
      await db.sessionExercises.update(rows[i].id, { orderIndex: i, deferredCount: rows[i].deferredCount, updatedAt: now })
    }
  })
}

export async function reorderRemainingSessionExercises(sessionId: string, fromExerciseId: string, toIndex: number): Promise<void> {
  const rows = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('orderIndex')
  const fromIndex = rows.findIndex((r) => r.exerciseId === fromExerciseId)
  if (fromIndex < 0) return
  const [moved] = rows.splice(fromIndex, 1)
  rows.splice(toIndex, 0, moved)
  await db.transaction('rw', db.sessionExercises, async () => {
    const now = Date.now()
    for (let i = 0; i < rows.length; i++) {
      await db.sessionExercises.update(rows[i].id, { orderIndex: i, updatedAt: now })
    }
  })
}

export async function logSet(input: {
  sessionId: string
  exerciseId: string
  repsCompleted: number
  weight: number
  missedReps: number
  restSecondsBefore?: number
}): Promise<string> {
  const now = Date.now()
  const existing = await db.sessionSets.where('[sessionId+exerciseId]').equals([input.sessionId, input.exerciseId]).toArray()
  const nextSetIndex = existing.length
  const id = `set:${nanoid()}`
  await db.sessionSets.add({
    id,
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    setIndex: nextSetIndex,
    createdAt: now,
    completedAt: now,
    repsCompleted: Math.max(0, Math.floor(input.repsCompleted)),
    weight: Number.isFinite(input.weight) ? input.weight : 0,
    missedReps: Math.max(0, Math.floor(input.missedReps)),
    restSecondsBefore: input.restSecondsBefore,
  })
  return id
}

export async function setIntentionalMiss(setId: string, intentional: boolean): Promise<void> {
  await db.sessionSets.update(setId, { intentionalMiss: intentional })
}

