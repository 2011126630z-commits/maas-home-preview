/**
 * 物理确定性验证：不依赖 rAF，直接调用页面导出的 __globeDebug 推进物理并读回位移。
 * 用法：node scripts/phys-verify.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const probe = join(here, 'phys-test.html')
const target = join(root, 'index.html')

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]
const browser = EDGE.find((p) => existsSync(p))
if (!browser) throw new Error('没找到 Edge/Chrome')

const inner = pathToFileURL(target).href + '?debug=globe&no-anim=1'
const url = `${pathToFileURL(probe).href}?src=${encodeURIComponent(inner)}`

const res = spawnSync(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--user-data-dir=${join(tmpdir(), `phys-${process.pid}`)}`,
    '--window-size=1400,1000',
    '--virtual-time-budget=6000',
    '--allow-file-access-from-files',
    '--dump-dom',
    url,
  ],
  { stdio: 'pipe', encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
)

const line = (res.stdout || '').match(/PHYS=([^<]*)</)
if (!line) {
  console.error('没取到物理输出。原始输出片段：')
  console.error((res.stdout || '').slice(0, 400))
  process.exit(1)
}

const parts = line[1].split('|').map((s) => s.trim())
console.log('爆炸回吸 · 确定性物理验证')
for (const p of parts) console.log('  ' + p)

const settleAt = parts.find((p) => p.startsWith('8s_位移='))
if (settleAt) {
  const v = Number(settleAt.split('=')[1])
  console.log(
    v < 0.005
      ? `\n✓ 8 秒后位移 ${v} ≈ 0，粒子完全回到球面`
      : `\n✗ 8 秒后仍有位移 ${v}，粒子没有完全归位`
  )
  process.exit(v < 0.005 ? 0 : 1)
}
