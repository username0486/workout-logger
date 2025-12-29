export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return fallback
  }
}

