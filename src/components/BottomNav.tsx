import type { ReactNode } from 'react'

export type TabKey = 'home' | 'settings'

interface TabDef {
  key: TabKey
  label: string
  icon: ReactNode
}

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const TABS: TabDef[] = [
  {
    key: 'home',
    label: '首页',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 10.6 12 3.4l9 7.2" />
        <path d="M5.6 9.4V20h12.8V9.4" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: '设置',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 3.2v2.2M12 18.6v2.2M4.4 7.9l1.9 1.1M17.7 15l1.9 1.1M4.4 16.1l1.9-1.1M17.7 9l1.9-1.1" />
      </svg>
    ),
  },
]

export default function BottomNav({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (key: TabKey) => void
}) {
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={'tab' + (active === tab.key ? ' active' : '')}
          aria-current={active === tab.key ? 'page' : undefined}
          onClick={() => onChange(tab.key)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
