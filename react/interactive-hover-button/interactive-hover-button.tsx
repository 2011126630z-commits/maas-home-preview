import type { ButtonHTMLAttributes, ReactNode } from "react"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * InteractiveHoverButton — interactive-hover-button
 *
 * Registry: user_magicui · https://motionsites.org/r/user_magicui/interactive-hover-button.json
 *
 * 交互机制（作者原样保留）：
 *  - 左侧一个 `bg-primary` 的小圆点，hover 时用 `scale-[100.8]` 放大成整片底色
 *  - 原来的文字向右滑出并淡出，右侧一份「文字 + 箭头」滑入
 *  - 外层 `overflow-hidden` 把滑出部分裁掉，所以整块按钮看起来是被"擦"过去的
 *
 * 与 registry 原文的三处差异（都不改视觉，理由见 README「与原文的差异」）：
 *  1. 用显式的 `ButtonHTMLAttributes` 类型导入，去掉对全局 `React` 命名空间的依赖
 *  2. hover 层加 `aria-hidden`，避免读屏把按钮文字念两遍
 *  3. `type` 默认为 `button`，防止放进表单时被当成提交按钮（仍可通过 props 覆盖）
 */
export interface InteractiveHoverButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function InteractiveHoverButton({
  children,
  className,
  type = "button",
  ...props
}: InteractiveHoverButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "group bg-background relative w-auto cursor-pointer overflow-hidden rounded-full border p-2 px-6 text-center font-semibold",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        <div className="bg-primary h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-[100.8]"></div>
        <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
          {children}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="text-primary-foreground absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100"
      >
        <span>{children}</span>
        <ArrowRight />
      </div>
    </button>
  )
}

export default InteractiveHoverButton
