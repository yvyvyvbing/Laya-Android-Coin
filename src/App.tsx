import { useEffect, useState } from 'react'
import type { Agent } from 'laya-ts'
import { loadAgent } from './lib/laya'
import { applyTheme, readTheme, type ThemeKey } from './lib/theme'
import BottomNav, { type TabKey } from './components/BottomNav'
import HomePage from './components/HomePage'
import SettingsPage from './components/SettingsPage'
import './App.css'

type Status = 'loading' | 'ready' | 'error'

export default function App() {
  const [status, setStatus] = useState<Status>('loading')
  const [agent, setAgent] = useState<Agent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('home')
  const [attempt, setAttempt] = useState(0)
  const [theme, setTheme] = useState<ThemeKey>(readTheme)

  useEffect(() => {
    loadAgent()
      .then((a) => {
        setAgent(a)
        setStatus('ready')
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      })
  }, [attempt])

  const retry = () => {
    setError(null)
    setStatus('loading')
    setAttempt((n) => n + 1)
  }

  const changeTheme = (key: ThemeKey) => {
    setTheme(key)
    applyTheme(key)
  }

  if (status === 'loading') {
    return (
      <div className="boot">
        <span className="spinner" />
        <p className="boot-title">正在加载模型…</p>
        <p className="boot-hint">首次启动需载入约 353 MB 模型，请稍候</p>
      </div>
    )
  }

  if (status === 'error' || !agent) {
    return (
      <div className="boot">
        <p className="boot-title">模型加载失败</p>
        <p className="boot-hint">{error}</p>
        <button className="primary-btn" onClick={retry}>
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Laya 决策助手</h1>
      </header>

      <main className="content">
        {/* 两个页面都保持挂载，切换 Tab 不丢失已填内容与决策结果 */}
        <section className={'page' + (tab === 'home' ? ' active' : '')}>
          <HomePage agent={agent} />
        </section>
        <section className={'page' + (tab === 'settings' ? ' active' : '')}>
          <SettingsPage theme={theme} onChange={changeTheme} />
        </section>
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
