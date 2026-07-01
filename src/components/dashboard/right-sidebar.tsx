"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, ChevronRight, TrendingUp, Zap } from "lucide-react"
import { Mascot } from "./mascot"
import { eventApi } from "@/api/eventApi"
import { PROCESS_CODE_MAP } from "@/lib/events-data"

interface Event {
  id: string
  title: string
  area: string
  equipmentNo: string
  stationCode: string
  datetime: string
  severity: "위험" | "경고"
  currentImpact: number
  followUpImpact: number
  affectedProcesses: string[]
  priorityScore: number
}

export function RightSidebar() {
  const [priorityEvents, setPriorityEvents] = useState<Event[]>([])
  const [failures, setFailures] = useState<Event[]>([])
  const [warnings, setWarnings] = useState<Event[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await eventApi.getOverallEvents(0, 50)
        if (response.success) {
          console.log("API response item sample:", response.data.content[0]); // 디버깅 로그 추가
          const allEvents: Event[] = response.data.content.map((item: any) => ({
            id: item.logNo,
            title: item.title,
            area: PROCESS_CODE_MAP[item.processCode] || item.processCode,
            equipmentNo: item.equipmentId,
            stationCode: item.stationCode || 'N/A',
            datetime: item.createdAt,
            severity: item.severity === 'CRITICAL' ? '위험' : '경고',
            // item.riskScore를 currentImpact에 매핑하도록 시도
            currentImpact: item.currentImpact || item.riskScore || 0, 
            followUpImpact: item.followUpImpact || 0,
            affectedProcesses: (item.affectedProcesses || []).map((p: string) => PROCESS_CODE_MAP[p] || p),
            priorityScore: item.priorityScore || 0
          }))

          setPriorityEvents(allEvents.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 3))
          setFailures(allEvents.filter(e => e.severity === '위험').slice(0, 3))
          setWarnings(allEvents.filter(e => e.severity === '경고').slice(0, 3))
        }
      } catch (error) {
        console.error("Failed to fetch dashboard events:", error)
      }
    }
    fetchData()
  }, [])

  return (
    <aside className="w-72 bg-card border-l border-border flex flex-col overflow-auto relative">
      {/* Priority Events */}
      <div className="p-4 border-b border-border bg-gradient-to-b from-destructive/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-medium">우선 처리 필요</h3>
          </div>
          <Link to="/events" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            전체보기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {priorityEvents.map((event, index) => (
            <PriorityItem key={event.id} event={event} rank={index + 1} />
          ))}
        </div>
      </div>

      {/* Recent Failure Events */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium bg-secondary px-3 py-1.5 rounded">최근 장애 이벤트</h3>
          <Link to="/events?severity=위험" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            전체보기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {failures.map((event) => (
            <AlertItem key={event.id} title={event.title} location={event.area} stationCode={event.stationCode} time={event.datetime.split(' ')[1] || event.datetime} iconType="error" />
          ))}
        </div>
      </div>

      {/* Warning Events */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium bg-secondary px-3 py-1.5 rounded">최근 경고 이벤트</h3>
          <Link to="/events?severity=경고" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            전체보기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {warnings.map((event) => (
            <AlertItem key={event.id} title={event.title} location={event.area} stationCode={event.stationCode} time={event.datetime.split(' ')[1] || event.datetime} iconType="warning" />
          ))}
        </div>
      </div>

      <Mascot />
    </aside>
  )
}

function AlertItem({ title, location, stationCode, time, iconType }: { 
  title: string; location: string; stationCode: string; time: string; iconType: "warning" | "error";
}) {
  const isError = iconType === "error"
  return (
    <div className="flex gap-2">
      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${isError ? "bg-destructive/20" : "bg-warning/20"}`}>
        <AlertTriangle className={`w-3 h-3 ${isError ? "text-destructive" : "text-warning"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${isError ? "text-destructive" : "text-warning"}`}>{title}</p>
        <p className="text-[10px] text-muted-foreground">{location} | {stationCode}</p>
        <p className="text-[10px] text-muted-foreground">{time}</p>
      </div>
    </div>
  )
}


function PriorityItem({ event, rank }: { event: Event; rank: number }) {
  const isError = event.severity === "위험"
  // 5칸 박스 렌더링 함수 (1칸당 20점)
  const renderImpactBars = (score: number, isError: boolean) => {
    const filled = Math.min(5, Math.ceil(score / 20));
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={i} 
            className={`w-1.5 h-3 rounded-sm ${i < filled ? (isError ? "bg-destructive" : "bg-warning") : "bg-muted"}`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`rounded-lg p-3 border ${isError ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/30"}`}>
      <div className="flex items-start gap-2">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${rank === 1 ? "bg-destructive text-destructive-foreground" : rank === 2 ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"}`}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${isError ? "text-destructive" : "text-warning"}`}>{event.title}</p>
          <p className="text-[10px] text-muted-foreground mb-2">{event.area} | {event.stationCode}</p>
          
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">현재 영향</span>
              {renderImpactBars(event.currentImpact, isError)}
              <span className="text-muted-foreground">후속 영향</span>
              {renderImpactBars(event.followUpImpact, false)}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-mono font-bold text-primary">{event.priorityScore}점</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">영향 공정:</span>
              <span className="text-[10px] text-primary">{event.affectedProcesses.join(", ") || "없음"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
