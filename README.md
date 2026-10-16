# maas-home-preview · 君骄数智 首页独立预览

给「君骄数智」（客户方站名，老板刚改定）做的一版**独立首页预览**：单文件、零外部请求、双击即开。
用途是明天先发老板看效果、确认方向，再决定要不要往 new-api 源码里落地。

## 在线预览（手机 / 电脑直接点）

**<https://2011126630z-commits.github.io/maas-home-preview/>**

由本仓库的 GitHub Pages 发布（`main` 分支根目录，`status: built`）。手机浏览器打开即是响应式单列排版。

- 交付物：[index.html](index.html)（单文件，全部内联）
- 视觉语言：[DESIGN.md](DESIGN.md)（从 awesome-design-md 库选的 `cohere` 企业 AI 控制台语言，MIT）
- 截图：[shots/](shots/)（5 张，含首屏、整页长图、平板、手机、交互态）
- **报价单与回复话术不放在本仓库**（仓库是公开的）。它们在 `../maas-home-preview-business/`，属于内部材料，别把带批注的草稿直接发给买家。

## 怎么打开 / 怎么验

```powershell
# 直接打开（无需任何环境）
start index.html

# 静态验收（node:test，15 条断言）
npm test

# 出图（用本机 Edge 无头模式，免安装）
npm run shots
```

预览页支持两个演示参数：

| 参数 | 作用 |
| --- | --- |
| `?no-anim=1` | 关掉入场动画，用于出图与内嵌 |
| `?demo=sent` | 直接把「接入构造器」的流水线跑完，用于截图 |

## 这版的设计是怎么定的

按 **taste-skill v2（design-taste-frontend）** 的流程走，并用 **impeccable** 的 craft floor 做工艺下限检查：

- **方向**：三个候选方向里选 `product-performs`（"The product performs"）——对 API 网关这种产品，把产品自己的界面当场跑起来比描述功能更可信。
- **一句主张**：在这页上，君骄数智的**网关调度**变成**访客按得下去的那段界面**。
- **"活的东西"**：接入构造器。换一种接口类型（对话 / 向量 / 重排序），请求内容与计量口径跟着变；点「跑一次示例请求」会把鉴权 → 限流 → 路由 → 计量整条流水线走一遍，全部浏览器内完成，无后端。
- **视觉语言**：因为客户还没有确定的品牌色，**把方向里配的 palette/type 换成了 DESIGN.md 的语言**（白底、全墨正文、深墨绿整块色场、平的面、极紧的大字、只有五档字号）。这是本次唯一一次有理由的重绘。
- **工艺下限（impeccable craft floor）**：无渐变、无渐变文字、静置无阴影、无玻璃模糊、无小号大写字母间距标签、无 emoji 当图标、无图标卡片阵列；浏览器自带的选区色、光标色、焦点环也纳入设计系统。

### 关卡结果（实际跑过的）

| 关卡 | 结果 |
| --- | --- |
| `lint.mjs`（skill 侧） | **0 FAIL / 0 WARN** |
| `inspect.mjs`（真实浏览器 1440 / 768 / 390） | **0 FAIL / 2 WARN** |
| `npm test` | **15 / 15 通过** |
| 实测尺寸 | 字面 2 种 · 字号恰好 5 档（13/16/17/38/80px）· 无对比度告警 |

两个 WARN 是**有意保留**的，理由如下：

1. `no-real-pictures` —— 这个产品是 API 网关，没有属于它的真实照片；用「工程师对着笔记本」的图库图正是该 skill 明确劝阻的做法。页面上的「图片」是四处标记了 `data-ui` 的**产品自身界面片段**（接入构造器、渠道、用量日志、令牌），skill 也承认软件产品应当展示自己的界面。
2. `no-footage` —— 没有任何一段关于这个主题的诚实视频；且本交付物的硬约束是**单文件零外部请求、断网可开**，塞一段视频会直接破坏这条约束。

## 待客户确认的示例内容

页面里所有数值都**就地标注了「演示数据」**，不冒充真实指标。需要客户确认或替换：

- 模型名：`jj-chat-pro` / `jj-chat-lite` / `jj-embed-v2` / `jj-rerank-v1`
- 渠道权重的分配方式（当前是 60 / 30 / 10）
- 令牌名、分组、额度口径（当前「已用 62% / 200 万」这类写法）
- 用量日志的字段与状态取值（成功 / 已重试 / 配额超限）
- 主域名占位 `https://你的网关域名/v1`

## 上线方式（三条路，限制不同）

0. **直接用上面的 Pages 链接**（当前就是这条路）——手机和电脑都能点开，改动推上来就自动更新。
1. **黏到 new-api 后台「首页内容」**（零改代码，最快）——但后台用 DOMPurify 清洗 HTML，`<script>` 在禁止标签里，**脚本会被剥掉**：此时 CSS 交互与布局仍在（本页的 `noscript` 提示、原生 `<details>` 问答与移动端菜单都是为此准备的），但接入构造器的按钮不工作。
2. **把本文件托管出去，后台「首页内容」填 iframe 地址**（推荐）——脚本全生效，交互完整，且改版不用重新构建前端。
3. **改 new-api 源码**（最彻底，见下）——新增主题预设 + 重写 `web/src/features/home/**`，需要 bun 环境与一次 rsbuild 构建。

## 合规（不可删）

new-api 是 AGPLv3 + 第 7 条附加条款（见 `new-api/NOTICE`）：修改版必须在显著的页脚 / 关于 / 法律位置保留署名句子
`Frontend design and development by New API contributors.`
并保留指向 <https://github.com/QuantumNous/new-api> 的可见链接。本页页脚已经带上这两项，`npm test` 也会守住它们。
**站名、Logo、配色、文案、布局都可以改；这一行署名与原项目链接不能删。**

## Phase 2（本次不做）

买家说的"所有页面都对着改一遍"= 全站换肤 + 控制台全量页面，属于另外的工作量，已在报价单里分档。

落地要点与禁区：

- 目标文件：`new-api/web/src/styles/theme-presets.css`、`web/src/lib/theme-customization.ts`、`web/src/features/home/**`
- 前置环境：本机**没有 bun**，需先装 bun → `bun install` → `bun run dev` / `build`
- 验收命令：`bun run typecheck` / `lint` / `test` / `build` / `copyright:check`
- 禁区：`footer.tsx` 的 `ProjectAttribution`、`features/about/index.tsx` 的原项目链接、`copyright:check` 守护的版权头、仓库里的 new-api / QuantumNous 标识，以及**既有 i18n key 与标准文案**（导航文案本来就是后台动态下发的，一个都不用改）
