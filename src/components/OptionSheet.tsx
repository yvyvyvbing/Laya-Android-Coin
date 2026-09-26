import { useState } from 'react'

/** 选项上限：选项越多，模型每个选项可分到的 head 预算越少，超出后质量下降 */
const MAX_OPTIONS = 8

export default function OptionSheet({
  options,
  onChange,
  onClose,
}: {
  options: string[]
  onChange: (next: string[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState('')
  const full = options.length >= MAX_OPTIONS

  const add = () => {
    const value = draft.trim()
    if (!value || full || options.includes(value)) return
    onChange([...options, value])
    setDraft('')
  }

  const remove = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <span className="sheet-handle" />
        <div className="sheet-head">
          <h2>决策选项</h2>
          <span className="sheet-count">
            {options.length}/{MAX_OPTIONS}
          </span>
        </div>

        <form
          className="sheet-add"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input
            className="input"
            placeholder="输入一个候选项，例如：技术支持"
            value={draft}
            maxLength={40}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="ghost-btn" type="submit" disabled={!draft.trim() || full}>
            添加
          </button>
        </form>

        {options.length === 0 ? (
          <p className="hint">还没有选项，至少添加 2 个候选项 Laya 才能给出决策。</p>
        ) : (
          <ul className="sheet-list">
            {options.map((option, index) => (
              <li key={option} className="sheet-item">
                <span className="sheet-item-text">{option}</span>
                <button
                  className="sheet-del"
                  aria-label={`删除选项 ${option}`}
                  onClick={() => remove(index)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <button className="primary-btn" onClick={onClose}>
          完成
        </button>
      </div>
    </div>
  )
}
