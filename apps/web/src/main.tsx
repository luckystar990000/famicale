import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { SchedulesProvider } from './state/schedules'
import { TimetablesProvider } from './state/timetables'
import { LunchProvider } from './state/lunch'
import { ShareProvider } from './state/share'

// Service Worker 登録 (Web Push の受信機)。
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW register failed', err))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SchedulesProvider>
        <TimetablesProvider>
          <LunchProvider>
            <ShareProvider>
              <App />
            </ShareProvider>
          </LunchProvider>
        </TimetablesProvider>
      </SchedulesProvider>
    </BrowserRouter>
  </StrictMode>
)
