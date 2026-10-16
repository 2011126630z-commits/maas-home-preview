"use client"

import { useState } from "react"

import { InteractiveHoverButton } from "./interactive-hover-button"
import { cn } from "@/lib/utils"

/**
 * 响应式容器：把若干按钮排成一行，窄屏自动换成整列、按钮占满宽度。
 * 对齐方式与额外样式都通过 props 传入，方便直接嵌进已有页面。
 */
export interface ActionGroupProps {
  children: React.ReactNode
  /** 主轴对齐：start 靠左，center 居中，between 两端对齐 */
  align?: "start" | "center" | "between"
  /** 窄屏时按钮是否占满整行（默认 true） */
  stretchOnMobile?: boolean
  className?: string
}

export function ActionGroup({
  children,
  align = "start",
  stretchOnMobile = true,
  className,
}: ActionGroupProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center",
        stretchOnMobile && "[&>*]:w-full sm:[&>*]:w-auto",
        align === "center" && "sm:justify-center",
        align === "between" && "sm:justify-between",
        className
      )}
      data-align={align}
    >
      {children}
    </div>
  )
}

/**
 * 用法示例：直接可跑，也可以整段贴进 v0 / Lovable / Bolt / Cursor。
 */
export function InteractiveHoverButtonDemo() {
  const [clicks, setClicks] = useState(0)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 p-6 sm:p-10">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">默认</h2>
        <ActionGroup>
          <InteractiveHoverButton>开始使用</InteractiveHoverButton>
          <InteractiveHoverButton className="text-muted-foreground">
            查看定价
          </InteractiveHoverButton>
        </ActionGroup>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          居中 + 自定义尺寸
        </h2>
        <ActionGroup align="center">
          {/* className 会与组件自带样式合并，tailwind-merge 负责去重 */}
          <InteractiveHoverButton className="w-full px-10 py-3 text-base sm:w-auto">
            创建令牌
          </InteractiveHoverButton>
        </ActionGroup>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">状态与事件</h2>
        <ActionGroup align="between">
          <InteractiveHoverButton
            onClick={() => setClicks((n) => n + 1)}
            aria-label="计数按钮"
          >
            点我（{clicks}）
          </InteractiveHoverButton>
          <InteractiveHoverButton disabled>已禁用</InteractiveHoverButton>
        </ActionGroup>
      </section>
    </div>
  )
}

export default InteractiveHoverButtonDemo
