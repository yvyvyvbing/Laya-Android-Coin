import { env, pipeline, type TranslationPipeline } from '@huggingface/transformers'
import * as ort from 'onnxruntime-web'

/** 本地离线中英翻译模型目录：public/translate/<MODEL_ID>/ */
const MODEL_ID = 'opus-mt-zh-en'

// 完全离线：只读 APK 内的本地文件，不访问 HuggingFace Hub
env.allowRemoteModels = false
env.allowLocalModels = true
// 模型文件已在包内，再往 CacheStorage 存一份会白白多占约 115 MB
env.useBrowserCache = false
// 必须是「路径」而不是 http(s) 绝对 URL：transformers.js 的 `_get_file_metadata`
// 只在 localPath 不是 http/https URL 时才去探测本地文件，否则会直接判定文件不存在，
// 导致 tokenizer 文件永远不被加载（报 "_build_translation_inputs" in null）。
env.localModelPath = '/translate/'
// 与 laya-ts 共用同一个 onnxruntime-web 实例，wasm 运行时统一放在 public/runtime/
ort.env.wasm.wasmPaths = new URL('runtime/', document.baseURI).href

let translatorPromise: Promise<TranslationPipeline> | null = null

/** 首次使用时才加载翻译模型（失败后允许重试），避免拖慢启动 */
function getTranslator(): Promise<TranslationPipeline> {
  if (!translatorPromise) {
    translatorPromise = pipeline('translation', MODEL_ID, { dtype: 'q8' }).catch((err) => {
      translatorPromise = null
      throw err
    })
  }
  return translatorPromise
}

export async function warmUpTranslator(): Promise<void> {
  await getTranslator()
}

/** 中文 -> 英文 */
export async function translateText(text: string): Promise<string> {
  const translator = await getTranslator()
  const out = await translator(text)
  const first = Array.isArray(out) ? out[0] : out
  return String(first?.translation_text ?? '').trim()
}

/**
 * 逐条翻译候选项。若两条选项译成了同一个英文串（会互相覆盖模型侧的选项键），
 * 则这一条退回原文，保证送给模型的选项始终互不相同。
 */
export async function translateOptions(options: string[]): Promise<string[]> {
  const result: string[] = []
  for (const option of options) {
    let english = ''
    try {
      english = await translateText(option)
    } catch {
      english = ''
    }
    result.push(english && !result.includes(english) ? english : option)
  }
  return result
}
