import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './app/AppShell'
import { HomeScreen } from './screens/HomeScreen'
import { StartWorkoutScreen } from './screens/StartWorkoutScreen'
import { CreateExerciseScreen } from './screens/CreateExerciseScreen'
import { TemplatesScreen } from './screens/TemplatesScreen'
import { CreateTemplateScreen } from './screens/CreateTemplateScreen'
import { WorkoutPreviewScreen } from './screens/WorkoutPreviewScreen'
import { QuickPickScreen } from './screens/QuickPickScreen'
import { SessionScreen } from './screens/SessionScreen'
import { SessionSummaryScreen } from './screens/SessionSummaryScreen'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/start" element={<StartWorkoutScreen />} />
        <Route path="/exercises/new" element={<CreateExerciseScreen />} />
        <Route path="/templates" element={<TemplatesScreen />} />
        <Route path="/templates/new" element={<CreateTemplateScreen />} />
        <Route path="/quick-pick" element={<QuickPickScreen />} />
        <Route path="/preview/:planId" element={<WorkoutPreviewScreen />} />
        <Route path="/session/:sessionId" element={<SessionScreen />} />
        <Route path="/session/:sessionId/summary" element={<SessionSummaryScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
