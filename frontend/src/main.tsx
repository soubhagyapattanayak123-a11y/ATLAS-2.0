import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorkerAndPWA } from './utils/pwaInstaller'

// Initialize PWA service worker caching for mobile and laptop
registerServiceWorkerAndPWA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

