# maas-home-preview · 君骄数智 首页独立预览

给「君骄数智」（客户方站名）做的**独立首页预览**：单文件、零外部请求、双击即开。
目标是客户给的参考站 `maas.10rig.com` 的观感——**一张大图 + 一句大字**，不是技术文档。

## 在线预览（手机 / 电脑直接点）

**<https://2011126630z-commits.github.io/maas-home-preview/>**

由本仓库的 GitHub Pages 发布（`main` 分支根目录）。手机浏览器打开即响应式单列排版。

- 交付物：[index.html](index.html)（单文件，全部内联，零外部请求）
- 截图：[shots/](shots/)（5 张：首屏 / 桌面整页 / 平板 / 手机 / 状态态）
- **报价单与回复话术不在本仓库**（仓库是公开的）。它们在 `../maas-home-preview-business/`，属内部材料。

## 怎么打开 / 怎么验

```powershell
start index.html     # 直接打开，无需任何环境
npm test             # 静态验收（node:test，15 条断言）
npm run shots        # 出图（本机 Edge 无头模式，免安装）
```

演示参数：`?no-anim=1` 关掉入场动画（出图与内嵌用）；`?demo=sent` 让首屏状态行直接点亮。

## 这一版是怎么来的

第一版按"信息完整"的思路做，结果是**文字过多、没有视觉主体**，客户反馈"和 maas.10rig.com 差太多了"。
这一版把文案压到 **67 个词**、整页从 5.7 屏压到 **2.2 屏**，把视觉做成主体。

| | 第一版 | 现在 |
| --- | --- | --- |
| 正文词数 | 268 + 两张表 + FAQ | **67** |
| 整页屏数 @1440 | 5.7 | **2.2** |
| 首屏标题 | 80px | **102px** |
| 首屏视觉 | 无（只有代码块） | 斜置渐变雾面，占首屏 **79%** |
| 字体种类 | 3 | **1** |
| 字号档位 | 5 | 5 |

内容也随之改掉：删除"接入构造器 / 改前改后代码 / 用量日志表 / 令牌表 / FAQ"，只留
**大标题 + 一句副标题 + 两个按钮 + 一行模型名 + 四个短语 + 一块收束色场 + 页脚**。

## 用到的 skill 与关卡结果（实跑）

按 **taste-skill v2（design-taste-frontend）** 的流程走，**impeccable** 的 craft floor 做工艺下限。

| 关卡 | 结果 |
| --- | --- |
| `lint.mjs` | 0 FAIL / 3 WARN（`outlined-box`，玻璃面板与下拉菜单的 1px 描边，属 brief 语言） |
| `inspect.mjs`（真实浏览器 1440 / 768 / 390） | **0 FAIL / 0 WARN** |
| `npm test` | **15 / 15 通过** |

因为客户给的参考站本身就是一张渐变大图，所以本次以 `--allow` 放行了
`gradient,glass,shadow,hairline,few-pictures,outlined-box,no-real-pictures,no-footage`：

- **gradient / glass / shadow**：首屏那张大图与玻璃状态面板就是本页的主体视觉，是 brief 要求的"内容"，不是装饰。
  代价是**每一处都必须在源码里带 `taste-skill-ignore` 注释写明理由**，`npm test` 会强制这条（没写理由的渐变/阴影直接判定失败）。
- **few-pictures / no-real-pictures / no-footage**：这个产品是 API 网关，没有属于它的真实照片；用图库图正是该 skill 明确劝阻的做法。
  参考站自己也没有照片。所以视觉改由**CSS / Canvas 画出来**：渐变雾面、花瓣粒子、玻璃面板，全部内联、零外部请求。

## 与那份「Prism」prompt 的关系

客户贴的那份 prompt 要求 React 19 + Vite + Tailwind + Cloudinary 视频素材。**本交付物没有照做**，原因只有一个：
那会毁掉"单文件、零外部请求、断网双击可开"这条，而这条正是老板手机能直接打开的前提。

同样的观感改用纯 CSS / Canvas 实现：渐变网格、玻璃拟态、花瓣粒子（Canvas 绘制下落/摇摆/自转/淡出）、
滚动触发的逐条入场、按钮箭头微交互、滚过首屏后顶栏变玻璃胶囊。若要真正落地成 React 代码库，
那属于报价单里的 **P1**（需要装 bun 环境）。

## 手机截图的一个坑（已修）

Windows 下无头浏览器开不出窄于 ~500px 的窗口，直接按 390px 截图会把 500px 的排版裁成 390px，
看起来像"右边被切掉"。`scripts/shots.mjs` 现在对窄视口套一层**宽度精确等于目标值的 iframe** 再截外层，
等价于真实设备视口（媒体查询、`100vw`、`position:fixed` 都按 iframe 视口计算）。

## 上线方式（四条路）

0. **用上面的 Pages 链接**（当前就是这条）——手机和电脑都能开，推上来自动更新。
1. **黏到 new-api 后台「首页内容」**：零改代码，但后台 DOMPurify 会剥掉 `<script>`，
   所以交互会降级（布局、玻璃、渐变、`<details>` 菜单与问答仍在；粒子与状态行动效失效）。
2. **把本文件托管出去，后台填 iframe 地址**：脚本全生效。
3. **改 new-api 源码**（见下）：最彻底，需 bun 环境与一次构建。

## 合规（不可删）

new-api 是 AGPLv3 + 第 7 条附加条款（见 `new-api/NOTICE`）：修改版必须在显著的页脚 / 关于 / 法律位置保留署名句子
`Frontend design and development by New API contributors.`
并保留指向 <https://github.com/QuantumNous/new-api> 的可见链接。本页页脚已带上，`npm test` 会守住。
**站名、Logo、配色、文案、布局都能改；这一行署名与原项目链接不能删。**

## 待客户确认

- 站名已按老板要求用「君骄数智」；配色现在走参考站的"黑白 UI + 粉彩大图"，若想换成深色科技风或别的色系，说一声即可。
- 页面上**没有任何编造的数字**（之前的"40+ 渠道 / 99.9% 可用性"等示意指标已全部删除），因此也无需「演示数据」标注。

## Phase 2（本次不做）

"所有页面都对着改一遍" = 全站换肤 + 控制台全量页面，属独立工作量，已在报价单分档。落地要点：

- 目标文件：`new-api/web/src/styles/theme-presets.css`、`web/src/lib/theme-customization.ts`、`web/src/features/home/**`
- 前置环境：本机**没有 bun**，需先装 bun → `bun install` → `bun run dev` / `build`
- 验收：`bun run typecheck` / `lint` / `test` / `build` / `copyright:check`
- 禁区：`footer.tsx` 的 `ProjectAttribution`、`features/about/index.tsx` 的原项目链接、
  `copyright:check` 守护的版权头、仓库里的 new-api / QuantumNous 标识，以及既有 i18n key 与标准文案
