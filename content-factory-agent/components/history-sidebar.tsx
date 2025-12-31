"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Clock, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface HistoryTask {
  id: number
  keyword: string
  sourceType?: string  // 新增
  mpName?: string      // 新增
  totalArticles: number | null
  createdAt: string
  report: {
    id: number
    createdAt: string
  } | null
}

interface HistorySidebarProps {
  currentTaskId?: number | null
  onSelectTask: (taskId: number) => void
  onReanalyze: (keyword: string) => void
  onRefresh?: () => void
  refreshTrigger?: number  // 新增：用于触发刷新的计数器
}

export function HistorySidebar({ currentTaskId, onSelectTask, onReanalyze, onRefresh, refreshTrigger }: HistorySidebarProps) {
  const [tasks, setTasks] = useState<HistoryTask[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  // 加载历史记录（最近5条）
  const loadHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analysis-tasks?limit=5&sortBy=createdAt&sortOrder=desc')
      const data = await response.json()

      if (data.success) {
        setTasks(data.data)
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 删除记录
  const handleDelete = async (id: number, event: React.MouseEvent) => {
    event.stopPropagation()

    if (!confirm('确定要删除这条记录吗？')) return

    try {
      setDeleting(id)
      const response = await fetch(`/api/analysis-tasks/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== id))
        onRefresh?.()
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
    } finally {
      setDeleting(null)
    }
  }

  // 重新分析
  const handleReanalyze = (keyword: string, event: React.MouseEvent) => {
    event.stopPropagation()
    onReanalyze(keyword)
  }

  useEffect(() => {
    loadHistory()
  }, [])

  // 监听 refreshTrigger 变化，自动刷新历史记录
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadHistory()
    }
  }, [refreshTrigger])

  if (loading) {
    return (
      <div className="w-64 border-r bg-muted/30 p-4">
        <div className="space-y-2">
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">历史记录</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => loadHistory()}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">最近5次分析</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              暂无历史记录
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent",
                  currentTaskId === task.id && "bg-accent border-primary"
                )}
                onClick={() => onSelectTask(task.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      {task.sourceType === 'account_history' && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">公众号</Badge>
                      )}
                      <div className="font-medium text-sm truncate">
                        {task.keyword}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {task.totalArticles || 0}篇文章
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={(e) => handleDelete(task.id, e)}
                    disabled={deleting === task.id}
                  >
                    {deleting === task.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(task.createdAt), {
                      addSuffix: true,
                      locale: zhCN
                    })}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 h-7 text-xs"
                  onClick={(e) => handleReanalyze(task.keyword, e)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  重新分析
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {tasks.length > 0 && (
        <div className="p-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              // TODO: 打开完整历史记录页面/弹窗
              alert('功能开发中：完整历史记录页面')
            }}
          >
            查看全部记录
          </Button>
        </div>
      )}
    </div>
  )
}
