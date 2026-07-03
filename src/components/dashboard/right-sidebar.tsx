"use client"

import { Link } from "react-router-dom"
import { AlertTriangle, ChevronRight, TrendingUp, Zap } from "lucide-react"
import { Mascot } from "../mascot/Mascot"

// 우선순위 점수 계산을 위한 인터페이스
interface PriorityEvent {
  title: string
  location: string
  item: string
  time: string
  severity: "위험" | "경고"
  currentImpact: number // 현재 영향도 (1-10)
  followUpImpact: number // 후속 영향도 (1-10)
  affectedProcesses: string[] // 영향받는 공정
  priorityScore?: number // 계산된 우선순위 점수
}

// 우선순위 점수 계산 함수
function calculatePriorityScore(event: PriorityEvent): number {
  const severityWeight = event.severity === "위험" ? 3 : 1.5
  const currentImpactWeight = event.currentImpact * 2
  const followUpImpactWeight = event.followUpImpact * 1.5
  const processCountWeight = event.affectedProcesses.length * 5
  
  return Math.round(
    (severityWeight * 10) + currentImpactWeight + followUpImpactWeight + processCountWeight
  )
}

// 우선순위 이벤트 데이터 (영향도 정보 포함)
const priorityEventsData: PriorityEvent[] = [
  {
    title: "프레스 실린더 과부하 발생",
    location: "프레스 공정",
    item: "프레스 #1",
    time: "14:32",
    severity: "위험",
    currentImpact: 9,
    followUpImpact: 8,
    affectedProcesses: ["차체", "도장", "의장"],
  },
  {
    title: "비전 검사 장비 통신 오류",
    location: "검사 공정",
    item: "비전 검사 #3",
    time: "14:02",
    severity: "위험",
    currentImpact: 8,
    followUpImpact: 9,
    affectedProcesses: ["최종 검사", "출하"],
  },
  {
    title: "도장 부스 온도 상승 경고",
    location: "도장 공정",
    item: "도장 라인 #2",
    time: "14:28",
    severity: "경고",
    currentImpact: 7,
    followUpImpact: 8,
    affectedProcesses: ["의장"],
  },
  {
    title: "AGV 운행 정지",
    location: "의장 공정",
    item: "AGV-05",
    time: "13:45",
    severity: "위험",
    currentImpact: 6,
    followUpImpact: 5,
    affectedProcesses: ["의장"],
  },
  {
    title: "원자재 재고 부족 경고",
    location: "자재 관리",
    item: "원자재 창고 #1",
    time: "14:15",
    severity: "경고",
    currentImpact: 5,
    followUpImpact: 7,
    affectedProcesses: ["프레스"],
  },
]

// 우선순위 점수 계산 및 정렬
const priorityEvents = priorityEventsData
  .map(event => ({ ...event, priorityScore: calculatePriorityScore(event) }))
  .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
  .slice(0, 3) // 상위 3개만 표시

const recentFailures = [
  {
    title: "프레스 실린더 과부하 발생",
    location: "프레스 공정",
    item: "프레스 #1",
    time: "14:32",
  },
  {
    title: "비전 검사 장비 통신 오류",
    location: "검사 공정",
    item: "비전 검사 #3",
    time: "14:02",
  },
  {
    title: "AGV 운행 정지",
    location: "의장 공정",
    item: "AGV-05",
    time: "13:45",
  },
  {
    title: "용접 로봇 동작 이상",
    location: "차체 공정",
    item: "로봇 #R12",
    time: "13:28",
  },
]

const warningAlerts = [
  {
    title: "도장 부스 온도 상승 경고",
    location: "도장 공정",
    item: "도장 라인 #2",
    time: "14:28",
  },
  {
    title: "원자재 재고 부족 경고",
    location: "자재 관리",
    item: "원자재 창고 #1",
    time: "14:15",
  },
  {
    title: "프레스 오일 압력 저하",
    location: "프레스 공정",
    item: "프레스 #2",
    time: "13:58",
  },
]

export function RightSidebar() {
  return (
    <aside className="w-72 bg-card border-l border-border flex flex-col overflow-auto relative">
      {/* Priority Events - 우선순위 높은 이벤트 */}
      <div className="p-4 border-b border-border bg-gradient-to-b from-destructive/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-medium">우선 처리 필요</h3>
          </div>
          <Link 
            to="/events" 
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            전체보기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {priorityEvents.map((event, index) => (
            <PriorityItem key={index} event={event} rank={index + 1} />
          ))}
        </div>
      </div>

      {/* Recent Failure Events (위험) */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium bg-secondary px-3 py-1.5 rounded">최근 장애 이벤트</h3>
          <Link 
            to="/events?severity=위험" 
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            전체보기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {recentFailures.map((alert, index) => (
            <AlertItem key={index} {...alert} iconType="error" />
          ))}
        </div>
      </div>

      {/* Warning Events (경고) */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium bg-secondary px-3 py-1.5 rounded">최근 경고 이벤트</h3>
          <Link 
            to="/events?severity=경고" 
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            전체보기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {warningAlerts.map((alert, index) => (
            <AlertItem key={index} {...alert} iconType="warning" />
          ))}
        </div>
      </div>

      {/* Mascot */}
      <Mascot />
    </aside>
  )
}

function AlertItem({ title, location, item, time, iconType }: { 
  title: string; 
  location: string;
  item: string;
  time: string; 
  iconType: "warning" | "error";
}) {
  const isError = iconType === "error"
  
  return (
    <div className="flex gap-2">
      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isError ? "bg-destructive/20" : "bg-warning/20"
      }`}>
        <AlertTriangle className={`w-3 h-3 ${isError ? "text-destructive" : "text-warning"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${isError ? "text-destructive" : "text-warning"}`}>{title}</p>
        <p className="text-[10px] text-muted-foreground">{location} | {item}</p>
        <p className="text-[10px] text-muted-foreground">{time}</p>
      </div>
    </div>
  )
}

// 우선순위 이벤트 아이템 컴포넌트
function PriorityItem({ event, rank }: { event: PriorityEvent & { priorityScore: number }; rank: number }) {
  const isError = event.severity === "위험"
  
  return (
    <div className={`rounded-lg p-2.5 border ${isError ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/30"}`}>
      <div className="flex items-start gap-2">
        {/* Rank Badge */}
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
          rank === 1 ? "bg-destructive text-destructive-foreground" : 
          rank === 2 ? "bg-warning text-warning-foreground" : 
          "bg-muted text-muted-foreground"
        }`}>
          {rank}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium truncate ${isError ? "text-destructive" : "text-warning"}`}>
              {event.title}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mb-1.5">{event.location} | {event.item}</p>
          
          {/* Impact Indicators */}
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">현재:</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-3 rounded-sm ${i < Math.ceil(event.currentImpact / 2) ? (isError ? "bg-destructive" : "bg-warning") : "bg-muted"}`} 
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">후속:</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-3 rounded-sm ${i < Math.ceil(event.followUpImpact / 2) ? "bg-primary" : "bg-muted"}`} 
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Priority Score & Affected Processes */}
          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/50">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-mono font-bold text-primary">{event.priorityScore}점</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">영향:</span>
              <span className="text-[10px] text-primary">{event.affectedProcesses.join(", ")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
