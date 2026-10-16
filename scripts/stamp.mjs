/**
 * 给页脚盖一个构建时间戳，用来一眼判断"我打开的是不是最新版"。
 * 客户/老板打开的是 Pages 链接，浏览器会缓存 HTML（Pages 默认 10 分钟），
 * 有这行时间戳就不用再猜了。
 *
 * 用法：node scripts/stamp.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const file = join(here, '..', 'index.html')

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const stamp =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
  `${pad(now.getHours())}:${pad(now.getMinutes())}`

const html = readFileSync(file, 'utf8')
const pattern = /(<span class="foot-stamp">)([^<]*)(<\/span>)/
if (!pattern.test(html)) throw new Error('index.html 里找不到 .foot-stamp')

const next = html.replace(pattern, (_, a, __, c) => `${a}预览版 ${stamp}${c}`)
writeFileSync(file, next, 'utf8')
console.log(`页脚时间戳已更新为：预览版 ${stamp}`)
