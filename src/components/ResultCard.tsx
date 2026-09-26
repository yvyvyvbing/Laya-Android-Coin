import type { ChoiceAnswer } from 'laya-ts'

function pct(v: number): string {
  return (v * 100).toFixed(1) + '%'
}

export default function ResultCard({ answer }: { answer: ChoiceAnswer }) {
  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">决策结果</span>
        <span className="card-conf">置信度 {pct(answer.answer_confidence)}</span>
      </div>

      <div className="card-main">{answer.choice}</div>

      <div className="card-body">
        {Object.entries(answer.probabilities).map(([name, value]) => (
          <div
            key={name}
            className={'prob-row' + (name === answer.choice ? ' highlight' : '')}
          >
            <span className="prob-name">{name}</span>
            <span className="prob-value">{pct(value)}</span>
            <span className="prob-track">
              <span className="prob-fill" style={{ width: pct(value) }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
