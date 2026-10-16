/**
 * 用本机 Edge 的无头模式出多尺寸截图，作为交付证据（不安装任何依赖）。
 *   npm run shots
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
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
 * 尺寸说明：
 *  - height 省略（或 fill: true）= 先量真实内容高度再按该高度截图，避免写死的高度过期后被截断。
 *    量的方式见 scripts/measure.html（宽度精确的 iframe + 读 scrollHeight）。
 *  - emulate: true —— Windows 下无头浏览器开不出窄于 ~500px 的窗口，直接截图会把 500px 的
 *    排版裁成 390px，看起来"右边被切掉"。所以把页面放进一个宽度精确等于目标宽度的 iframe 里
 *    再截外层，等价于真实设备视口（媒体查询、100vw、position:fixed 都按 iframe 视口计算）。
 *
 * CHROME_PX：实测 headless=new 里 --window-size 含约 110px 的"浏览器外壳"，
 * 也就是视口 = window - 110。不加这个补偿，长图底部会被悄悄裁掉一截（曾把页脚署名裁没）。
 */
const CHROME_PX = 130

const SHOTS = [
  { name: 'desktop-1440', width: 1440, height: 1000 },
  { name: 'desktop-full-1440', width: 1440, fill: true },
  { name: 'tablet-768', width: 768, fill: true },
  { name: 'mobile-390', width: 390, fill: true, emulate: true },
  { name: 'state-sent', width: 1440, height: 1000, query: '&demo=sent' },
]

const measurePage = join(here, 'measure.html')

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

/** 用 measure.html 量出目标页在指定宽度下的真实内容高度 */
function measureHeight(width, shotUrl) {
  const probe = `${pathToFileURL(measurePage).href}?w=${width}&src=${encodeURIComponent(shotUrl)}`
  const result = spawnSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profileDir}`,
      '--window-size=1600,1800',
      '--virtual-time-budget=6000',
      '--allow-file-access-from-files',
      '--dump-dom',
      probe,
    ],
    { stdio: 'pipe', encoding: 'utf8' }
  )
  const match = (result.stdout || '').match(/H=(\d+)/)
  if (!match) return null
  return Number(match[1])
}

for (const shot of SHOTS) {
  if (shot.fill && !shot.height) {
    const measured = measureHeight(shot.width, pageUrl + (shot.query ?? ''))
    if (!measured) {
      failures.push(`${shot.name}: 量高度失败，已跳过（可显式指定 height）`)
      continue
    }
    shot.height = measured + 12
    console.log(`· ${shot.name} 量得内容高度 ${measured}px → 按 ${shot.height}px 截图`)
  }

  const outFile = join(outDir, `${shot.name}.png`)
  const shotUrl = pageUrl + (shot.query ?? '')

  // 窄视口：套一层精确宽度的 iframe，避免被 Windows 的最小窗口宽度带偏
  let targetUrl = shotUrl
  let frameFile = null
  if (shot.emulate) {
    frameFile = join(outDir, `.frame-${shot.name}.html`)
    writeFileSync(
      frameFile,
      `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;overflow:hidden}
       iframe{display:block;border:0;width:${shot.width}px;height:${shot.height}px}</style>
       <iframe src="${shotUrl}" scrolling="no" title="${shot.name}"></iframe>`
    )
    targetUrl = pathToFileURL(frameFile).href
  }

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
      `--window-size=${shot.width},${shot.height + CHROME_PX}`,
      '--virtual-time-budget=3000',
      `--allow-file-access-from-files`,
      `--screenshot=${outFile}`,
      targetUrl,
    ],
    { stdio: 'pipe', encoding: 'utf8' }
  )

  if (frameFile) rmSync(frameFile, { force: true })

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
      `${shot.emulate ? ' (真视口 emulation)' : ''}` +
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
