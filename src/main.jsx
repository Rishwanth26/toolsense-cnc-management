import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import VMCOperatorHMI from './VMCOperatorHMI.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <VMCOperatorHMI />
  </StrictMode>,
)
