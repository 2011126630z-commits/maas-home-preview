/**
 * 用本机 Edge 的无头模式出多尺寸截图，作为交付证据（不安装任何依赖）。
 *   npm run shots
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const target = join(root, 'index.html')
const outDir = join(root, 'shots')

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

/**
 * 高度说明：full 系列的高度是本页当前真实内容高度（1440→5108、768→5337、390→5370 实测），
 * 改版后如内容变长，需重新实测并更新，避免长图被截断。
 */
const SHOTS = [
  { name: 'desktop-1440', width: 1440, height: 1000 },
  { name: 'desktop-full-1440', width: 1440, height: 5150 },
  { name: 'tablet-768', width: 768, height: 5380 },
  { name: 'mobile-390', width: 390, height: 5400 },
  { name: 'state-sent', width: 1440, height: 1000, query: '&demo=sent' },
]

function findBrowser() {
  const found = EDGE_CANDIDATES.find((path) => existsSync(path))
  if (!found) {
    throw new Error(
      '未找到 Edge/Chrome 可执行文件，无法自动截图。请手动截图后放入 shots/。'
    )
  }
  return found
}

function pngSize(file) {
  const buffer = readFileSync(file)
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

const browser = findBrowser()
if (!existsSync(target)) throw new Error(`找不到 ${target}`)
mkdirSync(outDir, { recursive: true })

const pageUrl = pathToFileURL(target).href + '?no-anim=1'
const profileDir = join(tmpdir(), `junjiao-shots-${process.pid}`)
const failures = []

for (const shot of SHOTS) {
  const outFile = join(outDir, `${shot.name}.png`)
  const shotUrl = pageUrl + (shot.query ?? '')
  const result = spawnSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--force-device-scale-factor=1',
      `--user-data-dir=${profileDir}`,
      `--window-size=${shot.width},${shot.height}`,
      '--virtual-time-budget=3000',
      `--screenshot=${outFile}`,
      shotUrl,
    ],
    { stdio: 'pipe', encoding: 'utf8' }
  )

  if (!existsSync(outFile)) {
    failures.push(`${shot.name}: 未生成截图（exit ${result.status}）`)
    const detail = (result.stderr || '').trim().split('\n').slice(-3).join(' | ')
    if (detail) failures.push(`  ${detail}`)
    continue
  }

  const size = pngSize(outFile)
  const bytes = statSync(outFile).size
  console.log(
    `✓ ${shot.name.padEnd(18)} ${size ? `${size.width}x${size.height}` : '?'}` +
      `  ${(bytes / 1024).toFixed(0)} KB  →  shots/${shot.name}.png`
  )
}

rmSync(profileDir, { recursive: true, force: true })

if (failures.length > 0) {
  console.error('\n截图失败：')
  for (const line of failures) console.error(`  ${line}`)
  process.exit(1)
}

console.log(`\n完成：${SHOTS.length} 张截图已写入 shots/`)
