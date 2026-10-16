/**
 * 生成"发出去就能看"的单文件：把 index.html 复制成中文名，方便直接发微信/QQ/邮件。
 *
 * 这个文件必须与 index.html 逐字节一致（测试里会校验），所以只做复制，不做任何改写。
 * 用法：node scripts/build-sendable.mjs
 */
import { copyFileSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const src = join(root, 'index.html')
const out = join(root, '君骄数智-首页预览.html')

copyFileSync(src, out)

const bytes = statSync(out).size
const html = readFileSync(out, 'utf8')

// 自查：单文件不得有任何外部请求
const stripped = html
  .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, '')
  .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, '')
  .replace(/data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/gi, '')
const externals = [...stripped.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/gi)]
  .map((m) => m[1])
  .filter((u) => !/^https:\/\/github\.com\/QuantumNous\/new-api/.test(u))

console.log(`已生成：君骄数智-首页预览.html  ${(bytes / 1024).toFixed(1)} KB`)
console.log(`外部请求：${externals.length === 0 ? '无（断网可开）' : externals.join(', ')}`)
console.log('双击即可在浏览器打开，直接发给对方也行。')
