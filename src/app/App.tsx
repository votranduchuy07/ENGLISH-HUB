import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { RouteError } from './RouteError'

const Dashboard = lazy(() => import('../features/dashboard/DashboardPage'))
const Library = lazy(() => import('../features/library/LibraryPage'))
const WordDetail = lazy(() => import('../features/library/WordDetailPage'))
const Quizzes = lazy(() => import('../features/quizzes/QuizzesPage'))
const Daily = lazy(() => import('../features/daily/DailyPage'))
const Flashcards = lazy(() => import('../features/flashcards/FlashcardsPage'))
const Spelling = lazy(() => import('../features/spelling/SpellingPage'))
const Listening = lazy(() => import('../features/listening/ListeningPage'))
const Analytics = lazy(() => import('../features/analytics/AnalyticsPage'))
const Dictionary = lazy(() => import('../features/dictionary/DictionaryPage'))
const Settings = lazy(() => import('../features/settings/SettingsPage'))
const Achievements = lazy(() => import('../features/achievements/AchievementsPage'))
const Speaking = lazy(() => import('../features/speaking/SpeakingPage'))
const Mistakes = lazy(() => import('../features/mistakes/MistakesPage'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'library', element: <Library /> },
      { path: 'library/:id', element: <WordDetail /> },
      { path: 'daily', element: <Daily /> },
      { path: 'flashcards', element: <Flashcards /> },
      { path: 'spelling', element: <Spelling /> },
      { path: 'listening', element: <Listening /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'dictionary', element: <Dictionary /> },
      { path: 'settings', element: <Settings /> },
      { path: 'achievements', element: <Achievements /> },
      { path: 'speaking', element: <Speaking /> },
      { path: 'mistakes', element: <Mistakes /> },
      { path: 'quizzes', element: <Quizzes /> },
      { path: '*', element: <RouteError notFound /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
