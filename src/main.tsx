import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'normalize.css'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'
import { CollectionProvider } from './collection/CollectionProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Address changes apply at once, so the search box and the address
        never disagree while typing. */}
    <BrowserRouter basename={import.meta.env.BASE_URL} useTransitions={false}>
      <CollectionProvider>
        <App />
      </CollectionProvider>
    </BrowserRouter>
  </StrictMode>,
)
