import { useState } from 'react'
import type { Agent, ChoiceAnswer } from 'laya-ts'
import { DECISION_QID, decide } from '../lib/laya'
import { translateOptions, translateText } from '../lib/translate'
import OptionSheet from './OptionSheet'
import ResultCard from './ResultCard'

/** 可决策所需的最少选项数 */
const MIN_OPTIONS = 2

/** 把英文选项上的答案映射回用户填写的中文选项，只用于展示 */
function toOriginalAnswer(
  answer: ChoiceAnswer,
  englishOptions: string[],
  originalOptions: string[],
): ChoiceAnswer {
  const index = englishOptions.indexOf(answer.choice)
  if (index < 0) return answer
  const probabilities: Record<string, number> = {}
  englishOptions.forEach((english, i) => {
    probabilities[originalOptions[i] ?? english] = answer.probabilities[english] ?? 0
  })
  return { ...answer, choice: originalOptions[index], probabilities }
}

export default function HomePage({ agent }: { agent: Agent }) {
  const [text, setText] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [english, setEnglish] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'translate' | 'decide'>('idle')
  const [answer, setAnswer] = useState<ChoiceAnswer | null>(null)
  const [tokens, setTokens] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const running = phase !== 'idle'
  const canDecide = !running && text.trim() !== '' && options.length >= MIN_OPTIONS

  const onDecide = async () => {
    if (!canDecide) return
    setError(null)
    setAnswer(null)
    setTokens(null)
    try {
      let inputText = text.trim()
      let inputOptions = options
      if (english) {
        setPhase('translate')
        const translatedText = await translateText(inputText)
        if (translatedText) inputText = translatedText
        inputOptions = await translateOptions(options)
      }

      setPhase('decide')
      const result = await decide(agent, inputText, inputOptions)
      const a = result.answers[DECISION_QID]
      if (!a || a.type !== 'choice') {
        setError('模型未返回 choice 结果')
        return
      }
      setAnswer(english ? toOriginalAnswer(a, inputOptions, options) : a)
      setTokens(result.usage.input_tokens)
    } catch (e) {
      setError('决策失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setPhase('idle')
    }
  }

  const onReset = () => {
    setText('')
    setOptions([])
    setAnswer(null)
    setTokens(null)
    setError(null)
  }

  return (
    <>
      <section className="field">
        <label className="field-label" htmlFor="question">
          决策问题
        </label>
        <textarea
          id="question"
          className="textarea"
          rows={5}
          placeholder="填写需要 Laya 决策的问题，例如：这条客户消息该由哪个部门处理？"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </section>

      <section className="field">
        <button className="add-btn" onClick={() => setSheetOpen(true)}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          添加决策选项
        </button>
        {options.length === 0 ? (
          <p className="hint">至少添加 {MIN_OPTIONS} 个候选项</p>
        ) : (
          <div className="option-list">
            {options.map((option) => (
              <span key={option} className="option-chip">
                {option}
              </span>
            ))}
          </div>
        )}
      </section>

      <label className={'switch-row' + (running ? ' disabled' : '')}>
        <input
          type="checkbox"
          className="switch-input"
          checked={english}
          disabled={running}
          onChange={(e) => setEnglish(e.target.checked)}
        />
        <span className="switch-text">
          <span className="switch-name">英文输入</span>
          <span className="switch-desc">先把问题与选项离线翻译成英文，再送入 Laya 模型</span>
        </span>
      </label>

      <button
        className={'decide-btn' + (running ? ' loading' : '')}
        disabled={!canDecide}
        onClick={onDecide}
      >
        {phase === 'translate' ? '翻译中…' : phase === 'decide' ? '决策中…' : '决策'}
      </button>

      {error && <div className="error-box">{error}</div>}

      {answer && (
        <section className="results">
          <ResultCard answer={answer} />
          {tokens !== null && <div className="usage">输入 token 数：{tokens}</div>}
          <button className="reset-btn" onClick={onReset}>
            重置
          </button>
        </section>
      )}

      {sheetOpen && (
        <OptionSheet
          options={options}
          onChange={setOptions}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}
