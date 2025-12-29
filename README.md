# Gym Log (memory-driven workout logging)

Low-cognitive-load workout log that assumes continuity unless you correct it. Workouts are **containers of exercises** (not prescriptions), and the UI stays quiet: no coaching, optimization, or goal tracking.

## Run locally

```bash
npm install
npm run dev
```

## What’s implemented

- **Home → Start Workout** flow with continuity (resumes active session automatically).
- **Workout definition (templates)**: 4+ exercises (5–6 encouraged). Skips are logged in-session and **never modify the template**.
- **Three exercise selection scenarios**
  - **Predefined**: start from a template → preview ordered exercises + last performance.
  - **Body focus**: Upper/Lower auto-assembles **5 most recent** for that focus (falls back to library if no history).
  - **Suggested**: top 5 most frequent **from history only** (disabled until you have enough history).
- **Execution & logging**
  - Per set: **reps completed**, **weight**, **missed reps**
  - Missed reps prompt (inline, no dialog): **“Was this intentional?”**
  - **Rest timer** starts after each set; rest is auto-logged on the next set
- **Progression suggestions**
  - Start suggestions: heavier if recent; lighter if it’s been a while
  - Next-time suggestions in the session summary use the **worst set**, not average

## Data & persistence

- Local-first persistence via IndexedDB (Dexie): exercises, templates, draft plans, sessions, session exercises, and sets.
- Seed exercise library lives in `src/data/exercises.seed.ts` (small starter list).

## Notes on the “open exercise dataset” requirement

This scaffold includes a **small seed snapshot** to keep the repo lightweight and editable. If you want a full dataset export (ExerciseDB / wrkout JSON / similar), replace or extend `src/data/exercises.seed.ts` and keep the normalization approach in `src/domain/normalize.ts`.
