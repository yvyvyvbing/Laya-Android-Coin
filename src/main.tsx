import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, readTheme } from './lib/theme'

// 首帧前就定好主题，避免启动时先闪一下默认配色
applyTheme(readTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
