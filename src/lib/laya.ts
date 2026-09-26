import { Agent, type QuestionDef, type SystemOneResult } from 'laya-ts'
import * as ort from 'onnxruntime-web'

// onnxruntime-web 运行时（wasm/mjs）放在 public/runtime/。
// 必须用绝对 URL：glue 脚本以 ort.mjs 所在目录为基准解析相对路径。
ort.env.wasm.wasmPaths = new URL('runtime/', document.baseURI).href

/** 单次决策只问一个问题，qid 固定 */
export const DECISION_QID = 'decision'

/**
 * 关掉 laya-ts 写下的 CacheStorage 副本。
 *
 * laya-ts 的 fetchArrayBuffer 会把模型字节再往 CacheStorage 存一份（bucket 名 "laya-ts"），
 * 但它是 network-first：只有 fetch 抛错时才会读缓存。模型就在 APK 内、本地资源不会失败，
 * 这份副本从写入到卸载都不会被读到，白白多占约 294 MB。
 *
 * 这里只让 caches.open 立刻失败——laya-ts 内部是 `try { cache = await caches.open(...) }
 * catch { cache = null }`，会正常退化成普通 fetch（同样是 fetch + res.ok 校验 + arrayBuffer）。
 * CacheStorage 的其它 API（keys/match/delete）不受影响；若本机不支持改写则保持原状。
 */
try {
  if (globalThis.caches) {
    globalThis.caches.open = () =>
      Promise.reject(new Error('laya-app: 已禁用 CacheStorage 模型副本（模型为本地资源）'))
  }
} catch {
  /* 改写失败就维持默认行为，不影响功能 */
}

/** choice 问题的固定指令：待决策内容由 predict 的 state 承载 */
const DECISION_INSTRUCTION = '根据输入内容，从下列选项中选出最合适的一项'

/**
 * 用用户填写的选项构造 choice 问题。
 * laya-ts 的 choice 支持 `criteria` 为「标签数组」，此时选项原文即为答案键，
 * 因此不需要额外的 key -> 文案映射，模型侧接口与预设问题完全一致。
 */
export function buildChoiceQuestion(options: string[]): QuestionDef {
  return { type: 'choice', instructions: DECISION_INSTRUCTION, criteria: options }
}

let agentPromise: Promise<Agent> | null = null

/** 加载模型（单例，重复调用复用；失败后允许重试） */
export function loadAgent(): Promise<Agent> {
  if (!agentPromise) {
    // 浏览器端必须传完整 URL：laya-ts 会把非 URL 路径当作 HuggingFace repo id
    const modelUrl = new URL('model', document.baseURI).href.replace(/\/+$/, '')
    agentPromise = Agent.load(modelUrl).catch((err) => {
      agentPromise = null
      throw err
    })
  }
  return agentPromise
}

/** 执行一次决策：文本作为 state，用户选项作为 choice 的候选 */
export function decide(agent: Agent, text: string, options: string[]): Promise<SystemOneResult> {
  return agent.predict(text, { [DECISION_QID]: buildChoiceQuestion(options) })
}
