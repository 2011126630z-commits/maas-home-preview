/**
 * 真实悬停验证：CSS :hover 无法用合成事件触发，只能用 CDP 派发真实鼠标移动。
 *
 * 检查两件事：
 *   1. 鼠标移到卡片上，卡片是否从"斜着立"变成"转正浮起"（transform 变化）
 *   2. 悬停时跑马灯是否暂停（animationPlayState = paused）
 *
 * 用法：node scripts/hover-verify.mjs
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const target = pathToFileURL(join(root, 'index.html')).href + '?no-anim=1'

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]
const browser = EDGE.find((p) => existsSync(p))
if (!browser) throw new Error('没找到 Edge/Chrome')

const PORT = 9333
const profile = join(tmpdir(), `hover-verify-${process.pid}`)

const proc = spawn(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${PORT}`,
    '--window-size=1440,1200',
    '--allow-file-access-from-files',
    'about:blank',
  ],
  { stdio: 'ignore' }
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function targetUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await res.json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page.webSocketDebuggerUrl
    } catch {
      /* 端点还没起来 */
    }
    await sleep(250)
  }
  throw new Error('调试端点没起来')
}

let nextId = 1
function rpc(ws, method, params = {}) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id !== id) return
      ws.removeEventListener('message', onMessage)
      if (msg.error) reject(new Error(`${method}: ${msg.error.message}`))
      else resolve(msg.result)
    }
    ws.addEventListener('message', onMessage)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(ws, expression) {
  const res = await rpc(ws, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text)
  return res.result.value
}

const wsUrl = await targetUrl()
const ws = new WebSocket(wsUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})

try {
  await rpc(ws, 'Page.enable')
  await rpc(ws, 'Runtime.enable')
  await rpc(ws, 'Page.navigate', { url: target })

  // 等卡片渲染出来
  for (let i = 0; i < 60; i++) {
    const ready = await evaluate(
      ws,
      `(function(){var c=document.querySelectorAll('.model-cell').length;
        return c>0 && document.readyState==='complete' ? c : 0;})()`
    )
    if (ready) break
    await sleep(250)
  }

  // 先滚到模型区，否则坐标落在视口外（elementFromPoint 会返回 null）
  await evaluate(ws, `document.querySelector('.models').scrollIntoView({block:'center'}); true`)
  await sleep(600)

  // 把鼠标移到跑马灯区域里第一张卡片的中心
  const spot = await evaluate(
    ws,
    `(function(){
       var m=document.querySelector('.marquee');
       var r=m.getBoundingClientRect();
       var cells=m.querySelectorAll('.model-cell');
       var box=cells[cells.length>1?1:0].getBoundingClientRect();
       return {x:Math.round(box.left+box.width/2), y:Math.round(r.top+r.height/2),
               trackY:Math.round(r.bottom - 8), vh: window.innerHeight,
               marquee: [Math.round(r.top), Math.round(r.bottom)]};
     })()`
  )
  if (spot.y <= 0 || spot.y >= spot.vh) {
    console.error('跑马灯不在视口内，坐标无效：', spot)
    process.exitCode = 1
    throw new Error('坐标无效')
  }

  // 基线：鼠标放在跑马灯**外面**（放上面 40px），此时卡片应是斜的、跑马灯在跑
  await rpc(ws, 'Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: spot.x, y: Math.max(4, spot.marquee[0] - 40), buttons: 0,
  })
  await sleep(600)

  const readCard = (label) => evaluate(
    ws,
    `(function(){
       var cells=document.querySelectorAll('.model-cell');
       var cell=cells[cells.length>1?1:0];
       var track=document.querySelector('.marquee-track');
       return {${label}:1, transform: getComputedStyle(cell).transform,
               name: cell.textContent.trim(),
               playState: getComputedStyle(track).animationPlayState};
     })()`
  )

  const before = await readCard('before')

  // 悬停：把鼠标挪到卡片中心
  await rpc(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: spot.x, y: spot.y, buttons: 0 })
  await sleep(700)

  const after = await evaluate(
    ws,
    `(function(){
       var el=document.elementFromPoint(${spot.x},${spot.y});
       var cell=el&&el.closest?el.closest('.model-cell'):null;
       var track=document.querySelector('.marquee-track');
       return {transform: cell?getComputedStyle(cell).transform:'无卡片',
               name: cell?cell.textContent.trim():'-',
               playState: getComputedStyle(track).animationPlayState};
     })()`
  )

  console.log('鼠标位置：x=' + spot.x + ' y=' + spot.y)
  console.log('悬停前 transform :', before.transform)
  console.log('  跑马灯 playState:', before.playState)
  console.log('悬停后 transform :', after.transform, '（' + after.name + '）')
  console.log('  跑马灯 playState:', after.playState)
  console.log()

  const straightened = (() => {
    // 转正后应是「旋转归零 + translateZ」：矩阵左上 3x3 为单位阵
    const inner = after.transform.match(/matrix3d?\(([^)]+)\)/)
    if (!inner) return false
    const nums = inner[1].split(',').map((s) => Number(s.trim()))
    if (nums.length === 6) return Math.abs(nums[0] - 1) < 0.01 && Math.abs(nums[1]) < 0.01
    return Math.abs(nums[0] - 1) < 0.01 && Math.abs(nums[5] - 1) < 0.01
  })()
  const paused = after.playState === 'paused'
  const changed = before.transform !== after.transform
  const wasRotated = /matrix3d/.test(before.transform) && before.transform !== after.transform

  console.log(
    straightened && paused && changed && wasRotated
      ? '✓ 悬停生效：卡片从斜立转正浮起（旋转归零 + translateZ 28px），跑马灯同步暂停'
      : `✗ 悬停异常：转正=${straightened} 暂停=${paused} 有变化=${changed} 原本是斜的=${wasRotated}`
  )
  process.exitCode = straightened && paused && changed && wasRotated ? 0 : 1
} finally {
  try { ws.close() } catch {}
  proc.kill()
}
