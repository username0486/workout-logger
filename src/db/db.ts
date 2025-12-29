import Dexie, { type Table } from 'dexie'

export type BodyFocus = 'upper' | 'lower'

export type Exercise = {
  id: string
  name: string
  aliases: string[]
  normalizedName: string
  normalizedAliases: string[]
  category?: string
  type?: 'compound' | 'isolation' | 'cardio' | 'other'
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string[]
  instructions?: string
  imageUrls: string[]
  videoUrls: string[]
  isCustom: boolean
  createdAt: number
  updatedAt: number
}

export type WorkoutTemplate = {
  id: string
  name: string
  exerciseIds: string[]
  createdAt: number
  updatedAt: number
}

export type Plan = {
  id: string
  createdAt: number
  mode: 'template' | 'focus' | 'suggested' | 'quickpick'
  planName: string
  templateId?: string
  focus?: BodyFocus
  plannedExerciseIds: string[]
  equipmentFilter?: string[] // if present, only include these
}

export type Session = {
  id: string
  startedAt: number
  endedAt: number | null
  mode: 'template' | 'focus' | 'suggested' | 'quickpick'
  templateId?: string
  focus?: BodyFocus
  planName: string
  // Snapshot of the exercises planned at start. Template edits do not back-propagate.
  plannedExerciseIds: string[]
}

export type SessionExercise = {
  id: string
  sessionId: string
  exerciseId: string
  orderIndex: number
  status: 'pending' | 'completed' | 'skipped'
  deferredCount: number
  createdAt: number
  updatedAt: number
}

export type SessionSet = {
  id: string
  sessionId: string
  exerciseId: string
  setIndex: number
  createdAt: number
  completedAt?: number
  repsCompleted: number
  weight: number
  missedReps: number
  intentionalMiss?: boolean
  // Rest since previous completed set for this exercise.
  restSecondsBefore?: number
}

export class GymLogDB extends Dexie {
  exercises!: Table<Exercise, string>
  workoutTemplates!: Table<WorkoutTemplate, string>
  plans!: Table<Plan, string>
  sessions!: Table<Session, string>
  sessionExercises!: Table<SessionExercise, string>
  sessionSets!: Table<SessionSet, string>

  constructor() {
    super('gym-log-db')

    this.version(1).stores({
      exercises:
        'id, normalizedName, *normalizedAliases, *equipment, *primaryMuscles, *secondaryMuscles, isCustom, updatedAt',
      workoutTemplates: 'id, updatedAt',
      sessions: 'id, startedAt, endedAt, mode, templateId, focus',
      sessionExercises: 'id, sessionId, [sessionId+orderIndex], [sessionId+exerciseId], status, updatedAt',
      sessionSets: 'id, sessionId, exerciseId, [exerciseId+completedAt], [sessionId+exerciseId], completedAt',
    })

    this.version(2).stores({
      exercises:
        'id, normalizedName, *normalizedAliases, *equipment, *primaryMuscles, *secondaryMuscles, isCustom, updatedAt',
      workoutTemplates: 'id, updatedAt',
      plans: 'id, createdAt, mode',
      sessions: 'id, startedAt, endedAt, mode, templateId, focus',
      sessionExercises: 'id, sessionId, [sessionId+orderIndex], [sessionId+exerciseId], status, updatedAt',
      sessionSets: 'id, sessionId, exerciseId, [exerciseId+completedAt], [sessionId+exerciseId], completedAt',
    })
  }
}

export const db = new GymLogDB()

