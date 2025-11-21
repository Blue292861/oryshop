import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import { FavoritesProvider } from './contexts/FavoritesContext'

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <FavoritesProvider>
      <App />
    </FavoritesProvider>
  </HelmetProvider>
);
