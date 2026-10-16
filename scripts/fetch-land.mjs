/**
 * 下载 world-atlas 的 110m 陆地数据（TopoJSON）。
 * world-atlas 由 Mike Bostock 维护（ISC），几何来自 Natural Earth（public domain）。
 * 用途：离线栅格化成一张极小的陆地掩码，供首页的旋转地球使用。
 * 不引入任何运行时外链——地球在浏览器里是画出来的。
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = join(process.cwd(), 'assets', 'geo')
const OUT = join(OUT_DIR, 'land-110m.json')

const SOURCES = [
  'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json',
  'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json',
]

mkdirSync(OUT_DIR, { recursive: true })

if (existsSync(OUT) && statSync(OUT).size > 10000) {
  console.log(`已存在，跳过下载：${OUT}（${statSync(OUT).size} 字节）`)
  process.exit(0)
}

for (const url of SOURCES) {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.log(`跳过 ${res.status} ${url}`)
      continue
    }
    const text = await res.text()
    const data = JSON.parse(text)
    if (data.type !== 'Topology' || !data.objects?.land) {
      console.log(`内容不像 TopoJSON 陆地数据，跳过 ${url}`)
      continue
    }
    writeFileSync(OUT, JSON.stringify(data), 'utf8')
    console.log(`已下载 → assets/geo/land-110m.json（${text.length} 字节）`)
    console.log('来源：' + url)
    process.exit(0)
  } catch (error) {
    console.log(`失败 ${url}：${error.message}`)
  }
}

throw new Error('全部数据源都取不到陆地数据')

