"use client"

import { CheckCircle, Truck, Clock } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { useState, useEffect } from "react"

interface Task {
  taskId: number
  taskTitle: string
  taskStatus: "PROGRESS" | "TODO" | "DONE"
  scheduledAt: string
}

const productionData = [
  { time: "09:00", value: 2000 },
  { time: "10:00", value: 4500 },
  { time: "11:00", value: 6000 },
  { time: "12:00", value: 8500 },
  { time: "14:00", value: 10000 },
  { time: "15:00", value: 12540 },
]

export function LeftSidebar() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserTasks = async () => {
      setLoading(true)
      setError(null)
      try {
        const accessToken = sessionStorage.getItem("aims-auth-accessToken")
        if (!accessToken) {
          setError("로그인이 필요합니다.")
          setLoading(false)
          return
        }

        const response = await fetch("/api/main/task-user", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
        })

        const result = await response.json()

        if (response.ok && result.success) {
          setTasks(result.data)
        } else {
          setError(result.message || "담당 업무를 불러오지 못했습니다.")
          if (response.status === 401 || response.status === 403) {
            alert("인증이 만료되었습니다. 다시 로그인해주세요.")
            sessionStorage.removeItem("aims-auth-accessToken")
            sessionStorage.removeItem("aims-auth-refreshToken")
            window.location.href = "/login"
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("알 수 없는 오류가 발생했습니다.")
        }
        console.error("담당 업무를 가져오는 중 오류:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserTasks()
  }, [])

  const getStatusDisplay = (status: Task["taskStatus"]) => {
    switch (status) {
      case "DONE":
        return { label: "완료", className: "bg-emerald-100 text-emerald-800" }
      case "PROGRESS":
        return { label: "진행 중", className: "bg-blue-100 text-blue-800" }
      case "TODO":
        return { label: "대기 중", className: "bg-amber-100 text-amber-800" }
      default:
        return { label: "알 수 없음", className: "bg-gray-100 text-gray-800" }
    }
  }

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">시간별 담당업무</h3>
        </div>
        <div className="space-y-2">
          {loading && <div className="text-xs text-muted-foreground">로딩 중...</div>}
          {error && <div className="text-xs text-destructive">오류: {error}</div>}
          {!loading && !error && tasks.length === 0 && (
            <div className="text-xs text-muted-foreground">할당된 업무가 없습니다.</div>
          )}
          {!loading && !error && tasks.length > 0 && tasks.map((task) => {
            const statusDisplay = getStatusDisplay(task.taskStatus)
            return (
              <div key={task.taskId} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-12">
                  {task.scheduledAt.substring(11, 16)}
                </span>
                <span className="flex-1 truncate">{task.taskTitle}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusDisplay.className}`}>
                  {statusDisplay.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Overall Status */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xs text-muted-foreground mb-2">전체 설비 상태</h3>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-success">정상</span>
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">모든 시스템 정상 운영 중</p>
      </div>

      {/* AGV Status */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">운반 현황 (AGV)</h3>
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center">
            <Truck className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 space-y-1.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">운행 중</span>
              <span className="font-medium text-success">8 대</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">대기 중</span>
              <span className="font-medium">3 대</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">작업 중</span>
              <span className="font-medium text-primary">4 대</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-destructive">고장</span>
              <span className="font-medium text-destructive">0 대</span>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Summary */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">설비 상태 요약</h3>
        <div className="space-y-2">
          <StatusRow color="bg-success" label="정상" count={196} percent={77} />
          <StatusRow color="bg-warning" label="경고" count={35} percent={14} />
          <StatusRow color="bg-destructive" label="고장" count={5} percent={2} />
          <StatusRow color="bg-primary" label="점검" count={18} percent={7} />
        </div>
      </div>

      {/* Today's Production */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-2">오늘 실적</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">12,540</span>
          <span className="text-sm text-muted-foreground">EA</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">목표 15,000 EA</span>
        </div>
        <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: "83.6%" }}></div>
        </div>
      </div>

      {/* Production Trend */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">생산 추이 (EA)</h3>
          <span className="text-xs text-muted-foreground">오늘</span>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={productionData}>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: '#8ba3c7' }}
                axisLine={{ stroke: '#1e3a5f' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#8ba3c7' }}
                axisLine={{ stroke: '#1e3a5f' }}
                tickLine={false}
                tickFormatter={(value) => `${value / 1000}K`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f1d32', 
                  border: '1px solid #1e3a5f',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#00d4ff" 
                strokeWidth={2}
                dot={{ fill: '#00d4ff', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: '#00d4ff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </aside>
  )
}

function StatusRow({ color, label, count, percent }: { color: string; label: string; count: number; percent: number }) {
  const iconColor = color === "bg-success" ? "text-success" : 
                    color === "bg-warning" ? "text-warning" :
                    color === "bg-destructive" ? "text-destructive" : "text-primary"
  
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${color}`}></span>
      <span className={`text-sm ${iconColor}`}>{label}</span>
      <span className="flex-1"></span>
      <span className="text-sm font-medium">{count} 대 ({percent}%)</span>
    </div>
  )
}
