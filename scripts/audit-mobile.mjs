/**
 * 在多个真机宽度下审计响应式表现：横向溢出、溢出元素、触摸目标、过小字号。
 * 用法：node scripts/audit-mobile.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const target = join(root, 'index.html')
const probe = join(here, 'audit-mobile.html')

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]

const WIDTHS = [320, 360, 390, 414, 430, 768, 1024]

const browser = EDGE.find((p) => existsSync(p))
if (!browser) throw new Error('没找到 Edge/Chrome')
if (!existsSync(target)) throw new Error(`找不到 ${target}`)

const pageUrl = pathToFileURL(target).href + '?no-anim=1'
const profile = join(tmpdir(), `audit-mobile-${process.pid}`)

console.log('宽度  视口  内容宽  溢出   问题')
console.log('----  ----  ------  -----  ----')

let problems = 0

for (const width of WIDTHS) {
  const url = `${pathToFileURL(probe).href}?w=${width}&src=${encodeURIComponent(pageUrl)}`
  const res = spawnSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profile}`,
      '--window-size=1600,1200',
      '--virtual-time-budget=6000',
      '--allow-file-access-from-files',
      '--dump-dom',
      url,
    ],
    { stdio: 'pipe', encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  )

  const line = (res.stdout || '').match(/MOBILE-AUDIT=([^<]*)</)
  if (!line) {
    console.log(`${String(width).padEnd(6)}审计失败（没取到探针输出）`)
    problems++
    continue
  }
  const data = Object.fromEntries(
    line[1]
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const i = s.indexOf('=');
        return [s.slice(0, i), s.slice(i + 1)];
      })
  )

  const overflow = Number(data.OVERFLOW || 0)
  const bad = []
  if (overflow > 0) { bad.push(`溢出 ${overflow}px`); problems++ }
  if (data.OFFENDERS && data.OFFENDERS !== 'none') bad.push(data.OFFENDERS)
  if (data.SMALL_TARGETS && data.SMALL_TARGETS !== 'none') bad.push(`小触摸目标 ${data.SMALL_TARGETS}`)
  if (data.TINY_TEXT && data.TINY_TEXT !== 'none') bad.push(`小字号 ${data.TINY_TEXT}`)

  console.log(
    `${String(width).padEnd(6)}${String(data.VW || '?').padEnd(6)}${String(data.SCROLLW || '?').padEnd(8)}` +
      `${String(overflow).padEnd(7)}${bad.length ? bad.join(' ; ') : '正常'}`
  )
}

console.log(problems === 0 ? '\n横向溢出：无' : `\n横向溢出问题：${problems} 处`)
