import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Desactivar logs en consola para evitar fugas de información
if (import.meta.env.PROD || true) { // Se activa siempre por petición del usuario
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
}

createRoot(document.getElementById('root')).render(
  <App />
)
