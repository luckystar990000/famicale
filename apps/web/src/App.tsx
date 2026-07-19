import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { House, Plus, Camera, CalendarDays, type LucideIcon } from 'lucide-react'

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
import UploadPage from './pages/UploadPage'
import TimetablesPage from './pages/TimetablesPage'
import TimetablePage from './pages/TimetablePage'
import LunchPage from './pages/LunchPage'
import SettingsPage from './pages/SettingsPage'
import ViewerPage from './pages/ViewerPage'
import { setEditKey } from './lib/edit-key'

const NAV_ITEMS: { to: string; label: string; Icon: LucideIcon; end: boolean }[] = [
  { to: '/', label: 'ホーム', Icon: House, end: true },
  { to: '/events/new', label: '追加', Icon: Plus, end: false },
  { to: '/upload', label: '撮影', Icon: Camera, end: false },
  { to: '/timetables', label: '時間割', Icon: CalendarDays, end: false },
]

export default function App() {
  const location = useLocation()
  const viewerMode = location.pathname.startsWith('/v/')

  // 編集用リンク (?k=編集キー) で開かれたらキーを localStorage に保存し、 URL からは即消す
  // (ブラウザ履歴や共有時の露出を減らす)。 これで localStorage が消えてもリンクを開くだけで復元。
  // replace (フルリロード) なのは、 既に走った各 Provider の初回 GET が 401 で終わっているため。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const k = params.get('k')
    if (!k) return
    setEditKey(k)
    params.delete('k')
    const qs = params.toString()
    window.location.replace(window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash)
  }, [])

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
        position: 'relative',
      }}
    >
      <ScrollManager />
      <main style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: viewerMode
          ? 'env(safe-area-inset-bottom)'
          : 'calc(env(safe-area-inset-bottom) + 84px)',
      }}>
        <Routes>
          <Route path="/" element={<CountdownPage />} />
          <Route path="/events/new" element={<EventNewPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/timetables" element={<TimetablesPage />} />
          <Route path="/timetables/:id" element={<TimetablePage />} />
          <Route path="/lunch" element={<LunchPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/v/:token" element={<ViewerPage />} />
        </Routes>
      </main>

      {!viewerMode && (
        <nav style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 'calc(env(safe-area-inset-bottom) + 10px)',
          display: 'flex',
          gap: 2,
          padding: 6,
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'saturate(180%) blur(28px)',
          WebkitBackdropFilter: 'saturate(180%) blur(28px)',
          border: '0.5px solid var(--glass-border)',
          boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 10px 30px rgba(0, 0, 0, 0.12)',
          borderRadius: 999,
        }}>
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                flex: 1,
                padding: '8px 0 6px',
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--tint)' : '#8e8e93',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                borderRadius: 999,
                background: isActive ? 'rgba(0, 122, 255, 0.12)' : 'transparent',
                transition: 'background 0.15s ease',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={2} color={isActive ? 'var(--tint)' : '#8e8e93'} />
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
