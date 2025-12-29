import type { Exercise, SessionSet } from '../db/db'

export type LastPerformance = {
  lastCompletedAt: number
  lastWeight: number
  lastReps: number
  lastRestSeconds?: number
}

export type StartSuggestion = {
  suggestedWeight: number
  suggestedRepsTarget: number
  note?: string
}

export type NextTimeSuggestion = {
  suggestedWeight: number
  note: string
}

function defaultTargetReps(ex: Exercise): number {
  if (ex.type === 'isolation') return 12
  if (ex.type === 'compound') return 8
  return 10
}

function roundToNiceIncrement(weight: number): number {
  if (weight <= 0) return 0
  // Conservative: 2.5kg-ish increments; still works for lbs users as "small step".
  const inc = weight >= 80 ? 5 : 2.5
  return Math.round(weight / inc) * inc
}

export function suggestStart(ex: Exercise, last: LastPerformance | undefined): StartSuggestion {
  const target = defaultTargetReps(ex)
  if (!last) return { suggestedWeight: 0, suggestedRepsTarget: target, note: 'New exercise — start light.' }

  const daysSince = (Date.now() - last.lastCompletedAt) / (1000 * 60 * 60 * 24)
  if (daysSince >= 21) {
    const lighter = roundToNiceIncrement(last.lastWeight * 0.92)
    return { suggestedWeight: lighter, suggestedRepsTarget: target, note: 'It’s been a while — start a bit lighter.' }
  }

  return { suggestedWeight: last.lastWeight, suggestedRepsTarget: target }
}

export function computeWorstSet(sets: SessionSet[]): SessionSet | undefined {
  if (sets.length === 0) return undefined
  return sets.reduce((worst, s) => {
    if (s.repsCompleted < worst.repsCompleted) return s
    if (s.repsCompleted === worst.repsCompleted && s.weight < worst.weight) return s
    return worst
  }, sets[0])
}

export function suggestNextTime(ex: Exercise, sessionSets: SessionSet[], repsTarget?: number): NextTimeSuggestion | undefined {
  if (sessionSets.length === 0) return undefined
  const target = repsTarget ?? defaultTargetReps(ex)
  const worst = computeWorstSet(sessionSets)
  if (!worst) return undefined

  const hadUnintentionalMiss = sessionSets.some((s) => s.missedReps > 0 && s.intentionalMiss !== true)
  if (hadUnintentionalMiss) {
    const down = roundToNiceIncrement(Math.max(0, worst.weight * 0.95))
    return { suggestedWeight: down, note: 'Missed reps (not intentional) — consider a small step down next time.' }
  }

  if (worst.repsCompleted >= target) {
    const up = roundToNiceIncrement(worst.weight + (worst.weight >= 80 ? 5 : 2.5))
    return { suggestedWeight: up, note: 'Hit target reps (worst set) — consider a small increase next time.' }
  }

  return { suggestedWeight: worst.weight, note: 'Keep the weight; build reps on the worst set.' }
}

