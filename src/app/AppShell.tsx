import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ensureSeeded } from '../db/seed'
import { useActiveSessionId } from '../db/queries'

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeSessionId = useActiveSessionId()

  useEffect(() => {
    // Seed only once; safe to call repeatedly.
    void ensureSeeded()
  }, [])

  const isHome = location.pathname === '/'
  const showTabs = activeSessionId == null

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="topbar__back"
          onClick={() => navigate(-1)}
          aria-label="Back"
          disabled={isHome}
          title={isHome ? undefined : 'Back'}
        >
          ←
        </button>
        <div className="topbar__title">Gym Log</div>
        <div className="topbar__right" />
      </header>

      <main className="main">
        <Outlet />
      </main>

      {showTabs && (
        <nav className="tabs" aria-label="Primary">
          <NavLink to="/" className={({ isActive }) => `tabs__item ${isActive ? 'is-active' : ''}`}>
            Home
          </NavLink>
          <NavLink
            to="/templates"
            className={({ isActive }) => `tabs__item ${isActive ? 'is-active' : ''}`}
          >
            Workouts
          </NavLink>
          <NavLink
            to="/exercises/new"
            className={({ isActive }) => `tabs__item ${isActive ? 'is-active' : ''}`}
          >
            New exercise
          </NavLink>
        </nav>
      )}
    </div>
  )
}

