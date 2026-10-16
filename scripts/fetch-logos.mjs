/**
 * 从 @lobehub/icons-static-svg (MIT) 拉取模型品牌 SVG，落到 assets/logos/。
 * 只下载存在的，并把每个文件的大小/是否单色打印出来。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const VERSION = '1.95.1'
const BASE = `https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@${VERSION}/icons`
const OUT = join(process.cwd(), 'assets', 'logos')

/** 想要展示的模型 → 候选 slug（取第一个能下到的） */
const WANTED = [
  { label: 'OpenAI', slugs: ['openai'] },
  { label: 'Claude', slugs: ['claude'] },
  { label: 'Gemini', slugs: ['gemini', 'google'] },
  { label: 'DeepSeek', slugs: ['deepseek'] },
  { label: '通义千问', slugs: ['qwen'] },
  { label: '智谱 GLM', slugs: ['chatglm', 'zhipu'] },
  { label: '腾讯混元', slugs: ['hunyuan', 'tencent'] },
  { label: 'MiniMax', slugs: ['minimax'] },
  { label: 'Kimi', slugs: ['moonshot', 'kimi'] },
  { label: '豆包', slugs: ['doubao', 'bytedance'] },
  { label: '文心一言', slugs: ['wenxin', 'baidu'] },
  { label: '阶跃星辰', slugs: ['stepfun'] },
]

mkdirSync(OUT, { recursive: true })

const results = []
for (const item of WANTED) {
  let saved = null
  for (const slug of item.slugs) {
    const url = `${BASE}/${slug}.svg`
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const svg = await res.text()
      if (!svg.trim().startsWith('<svg')) continue
      const file = join(OUT, `${slug}.svg`)
      writeFileSync(file, svg, 'utf8')
      const colors = new Set(
        (svg.match(/(?:fill|stroke)="(#[0-9a-fA-F]{3,8}|[a-z]+)"/g) || [])
          .map((s) => s.split('=')[1].replace(/"/g, ''))
          .filter((c) => c !== 'none' && c !== 'currentColor')
      )
      saved = { slug, bytes: svg.length, colors: [...colors].slice(0, 4) }
      break
    } catch {
      continue
    }
  }
  results.push({ label: item.label, ...(saved ?? { slug: '—', bytes: 0, colors: [] }) })
}

console.log('模型'.padEnd(12), 'slug'.padEnd(12), '字节'.padStart(7), '  写死的颜色')
for (const r of results) {
  console.log(
    r.label.padEnd(12),
    String(r.slug).padEnd(12),
    String(r.bytes).padStart(7),
    '  ' + (r.colors.length ? r.colors.join(' ') : '（无写死颜色，可直接 currentColor）')
  )
}
const missing = results.filter((r) => r.bytes === 0).map((r) => r.label)
if (missing.length) console.log('\n没下到:', missing.join(', '))
