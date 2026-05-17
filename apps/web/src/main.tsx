import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { SchedulesProvider } from './state/schedules'
import { ShareProvider } from './state/share'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SchedulesProvider>
        <ShareProvider>
          <App />
        </ShareProvider>
      </SchedulesProvider>
    </BrowserRouter>
  </StrictMode>
)
