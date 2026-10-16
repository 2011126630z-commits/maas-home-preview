/**
 * 玻璃按钮交互验证：用 CDP 派发真实鼠标事件（CSS :hover/:active 无法用合成事件触发）。
 * 检查：悬停 → scale(0.975)；按下 → 外层 rotate3d(1,0,0,25deg)；描边角度变量随悬停变化。
 * 用法：node scripts/button-verify.mjs
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

const PORT = 9334
const proc = spawn(browser, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${join(tmpdir(), `btn-verify-${process.pid}`)}`,
  `--remote-debugging-port=${PORT}`,
  '--window-size=1440,1200', '--allow-file-access-from-files', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page.webSocketDebuggerUrl
    } catch { /* 端点未就绪 */ }
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
      msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)
    }
    ws.addEventListener('message', onMessage)
    ws.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(ws, expression) {
  const res = await rpc(ws, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text)
  return res.result.value
}
const mouse = (ws, type, x, y, buttons = 0) =>
  rpc(ws, 'Input.dispatchMouseEvent', { type, x, y, buttons, button: buttons ? 'left' : 'none', clickCount: buttons ? 1 : 0 })

const ws = new WebSocket(await wsUrl())
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true })
  ws.addEventListener('error', rej, { once: true })
})

try {
  await rpc(ws, 'Page.enable')
  await rpc(ws, 'Runtime.enable')
  await rpc(ws, 'Page.navigate', { url: target })

  for (let i = 0; i < 60; i++) {
    if (await evaluate(ws, `!!document.querySelector('.fancy-btn')`)) break
    await sleep(250)
  }

  const box = await evaluate(ws, `(function(){
    var b=document.querySelector('.fancy-btn');
    var r=b.getBoundingClientRect();
    return {x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2)};
  })()`)
  if (!box.y || box.y < 0) throw new Error('按钮不在视口内：' + JSON.stringify(box))

  const read = () => evaluate(ws, `(function(){
    var b=document.querySelector('.fancy-btn');
    var w=document.querySelector('.fancy-wrap');
    return {
      btn: getComputedStyle(b).transform,
      wrap: getComputedStyle(w).transform,
      angle: getComputedStyle(b,'::after').getPropertyValue('--angle-1').trim(),
      sheen: getComputedStyle(b.querySelector('.fancy-label'),'::after').backgroundPosition,
    };
  })()`)

  // 鼠标移开 → 静息态
  await mouse(ws, 'mouseMoved', 20, 20)
  await sleep(600)
  const idle = await read()

  // 悬停
  await mouse(ws, 'mouseMoved', box.x, box.y)
  await sleep(700)
  const hover = await read()

  // 按下
  await mouse(ws, 'mousePressed', box.x, box.y, 1)
  await sleep(400)
  const active = await read()
  await mouse(ws, 'mouseReleased', box.x, box.y, 1)
  await sleep(200)

  console.log('静息  btn=', idle.btn, ' 描边角=', idle.angle, ' 扫光=', idle.sheen)
  console.log('悬停  btn=', hover.btn, ' 描边角=', hover.angle, ' 扫光=', hover.sheen)
  console.log('按下  wrap=', active.wrap)
  console.log()

  const scaled = /matrix\(0\.9/.test(hover.btn)
  const angleMoved = idle.angle !== hover.angle
  const pressed = /matrix3d/.test(active.wrap)
  const sheenMoved = idle.sheen !== hover.sheen

  console.log(
    scaled && angleMoved && pressed && sheenMoved
      ? `✓ 玻璃按钮交互生效：悬停缩放=${scaled} 描边角变化=${angleMoved} 扫光移动=${sheenMoved} 按下 3D 下沉=${pressed}`
      : `✗ 交互异常：缩放=${scaled} 描边角=${angleMoved} 扫光=${sheenMoved} 按下=${pressed}`
  )
  process.exitCode = scaled && angleMoved && pressed && sheenMoved ? 0 : 1
} finally {
  try { ws.close() } catch {}
  proc.kill()
}
