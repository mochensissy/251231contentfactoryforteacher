"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BarChart3, FileEdit, Settings, FolderOpen, Home, Video } from "lucide-react"

const navigation = [
  { name: "首页", href: "/", icon: Home },
  { name: "选题分析", href: "/topic-analysis", icon: BarChart3 },
  { name: "内容创作", href: "/content-creation", icon: FileEdit },
  { name: "文章库", href: "/publish-management", icon: FolderOpen },
  { name: "设置", href: "/settings", icon: Settings },
]

/**
 * 主导航栏：展示核心模块入口，并在当前路径时提供明显高亮。
 */
export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-2">
      {navigation.map((item) => {
        const Icon = item.icon
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary ring-1 ring-primary/30 shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
