import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * shadcn/ui 项目里这个文件本来就有（`@/lib/utils`）。
 * 这里放一份是为了让本目录能被单独类型检查。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
