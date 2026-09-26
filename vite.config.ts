import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// 统一 onnxruntime-web 实例：laya-ts 与 transformers.js 内部的 import 都解析到本工程的副本，
// 这样 src/lib/laya.ts / translate.ts 里的 wasmPaths 才作用于同一个模块实例。
const ortWeb = fileURLToPath(
  new URL('./node_modules/onnxruntime-web/dist/ort.mjs', import.meta.url),
)

// https://vite.dev/config/
export default defineConfig({
  // 相对路径，便于后续在 Capacitor WebView（file/https scheme）中加载资源
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      // 顺序敏感：更具体的子路径必须放前面，否则会被通用规则拼成 .../ort.mjs/webgpu
      // （transformers.js 用的是 onnxruntime-web/webgpu）
      { find: 'onnxruntime-web/webgpu', replacement: ortWeb },
      { find: 'onnxruntime-web', replacement: ortWeb },
    ],
  },
  optimizeDeps: {
    // 这些包内部动态 import onnxruntime-web，交给打包器按上面的 alias 处理
    exclude: ['onnxruntime-web', 'laya-ts', '@huggingface/transformers'],
  },
  build: {
    target: 'esnext',
  },
})
