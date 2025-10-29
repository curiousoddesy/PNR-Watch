import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeAccessibility } from './utils/accessibility'
import { pwaManager } from './utils/pwa'

// Initialize accessibility features
initializeAccessibility()

// Initialize PWA manager (service worker, caching, background sync)
// This will automatically register the service worker and initialize services
console.log('Initializing PWA features...')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
