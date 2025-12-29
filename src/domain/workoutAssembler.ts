import type { GymLogDB } from '../db/db'
import type { BodyFocus, Exercise } from '../db/db'

const UPPER_MUSCLES = new Set([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'rear delts',
  'upper chest',
  'core',
  'abs',
])

const LOWER_MUSCLES = new Set(['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors'])

function matchesFocus(ex: Exercise, focus: BodyFocus): boolean {
  const focusSet = focus === 'upper' ? UPPER_MUSCLES : LOWER_MUSCLES
  const muscles = [...ex.primaryMuscles, ...ex.secondaryMuscles].map((m) => m.toLowerCase())
  return muscles.some((m) => focusSet.has(m))
}

async function getRecentDistinctExerciseIds(db: GymLogDB, limit: number): Promise<string[]> {
  const rows = await db.sessionSets.where('completedAt').above(0).toArray()
  const ordered = rows.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  const seen = new Set<string>()
  const out: string[] = []
  for (const s of ordered) {
    if (!seen.has(s.exerciseId)) {
      seen.add(s.exerciseId)
      out.push(s.exerciseId)
      if (out.length >= limit) break
    }
  }
  return out
}

export async function assembleFocusPlan(db: GymLogDB, focus: BodyFocus): Promise<string[]> {
  // Scenario 2: take 5 most recent exercises for the focus.
  const recent = await getRecentDistinctExerciseIds(db, 50)
  const recentExercises = (await db.exercises.bulkGet(recent)).filter(Boolean) as Exercise[]
  const byId = new Map(recentExercises.map((e) => [e.id, e]))

  const picked: string[] = []
  for (const id of recent) {
    const ex = byId.get(id)
    if (!ex) continue
    if (!matchesFocus(ex, focus)) continue
    picked.push(id)
    if (picked.length >= 5) break
  }

  if (picked.length >= 4) return picked

  // Fallback: fill from library (no history yet). Keep it small (5–6).
  const all = await db.exercises.toArray()
  const candidates = all.filter((e) => matchesFocus(e, focus))
  for (const ex of candidates) {
    if (picked.includes(ex.id)) continue
    picked.push(ex.id)
    if (picked.length >= 5) break
  }

  return picked
}

export async function assembleSuggestedPlan(db: GymLogDB): Promise<string[]> {
  // Scenario 3: only from history. Top 5 most frequently performed.
  const freq = new Map<string, number>()
  await db.sessionSets.where('completedAt').above(0).each((s) => {
    freq.set(s.exerciseId, (freq.get(s.exerciseId) ?? 0) + 1)
  })

  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  return sorted.slice(0, 5)
}

