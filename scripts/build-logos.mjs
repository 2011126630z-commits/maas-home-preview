/**
 * 把 assets/logos/*.svg 内联进 index.html 的 LOGOS 区：
 *  - 每个品牌存成一个 <symbol>，只放一份路径数据
 *  - 滚动的两遍只用 <use> 引用，第二遍对读屏隐藏
 * 这样页面仍是零外部请求（不挂 CDN、不引 <img>）。
 *
 * 图标来源：@lobehub/icons-static-svg (MIT)，商标归各自所有者，
 * 这里只用于"已接入的模型"这一事实性列举。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const indexPath = join(root, 'index.html')
const logoDir = join(root, 'assets', 'logos')

/** 展示顺序与显示名（改这里就能换列表） */
const DISPLAY = [
  { slug: 'chatglm', name: '智谱 GLM' },
  { slug: 'hunyuan', name: '腾讯混元' },
  { slug: 'minimax', name: 'MiniMax' },
  { slug: 'deepseek', name: 'DeepSeek' },
  { slug: 'moonshot', name: 'Kimi' },
  { slug: 'qwen', name: '通义千问' },
  { slug: 'doubao', name: '豆包' },
  { slug: 'wenxin', name: '文心一言' },
  { slug: 'stepfun', name: '阶跃星辰' },
  { slug: 'openai', name: 'OpenAI' },
  { slug: 'claude', name: 'Claude' },
  { slug: 'gemini', name: 'Gemini' },
]

/** 取出 <svg> 的属性 viewBox 与内部内容，丢掉 title（可访问名用可见文字） */
function toSymbol(slug, raw) {
  const openTag = raw.match(/<svg\b[^>]*>/i)
  if (!openTag) throw new Error(`${slug}.svg 里没有 <svg>`)
  const viewBox = (openTag[0].match(/viewBox="([^"]+)"/) || [])[1]
  if (!viewBox) throw new Error(`${slug}.svg 缺少 viewBox`)
  const inner = raw
    .slice(openTag.index + openTag[0].length)
    .replace(/<\/svg>\s*$/i, '')
    .replace(/<title\b[\s\S]*?<\/title>/gi, '')
    .trim()
  return { viewBox, inner }
}

const symbols = []
const cells = []
let colored = 0
for (const { slug, name } of DISPLAY) {
  // 优先用官方彩色版；OpenAI / Kimi 这类本身就是单色品牌没有彩色版，用单色即可
  const colorFile = join(logoDir, `${slug}-color.svg`)
  const monoFile = join(logoDir, `${slug}.svg`)
  const file = existsSync(colorFile) ? colorFile : monoFile
  if (!existsSync(file)) {
    console.warn(`跳过 ${slug}：assets/logos 里没有对应 svg`)
    continue
  }
  if (file === colorFile) colored++
  const { viewBox, inner } = toSymbol(slug, readFileSync(file, 'utf8'))
  // Claude 官方 logo 的暖陶色会被 lint 当成"AI 助手配色"，这里说明它是品牌资产而不是页面配色
  const needsIgnore = /#d97757|#f0eee6/i.test(inner)
  symbols.push(
    `    <symbol id="lg-${slug}" viewBox="${viewBox}">${inner}</symbol>` +
      (needsIgnore
        ? '<!-- taste-skill-ignore 这是 Claude 官方 logo 的品牌色，不是页面的配色选择 -->'
        : '')
  )
  cells.push(
    `        <div class="model-cell" data-anim><svg aria-hidden="true"><use href="#lg-${slug}"></use></svg><span>${name}</span></div>`
  )
}

const block = [
  '      <!-- LOGOS:BEGIN 由 scripts/build-logos.mjs 生成，不要手改这段 -->',
  '      <svg class="logo-defs" aria-hidden="true" focusable="false"><defs>',
  ...symbols,
  '      </defs></svg>',
  '      <div class="marquee">',
  '        <div class="marquee-track">',
  '          <!-- 第一遍：对读屏可见，模型名就在各自标记下方 -->',
  ...cells,
  '          <!-- 第二遍：只为让滚动无缝，对读屏隐藏；不加入场动画，避免把 3D 倾斜覆盖掉 -->',
  ...cells.map((line) =>
    line
      .replace('<div class="model-cell"', '<div class="model-cell" aria-hidden="true"')
      .replace(' data-anim', '')
  ),
  '        </div>',
  '      </div>',
  '      <!-- LOGOS:END -->',
].join('\n')

const html = readFileSync(indexPath, 'utf8')
const start = html.indexOf('<!-- LOGOS:BEGIN')
const end = html.indexOf('<!-- LOGOS:END -->')
if (start === -1 || end === -1) throw new Error('index.html 里找不到 LOGOS 标记')

// 连同标记一起替换，保证重复执行结果一致
const next = html.slice(0, start) + block.slice('      '.length) + html.slice(end + '<!-- LOGOS:END -->'.length)
writeFileSync(indexPath, next, 'utf8')

console.log(`已写入 ${symbols.length} 个模型标记（其中 ${colored} 个用官方彩色版），滚动两遍，共 ${cells.length * 2} 个单元格`)
console.log('列表：' + DISPLAY.map((d) => d.name).join(' · '))
