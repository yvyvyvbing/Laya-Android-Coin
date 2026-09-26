import { THEMES, type ThemeKey } from '../lib/theme'

export default function SettingsPage({
  theme,
  onChange,
}: {
  theme: ThemeKey
  onChange: (key: ThemeKey) => void
}) {
  return (
    <section className="field">
      <span className="field-label">主题</span>
      <div className="theme-list">
        {THEMES.map((item) => (
          <button
            key={item.key}
            className={'theme-item' + (theme === item.key ? ' active' : '')}
            aria-pressed={theme === item.key}
            onClick={() => onChange(item.key)}
          >
            <span className={'theme-swatch swatch-' + item.key} />
            <span className="theme-text">
              <span className="theme-name">{item.label}</span>
              <span className="theme-desc">{item.desc}</span>
            </span>
            {theme === item.key && (
              <svg
                className="theme-check"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5 10 17.5 19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
