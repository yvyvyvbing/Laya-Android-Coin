#!/usr/bin/env node
/**
 * 准备运行/打包所需的本地资源。
 *
 * 这些文件体积大（合计约 590 MB，单个最大 310 MB），超出 GitHub 单文件 100 MB 的限制，
 * 因此不入库，改用本脚本准备：
 *
 *   1. public/runtime/                    ← 从 node_modules/onnxruntime-web/dist 复制 ORT 的 WASM 运行时（约 86 MB）
 *   2. public/translate/opus-mt-zh-en/    ← 从 HF 镜像下载离线中英翻译模型量化版（约 116 MB）
 *   3. public/model/                      ← Laya int8 模型，需要自行导出或用 --laya-dir 指定已有目录（约 386 MB）
 *
 * 用法：
 *   node scripts/prepare-assets.mjs
 *   node scripts/prepare-assets.mjs --laya-dir /path/to/model-int8
 *   HF_ENDPOINT=https://huggingface.co node scripts/prepare-assets.mjs   # 换镜像源
 */
import { cp, mkdir, readdir, rename, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const HF_ENDPOINT = (process.env.HF_ENDPOINT ?? 'https://hf-mirror.com').replace(/\/+$/, '')

/** 翻译模型仓库（Xenova/opus-mt-zh-en 是 Helsinki-NLP/opus-mt-zh-en 的 ONNX 量化转换） */
const TRANSLATE_REPO = 'Xenova/opus-mt-zh-en'
const TRANSLATE_FILES = [
  'config.json',
  'generation_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'vocab.json',
  'special_tokens_map.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
]

/** public/model/ 必须具备的 4 个文件 */
const LAYA_FILES = ['encoder.onnx', 'head.onnx', 'tokenizer.json', 'rl_agent_config.json']

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/** 1. ORT 运行时：onnxruntime-web 的 dist 里就带着这些文件，直接复制 */
async function prepareRuntime() {
  const src = join(root, 'node_modules', 'onnxruntime-web', 'dist')
  if (!(await exists(src))) {
    throw new Error('找不到 node_modules/onnxruntime-web/dist，请先执行 npm install')
  }
  const dst = join(root, 'public', 'runtime')
  await mkdir(dst, { recursive: true })

  const names = (await readdir(src)).filter((n) => /^ort-wasm-simd-threaded.*\.(mjs|wasm)$/.test(n))
  if (names.length === 0) throw new Error(`在 ${src} 里没找到 ort-wasm-* 运行时文件`)

  let total = 0
  for (const name of names) {
    const target = join(dst, name)
    const source = join(src, name)
    // 大小一致就跳过，重复执行时不必再拷 86 MB
    if ((await exists(target)) && (await stat(target)).size === (await stat(source)).size) continue
    await cp(source, target, { force: true })
    total += (await stat(source)).size
  }
  console.log(`[1/3] ORT 运行时 -> public/runtime/ （本次复制 ${names.length} 个文件，新写入 ${mb(total)}）`)
}

/** 2. 翻译模型：从 HF 镜像下载（先写 .tmp 再改名，避免中断留下半个文件） */
async function prepareTranslate() {
  const dst = join(root, 'public', 'translate', 'opus-mt-zh-en')
  await mkdir(join(dst, 'onnx'), { recursive: true })

  let total = 0
  for (const file of TRANSLATE_FILES) {
    const target = join(dst, file)
    if (await exists(target)) continue
    const url = `${HF_ENDPOINT}/${TRANSLATE_REPO}/resolve/main/${file}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`下载失败 ${res.status} ${url}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const tmp = `${target}.tmp`
    await writeFile(tmp, buf)
    await rename(tmp, target)
    total += buf.length
    console.log(`      ${file} ${mb(buf.length)}`)
  }
  console.log(`[2/3] 翻译模型 -> public/translate/${TRANSLATE_REPO.split('/')[1]}/ （本次下载 ${mb(total)}）`)
}

/** 3. Laya 模型：只检查/复制，不负责导出（导出需要 Python + torch，见 README） */
async function prepareLayaModel(layaDir) {
  const dst = join(root, 'public', 'model')

  if (layaDir) {
    if (!(await exists(layaDir))) throw new Error(`--laya-dir 指向的目录不存在：${layaDir}`)
    await mkdir(dst, { recursive: true })
    let total = 0
    for (const file of LAYA_FILES) {
      const source = join(layaDir, file)
      if (!(await exists(source))) throw new Error(`${layaDir} 里缺少 ${file}`)
      const target = join(dst, file)
      if ((await exists(target)) && (await stat(target)).size === (await stat(source)).size) continue
      await cp(source, target, { force: true })
      total += (await stat(source)).size
    }
    console.log(`[3/3] Laya 模型 -> public/model/ （从 ${layaDir} 复制 ${mb(total)}）`)
    return
  }

  const missing = []
  for (const file of LAYA_FILES) {
    const target = join(dst, file)
    if (!(await exists(target))) missing.push(file)
  }
  if (missing.length === 0) {
    const sizes = await Promise.all(LAYA_FILES.map(async (f) => (await stat(join(dst, f))).size))
    console.log(`[3/3] Laya 模型已就绪：public/model/ 合计 ${mb(sizes.reduce((a, b) => a + b, 0))}`)
    return
  }

  console.log(`[3/3] 还缺 Laya 模型：public/model/ 里缺少 ${missing.join(', ')}`)
  console.log(`
   二选一：
   A. 用已有目录（例如之前导出过的 model-int8）：
        node scripts/prepare-assets.mjs --laya-dir <你的 model-int8 目录>
   B. 自行导出 + 量化（需要 Python 3.12 + torch，一次性）：
        git clone https://github.com/NandhaKishorM/laya.git
        cd laya && py -3.12 -m venv .venv && .venv\\Scripts\\Activate.ps1
        python -m pip install --upgrade pip && pip install -e ".[onnx]" && pip install onnxscript
        $env:HF_ENDPOINT="https://hf-mirror.com"; $env:HF_HUB_DISABLE_XET="1"
        python laya-ts/scripts/export_onnx.py --repo convaiinnovations/laya --subfolder multilingual --out-dir ./model
        python quantize_int8.py --in-dir ./model --out-dir ./model-int8      # 脚本已随本仓库提供
        python merge_head.py                                                 # head 合并为单文件
       把 model-int8 下的 4 个文件放进 public/model/，或用上面的 --laya-dir 指定
`)
}

const args = process.argv.slice(2)
const layaDirIndex = args.indexOf('--laya-dir')
const layaDir = layaDirIndex >= 0 ? args[layaDirIndex + 1] : null

try {
  await prepareRuntime()
  await prepareTranslate()
  await prepareLayaModel(layaDir)
  console.log('\n资源准备完成。接下来：npm run dev（开发）或 npm run build（生产构建）。')
} catch (error) {
  console.error(`\n资源准备失败：${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
