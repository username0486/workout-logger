import { db } from './db'
import { SEED_EXERCISES } from '../data/exercises.seed'

let seedingPromise: Promise<void> | null = null

export async function ensureSeeded(): Promise<void> {
  if (seedingPromise) return seedingPromise

  seedingPromise = (async () => {
    const count = await db.exercises.count()
    if (count > 0) return
    await db.exercises.bulkAdd(SEED_EXERCISES)
  })()

  return seedingPromise
}

