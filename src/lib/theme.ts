export const THEMES = [
  { key: 'ink', label: '墨绿', desc: '默认主题' },
  { key: 'navy', label: '暗夜蓝', desc: '冷色调深色' },
  { key: 'graphite', label: '石墨', desc: '中性深灰 + 金' },
  { key: 'violet', label: '暗紫', desc: '深紫夜色' },
  { key: 'olive', label: '橄榄', desc: '深色军绿' },
  { key: 'coffee', label: '深棕', desc: '暖调深色' },
  { key: 'black', label: '曜黑', desc: '纯黑省电' },
  { key: 'light', label: '浅色', desc: '明亮背景' },
  { key: 'sand', label: '暖沙', desc: '暖调浅色' },
  { key: 'rose', label: '樱粉', desc: '柔和粉调' },
] as const

export type ThemeKey = (typeof THEMES)[number]['key']

const STORAGE_KEY = 'laya-theme'

/** 读取已保存的主题，非法或不可用时回退到默认的墨绿 */
export function readTheme(): ThemeKey {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && THEMES.some((t) => t.key === saved)) return saved as ThemeKey
  } catch {
    /* WebView 禁用 storage 时直接用默认主题 */
  }
  return 'ink'
}

/** 应用并持久化主题（下次启动仍然生效） */
export function applyTheme(key: ThemeKey): void {
  document.documentElement.dataset.theme = key
  try {
    localStorage.setItem(STORAGE_KEY, key)
  } catch {
    /* 写入失败只影响下次启动，不影响本次显示 */
  }
}
