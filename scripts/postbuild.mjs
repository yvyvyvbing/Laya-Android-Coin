/**
 * Post-build cleanup: remove duplicated ORT wasm assets.
 *
 * Vite/Rolldown emits the wasm files referenced inside ort.mjs into dist/assets/,
 * but we override `ort.env.wasm.wasmPaths` to load from dist/runtime/ instead.
 * The assets copies are never fetched, so delete them to shrink the bundle (~85MB).
 */
import { rmSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = join(root, 'dist', 'assets')

let removed = 0
for (const name of readdirSync(assetsDir)) {
  if (name.startsWith('ort-wasm') && name.endsWith('.wasm')) {
    rmSync(join(assetsDir, name), { force: true })
    removed++
    console.log('removed unused asset:', name)
  }
}
console.log(`postbuild: removed ${removed} duplicated wasm asset(s).`)
