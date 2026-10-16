/**
 * 首页预览静态验收（node:test）
 *
 * 这些断言保护的是对外承诺的用户可见契约：
 *  - 单文件自包含（除合规署名链接外无任何外部请求）
 *  - 导航沿用 new-api 现成标准文案，不自行改写
 *  - 页脚保留 AGPLv3 第 7 条要求的署名句子与原项目链接
 *  - 无脚本环境下内容不会因入场动画被隐藏
 *  - 视觉语言守则（无渐变、静置无阴影、无玻璃、无渐变文字、字号只有五档）
 *
 * taste-skill 的 lint.mjs / inspect.mjs 关卡跑在 skill 侧，不在这里重复；
 * 这里守住的是不依赖浏览器就能判定的那部分契约。
 */
import { readFileSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const here = dirname(fileURLToPath(import.meta.url))
const indexPath = join(here, '..', 'index.html')
const raw = readFileSync(indexPath, 'utf8')

const ORIGINAL_PROJECT_URL = 'https://github.com/QuantumNous/new-api'
const NOTICE_SENTENCE =
  'Frontend design and development by New API contributors.'
const NAV_LABELS = ['控制台', '模型广场', '排行榜', '文档', '关于']

/** 去掉注释、<script>、<style>，只留下结构，供标签扫描使用 */
function structureOnly(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>')
}

function styleBlock(html) {
  return (html.match(/<style\b[^>]*>[\s\S]*?<\/style>/i) || [''])[0]
}

function scriptBlock(html) {
  return (html.match(/<script\b[^>]*>[\s\S]*?<\/script>/i) || [''])[0]
}

/** 去掉 <pre>/<code> 里的示例文本：那是展示内容，不构成请求，但 src/href/@import 仍会被查 */
function withoutCodeSamples(html) {
  return html
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, '<pre></pre>')
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, '<code></code>')
}

function collectExternalUrls(html) {
  const found = new Set()
  const re = /(?:https?:)?\/\/[^\s"'`<>)\]}]+/g
  let match
  while ((match = re.exec(html)) !== null) found.add(match[0])
  return [...found]
}

function collectAttributeValues(html, attribute) {
  const values = []
  const re = new RegExp(attribute + '\\s*=\\s*"([^"]*)"', 'gi')
  let match
  while ((match = re.exec(html)) !== null) values.push(match[1])
  return values
}

test('文件存在且是可交付尺寸', () => {
  assert.ok(existsSync(indexPath), 'index.html 必须存在')
  const size = statSync(indexPath).size
  assert.ok(size > 20 * 1024, `index.html 过小（${size} 字节），疑似不是完整预览`)
})

test('文档基础：doctype、语言、视口、标题', () => {
  assert.match(raw, /^<!doctype html>/i, '必须以 doctype 开头')
  assert.match(raw, /<html[^>]*lang="zh-CN"/i, '必须声明 lang="zh-CN"')
  assert.match(
    raw,
    /<meta[^>]*name="viewport"[^>]*width=device-width/i,
    '必须有响应式 viewport'
  )
  assert.match(raw, /<title>[^<]*君骄数智[^<]*<\/title>/, '标题必须包含站名')
})

test('只有一个 h1，且短语之间断行、不在词中断开', () => {
  const h1s = raw.match(/<h1\b/gi) ?? []
  assert.equal(h1s.length, 1, '页面只能有一个 h1')
  const h1 = raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)[1]
  assert.match(h1, /接入所有大模型/, 'h1 必须包含主标语')
  assert.match(
    h1,
    /class="nb">接入所有大模型/,
    '主标语必须包在 nowrap 组里，避免中文在词中断行'
  )
})

