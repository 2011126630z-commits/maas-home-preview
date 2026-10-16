/** 探测 @lobehub/icons-static-svg 里这 12 个模型是否有官方彩色版（*-color.svg），有就一并下载。 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const VERSION = '1.95.1'
const BASE = `https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@${VERSION}/icons`
const OUT = join(process.cwd(), 'assets', 'logos')

const SLUGS = [
  'chatglm', 'hunyuan', 'minimax', 'deepseek', 'moonshot', 'qwen',
  'doubao', 'wenxin', 'stepfun', 'openai', 'claude', 'gemini',
]

mkdirSync(OUT, { recursive: true })

for (const slug of SLUGS) {
  const url = `${BASE}/${slug}-color.svg`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.log('无彩色版  ', slug)
      continue
    }
    const svg = await res.text()
    if (!svg.trim().startsWith('<svg')) {
      console.log('内容异常  ', slug)
      continue
    }
    writeFileSync(join(OUT, `${slug}-color.svg`), svg, 'utf8')
    console.log('有彩色版  ', slug, svg.length, '字节')
  } catch (error) {
    console.log('请求失败  ', slug, error.message.slice(0, 40))
  }
}
