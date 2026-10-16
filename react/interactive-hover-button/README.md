# interactive-hover-button

shadcn registry 组件 `interactive-hover-button`（作者 **user_magicui**）的可直接粘贴版本 + 一个响应式接线示例。

- 来源：<https://motionsites.org/r/user_magicui/interactive-hover-button.json>
- 一键安装（在已有 shadcn 项目里）：

  ```bash
  npx shadcn@latest add https://motionsites.org/r/user_magicui/interactive-hover-button.json
  ```

  `registry.json` 是原始 registry 响应的存档，内容与线上一致，方便对照或重跑。

## 文件

| 文件 | 作用 |
| --- | --- |
| `interactive-hover-button.tsx` | 组件本体。类名与动效机制**与 registry 原文一致** |
| `demo.tsx` | 接线示例：`ActionGroup` 响应式容器 + 三组用法（默认 / 居中 / 状态与事件） |
| `lib/utils.ts` | `cn()`。真实 shadcn 项目里已有 `@/lib/utils`，这里放一份是为了能单独类型检查 |
| `tsconfig.json` · `package.json` | 让本目录能独立跑 `npm run typecheck` |
| `harness/` | 本地视觉校验（打包 + 出图），不参与交付 |
| `harness/render.png` | 实际渲染出来的样子 |

依赖：`lucide-react`（`ArrowRight`）、`clsx` + `tailwind-merge`（`cn`）。需要 Tailwind 与 shadcn 的 CSS 变量。

## 用法

```tsx
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"

<InteractiveHoverButton onClick={handleStart}>开始使用</InteractiveHoverButton>
```

### Props

继承 `ButtonHTMLAttributes<HTMLButtonElement>`，因此 `onClick` / `disabled` / `type` / `aria-*` 都能直接用：

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | 按钮文字；hover 前后各渲染一次（见下） |
| `className` | `string` | — | 与自带样式合并，`tailwind-merge` 负责去重，可用来改尺寸/颜色 |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` | 显式默认，避免放进 `<form>` 时被当成提交按钮 |
| 其余 | — | — | 透传到 `<button>` |

### 响应式容器

`demo.tsx` 里的 `ActionGroup` 把按钮排成一行，窄屏自动换成整列并让按钮占满宽度：

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `align` | `"start" \| "center" \| "between"` | `"start"` | `sm` 以上生效；窄屏恒为整列靠左 |
| `stretchOnMobile` | `boolean` | `true` | 窄屏时子元素 `w-full`，`sm` 以上还原 `w-auto` |
| `className` | `string` | — | 追加到容器 |

## 交互机制（作者原样保留）

- 左侧 `bg-primary` 的小圆点，hover 时 `scale-[100.8]` 放大成整片底色；
- 原来的文字 `translate-x-12` + `opacity-0` 滑出，右侧「文字 + 箭头」从 `translate-x-12` 滑到 `-translate-x-5` 并淡入；
- 外层 `overflow-hidden` 把滑出部分裁掉，观感是底色把按钮"擦"过去。

换色只需要改 shadcn 令牌：`--primary`（底色）、`--primary-foreground`（hover 后的文字）、`--background`、`--border`。

## 与 registry 原文的差异（都不改视觉）

1. **类型导入**：原文写 `React.ButtonHTMLAttributes<HTMLButtonElement>` 但没有引入 `React`。在没有 UMD 全局命名空间的项目里（`isolatedModules`、多数 Vite/Next 配置）这会直接报 `Cannot find namespace 'React'`。改为显式 `import type { ButtonHTMLAttributes, ReactNode } from "react"`，并抽成具名的 `InteractiveHoverButtonProps`（对外 API 不变）。
2. **hover 层加 `aria-hidden="true"`**：原文把 `children` 渲染了两遍（原地一份 + hover 层一份），读屏会把按钮名字念两遍。加 `aria-hidden` 后视觉不变、可访问名只读一次。
3. **`type` 默认 `"button"`**：原文没有默认值，按钮放进 `<form>` 会变成提交按钮。默认值仍可被 props 覆盖。

> 另有一处**没有改**的脆弱点，供参考：hover 层是 `absolute top-0 h-full w-full`，横向靠静态位置（padding 边）定位，再用 `translate-x-12` 推出去。这在当前类名组合下工作正常，但如果你给按钮加了很大的 `px-*`，滑入的落点会跟着偏移。要更稳可以给它加 `inset-x-0`，但那会改变滑入动画的起点，所以这里保持原文。

## 验证方式（本目录实跑）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型 | `npm run typecheck`（`strict`、`noUnusedLocals`、`noEmit`） | **通过，0 错误** |
| Tailwind 是否真的扫到类名 | 对构建出的 `style.css` 逐个查 `group-hover:scale-[100.8]` 等 | 8/8 全部生成 |
| 实际渲染 | esbuild 打包 + Tailwind 出样式 + 无头 Edge 截图 | 见 `harness/render.png`，静止态、三种对齐、禁用态均正确 |

```bash
npm install
npm run typecheck
npx esbuild harness/main.tsx --bundle --format=iife --jsx=automatic --alias:@=. --outfile=harness/bundle.js
npx @tailwindcss/cli -i harness/input.css -o harness/style.css --content "demo.tsx,interactive-hover-button.tsx,harness/main.tsx"
```

未覆盖：hover 的过渡过程没有截图验证（无头 CLI 触发不了 `:hover`），但转换用到的工具类已确认全部生成。
