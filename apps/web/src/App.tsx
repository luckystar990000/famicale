import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { House, Plus, Camera, List, type LucideIcon } from 'lucide-react'

const scrollPositions = new Map<string, number>()

function ScrollManager() {
  const location = useLocation()
  const navigationType = useNavigationType()
  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    if (navigationType === 'POP') {
      main.scrollTo(0, scrollPositions.get(location.key) ?? 0)
    } else {
      main.scrollTo(0, 0)
    }
    const save = () => scrollPositions.set(location.key, main.scrollTop)
    main.addEventListener('scroll', save, { passive: true })
    return () => main.removeEventListener('scroll', save)
  }, [location.key, navigationType])
  return null
}
import CountdownPage from './pages/CountdownPage'
import EventNewPage from './pages/EventNewPage'
import EventDetailPage from './pages/EventDetailPage'
import EventEditPage from './pages/EventEditPage'
import UploadPage from './pages/UploadPage'
import HistoryPage from './pages/HistoryPage'
import SharePage from './pages/SharePage'
import ViewerPage from './pages/ViewerPage'

const NAV_ITEMS: { to: string; label: string; Icon: LucideIcon; end: boolean }[] = [
  { to: '/', label: 'ホーム', Icon: House, end: true },
  { to: '/events/new', label: '追加', Icon: Plus, end: false },
  { to: '/upload', label: '撮影', Icon: Camera, end: false },
  { to: '/history', label: '履歴', Icon: List, end: false },
]

export default function App() {
  const location = useLocation()
  const viewerMode = location.pathname.startsWith('/v/')

  return (
    <div
      className="app-bg"
      style={{
        maxWidth: 480,
        margin: '0 auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <ScrollManager />
      <main style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: viewerMode ? 'env(safe-area-inset-bottom)' : 0,
      }}>
        <Routes>
          <Route path="/" element={<CountdownPage />} />
          <Route path="/events/new" element={<EventNewPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/events/:id/edit" element={<EventEditPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/share" element={<SharePage />} />
          <Route path="/v/:token" element={<ViewerPage />} />
        </Routes>
      </main>

      {!viewerMode && (
        <nav style={{
          flex: '0 0 auto',
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.65)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                flex: 1,
                padding: '8px 0 4px',
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: 500,
                color: isActive ? 'var(--tint)' : '#8e8e93',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={24} strokeWidth={2} color={isActive ? 'var(--tint)' : '#8e8e93'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
