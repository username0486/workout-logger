import type { Exercise } from '../db/db'

export function suggestRestSeconds(ex: Exercise, hadMissedReps: boolean): number {
  if (hadMissedReps) return 180
  if (ex.type === 'compound') return 150
  if (ex.type === 'isolation') return 90
  return 120
}

export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