test('零外部依赖：除合规署名链接外没有外部请求', () => {
  // 允许：SVG XML 命名空间（非网络请求）、RFC 2606 保留示例域名（仅作文案）、
  // 以及合规署名指向的原项目链接。
  const isAllowedHost = (host) =>
    host === 'www.w3.org' || host === 'example.com' || host.endsWith('.example.com')

  const offenders = collectExternalUrls(withoutCodeSamples(raw)).filter((url) => {
    if (url === ORIGINAL_PROJECT_URL) return false
    const normalized = url.startsWith('//') ? `https:${url}` : url
    let host
    try {
      host = new URL(normalized).hostname
    } catch {
      return true
    }
    return !isAllowedHost(host)
  })

  assert.deepEqual(
    offenders,
    [],
    `存在外部请求，单文件预览必须自包含：${offenders.join(', ')}`
  )

  for (const url of collectExternalUrls(withoutCodeSamples(raw))) {
    if (!url.includes('github.com')) continue
    assert.equal(url, ORIGINAL_PROJECT_URL, `github.com 只允许用作署名链接：${url}`)
  }

  for (const attr of ['src', 'srcset']) {
    for (const value of collectAttributeValues(raw, attr)) {
      assert.ok(
        value.startsWith('data:') || value === '',
        `${attr} 不允许引用外部资源：${value}`
      )
    }
  }

  assert.doesNotMatch(raw, /@import\s+url\(/i, '不允许 @import 外部样式')
  assert.doesNotMatch(raw, /url\(\s*['"]?https?:/i, 'CSS 中不允许 url(http...)')
  assert.doesNotMatch(raw, /<link[^>]*href="https?:/i, '不允许通过 link 加载外部资源')
})

test('导航沿用 new-api 现成文案，顺序与用词一致', () => {
  const nav = raw.match(/<nav class="nav"[\s\S]*?<\/nav>/i)
  assert.ok(nav, '必须存在桌面端主导航')

  const labels = [...nav[0].matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map((m) =>
    m[1].trim()
  )
  assert.deepEqual(labels, NAV_LABELS, '导航文案必须与 new-api 标准文案一致')
})

test('合规署名：句子原文 + 原项目可见链接', () => {
  assert.ok(
    raw.includes(NOTICE_SENTENCE),
    `必须逐字保留 NOTICE 句子：${NOTICE_SENTENCE}`
  )
  assert.ok(
    raw.includes(`href="${ORIGINAL_PROJECT_URL}"`),
    '必须保留指向原项目的可见链接'
  )
  assert.match(
    raw,
    new RegExp(`<a[^>]*href="${ORIGINAL_PROJECT_URL}"[^>]*>\\s*New API\\s*</a>`),
    '原项目链接必须是可点击的锚点'
  )
})

test('站名出现在标题、顶栏与页脚', () => {
  const count = raw.split('君骄数智').length - 1
  assert.ok(count >= 3, `站名出现 ${count} 次，至少应覆盖标题/顶栏/页脚`)
})

test('无脚本环境不丢内容：入场动画必须挂在 .js 之下', () => {
  assert.match(raw, /<noscript>/, '必须提供 noscript 提示')
  assert.match(
    styleBlock(raw),
    /\.js \[data-anim\]\s*\{/,
    '入场动画必须限定在 .js 作用域内，否则脚本被剥离后内容不可见'
  )
  assert.match(scriptBlock(raw), /classList\.add\('js'\)/, '必须由脚本自行加 .js 标记')
})

test('入场动画有兜底：IO 未触发或静态出图时内容必须可见', () => {
  const script = scriptBlock(raw)
  assert.match(script, /function revealAll\(\)/, '必须存在把全部条目置为可见的兜底函数')
  assert.match(
    script,
    /if \(!fired\) revealAll\(\)/,
    'IO 未触发时必须有定时兜底，避免内容永久不可见'
  )
  assert.match(script, /no-anim=1/, '必须支持 ?no-anim=1 静态模式，供出图与内嵌使用')
})

test('视觉语言守则：无渐变、静置无阴影、无玻璃、无渐变文字', () => {
  const css = styleBlock(raw)
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|conic-gradient/i, '不许用渐变当填充')
  assert.doesNotMatch(css, /background-clip\s*:\s*text/i, '不许用渐变文字，强调靠字号与字重')
  assert.doesNotMatch(css, /backdrop-filter/i, '不许用玻璃/背景模糊')
  assert.doesNotMatch(css, /box-shadow/i, '静置元素不挂阴影')
  assert.doesNotMatch(css, /text-shadow/i, '不许用文字阴影')
})

test('字号只有五档，正文用全墨', () => {
  const css = styleBlock(raw)
  for (const token of ['--t-display', '--t-title', '--t-lead', '--t-body', '--t-small']) {
    assert.ok(css.includes(token), `必须定义字号档 ${token}`)
  }
  const sizes = new Set([...css.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1].trim()))
  const allowed = new Set([
    'var(--t-display)',
    'var(--t-title)',
    'var(--t-lead)',
    'var(--t-body)',
    'var(--t-small)',
    'inherit',
  ])
  const strays = [...sizes].filter((size) => !allowed.has(size))
  assert.deepEqual(strays, [], `出现五档之外的字号：${strays.join(', ')}`)

  assert.match(css, /--ink:\s*#212121/i, '正文必须用全墨色')
})

test('交互元素可访问：按钮均有可见文本或 aria-label', () => {
  const buttons = [...raw.matchAll(/<button\b[\s\S]*?<\/button>/gi)]
  assert.ok(buttons.length > 0, '页面上应存在按钮')
  for (const [markup] of buttons) {
    const hasAria = /aria-label\s*=\s*"[^"]+"/i.test(markup)
    const text = markup.replace(/<[^>]*>/g, '').trim()
    assert.ok(hasAria || text.length > 0, `按钮缺少可访问名称：${markup.slice(0, 60)}`)
  }
  assert.match(raw, /role="status"/, '提示区必须使用 role="status"')
  assert.match(raw, /class="skip-link"/, '必须提供跳转到主内容链接')
  assert.match(raw, /<main id="main">/, '必须有可聚焦的 main 目标')
})

test('结构合法：标签闭合且 id 唯一', () => {
  const html = structureOnly(raw)
  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
    'meta', 'param', 'source', 'track', 'wbr', 'path', 'circle', 'rect',
    'line', 'polyline', 'polygon', 'ellipse', 'stop', 'use', 'text',
  ])

  const stack = []
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g
  let match
  while ((match = tagRe.exec(html)) !== null) {
    const isClose = match[1] === '/'
    const name = match[2].toLowerCase()
    const rest = match[3]
    const selfClosed = /\/\s*$/.test(rest)
    if (voidTags.has(name) || selfClosed) continue
    if (isClose) {
      const open = stack.pop()
      assert.equal(open, name, `标签闭合不匹配：期望 </${open}>，实到 </${name}>`)
    } else {
      stack.push(name)
    }
  }
  assert.deepEqual(stack, [], `存在未闭合标签：${stack.join(', ')}`)

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
  assert.deepEqual(duplicates, [], `id 重复：${[...new Set(duplicates)].join(', ')}`)
})

test('不引用第三方素材：不加载远程 logo、字体或图片', () => {
  assert.doesNotMatch(raw, /<img\b/i, '不应使用 img 远程素材（图标已内联为 SVG）')
  assert.doesNotMatch(raw, /fonts\.googleapis|fonts\.gstatic/i, '不应加载远程字体')
  assert.match(raw, /data:"?\s|data:/, '内联资源应使用 data: URI')
})

test('演示数据必须就地标注，不冒充真实指标', () => {
  const markers = raw.match(/演示数据/g) ?? []
  assert.ok(markers.length >= 3, `演示数据标注过少（${markers.length} 处），示例数值必须就地标注`)
  assert.doesNotMatch(
    raw,
    /\d+\s*%\s*(可用性|成功率)|99\.\d+%|全年无故障/,
    '不许把编造的业务指标写成事实'
  )
})
