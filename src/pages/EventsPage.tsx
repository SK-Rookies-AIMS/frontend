"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Header } from "@/components/dashboard/header"
import { Mascot } from "@/components/mascot/mascot"
import { Footer } from "@/components/dashboard/footer"
import { useEvents } from "@/components/dashboard/event-notification"
import { eventApi } from "@/api/eventApi"
import { AuthGuard } from "@/components/auth-guard"
import { jwtDecode } from "jwt-decode"
import {
  generateLogCode,
  calculatePriorityScore,
  type EventItem,
  type EventStatus,
  type Severity,
} from "@/lib/events-data"
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  ChevronUp,
  Search,
  AlertTriangle,
  Eye,
  Check,
  Clock,
  X,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Ban
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
} from "recharts"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

type PriorityFilter = "전체" | "높음" | "중간" | "낮음"

// JWT 토큰에서 이메일 추출
const getActionByFromToken = (): string => {
  if (typeof window === "undefined") return "시스템"
  const token = sessionStorage.getItem("aims-auth-accessToken")
  if (!token) return "시스템"
  try {
    const decoded = jwtDecode<{ email?: string; sub?: string }>(token)
    return decoded.email || decoded.sub || "시스템"
  } catch (e) {
    return "시스템"
  }
}

export default function EventsPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const [pageSize, setPageSize] = useState(10)
  const [actionReason, setActionReason] = useState("")
  const [severityFilter, setSeverityFilter] = useState<"전체" | "DANGER" | "CAUTION">("전체")
  const [statusFilter, setStatusFilter] = useState<"전체" |"COMPLETED" | "INCOMPLETE" | "NOT_NEEDED">("전체")
  const [areaFilter, setAreaFilter] = useState("전체") // DB enum values: PRESS, BODY, PAINT, ASSEMBLY, INSPECTION
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("전체")
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  })
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [aiTrustScore, setAiTrustScore] = useState(85) // AI 신뢰도 점수 (전체)
  const [aiDistrustScore, setAiDistrustScore] = useState(72) // AI 불신 지수
  const [actionStats, setActionStats] = useState({ act: 42, view: 31, ign: 55 }) // ACT, VIEW, IGN 건수
  const { updateEventStatus } = useEvents()
  
  // API 데이터 상태
  const [eventsData, setEventsData] = useState<EventItem[]>([])
  const [allEventsData, setAllEventsData] = useState<EventItem[]>([]) // 추가: 전체 데이터
  const [loading, setLoading] = useState(true)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const fetchEvents = useCallback(async (page: number, size: number) => {
    setLoading(true)
    try {
      // 페이지별 데이터 fetch with optional area filter
      const filters: any = {};
      if (areaFilter !== "전체") {
        filters.processCode = areaFilter;
      }
      const response = await eventApi.getOverallEvents(page - 1, size, filters);
      // 전체 데이터 fetch (요약용 - size를 충분히 크게 설정)
      const allResponse = await eventApi.getOverallEvents(0, 10000);
      
      if (response.success) {
        const formattedEvents: EventItem[] = response.data.content.map((item: any) => ({
          id: item.logNo,
          datetime: item.createdAt,
          severity: (item.severity === 'DANGER' || item.severity === 'CRITICAL') ? '위험' : (item.severity === 'CAUTION' || item.severity === 'WARNING' ? '경고' : '위험'),
          area: item.processCode,
          subArea: "ID : " + (item.equipmentId || 'N/A'),
          title: item.title || '제목 없음',
          content: item.contents || '내용 없음',
          // 상태 및 조치: actionStatus 사용
          status:
            item.actionStatus === "COMPLETED"
                ? "조치 완료"
                : item.actionStatus === "INCOMPLETE"
                ? "조치 미완료"
                : item.actionStatus === "NOT_NEEDED"
                ? "조치 불필요"
                : "조치 미완료",
          equipmentId: item.equipmentId || '000',
          eventDate: item.createdAt.substring(5, 10).replace('-', ''),
          eventCount: 0,
          currentImpact: 0,
          followUpImpact: 0,
          // 우선순위 점수 및 레벨 반영
          priorityScore: item.priorityScore,
          // 알림 유형 한글 매핑 (PROCESS -> 공정, EQUIPMENT -> 설비)
          alertType: item.alertType === "PROCESS" ? "공정" : (item.alertType === "EQUIPMENT" ? "설비" : item.alertType || "알 수 없음"),
        }))
        setEventsData(formattedEvents)
        setTotalElements(response.data.totalElements)
        setTotalPages(response.data.totalPages)
      }

      if (allResponse.success) {
        const formattedAllEvents: EventItem[] = allResponse.data.content.map((item: any) => ({
          id: item.logNo,
          datetime: item.createdAt,
          severity: (item.severity === 'DANGER' || item.severity === 'CRITICAL') ? '위험' : (item.severity === 'CAUTION' || item.severity === 'WARNING' ? '경고' : '위험'),
          area: item.processCode,
          subArea: "ID : " + (item.equipmentId || 'N/A'),
          title: item.title || '제목 없음',
          content: item.contents || '내용 없음',
          // 상태 및 조치: actionStatus 사용
          status:
            item.actionStatus === "COMPLETED"
                ? "조치 완료"
                : item.actionStatus === "INCOMPLETE"
                ? "조치 미완료"
                : item.actionStatus === "NOT_NEEDED"
                ? "조치 불필요"
                : "조치 미완료",
          equipmentId: item.equipmentId || '000',
          eventDate: item.createdAt.substring(5, 10).replace('-', ''),
          eventCount: 0,
          currentImpact: 0,
          followUpImpact: 0,
          // 우선순위 점수 및 레벨 반영
          priorityScore: item.priorityScore,
          // 알림 유형 한글 매핑 (PROCESS -> 공정, EQUIPMENT -> 설비)
          alertType: item.alertType === "PROCESS" ? "공정" : (item.alertType === "EQUIPMENT" ? "설비" : item.alertType || "알 수 없음"),
        }))
        setAllEventsData(formattedAllEvents)
      }
    } catch (error) {
      console.error("Failed to fetch events", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents(currentPage, pageSize)

  const handler = () => {
    fetchEvents(currentPage, pageSize)
  }

      window.addEventListener(
    "page-refresh",
    handler
  )


  return ()=> {
    window.removeEventListener(
      "page-refresh",
      handler
    )
  }
  }, [fetchEvents, currentPage, pageSize])

  useEffect(() => {
    setActionReason("")
  }, [selectedEvent])

const getStatusStyle = (status: string) => {
  switch (status) {
    case "조치 미완료":
      return "bg-amber-100 text-amber-700 border-amber-300"

    case "조치 완료":
      return "bg-green-100 text-green-700 border-green-300"

    case "조치 불필요":
      return "bg-gray-100 text-gray-600 border-gray-300"

    default:
      return "bg-secondary text-muted-foreground border-border"
  }
}

  const getSeverityStyle = (severity: string) => {
  return severity === "위험"
    ? "bg-destructive/20 text-destructive"
    : "bg-warning/20 text-warning"
}

  const getImpactLevelStyle = (level: "높음" | "중간" | "낮음") => {
    switch (level) {
      case "높음": return "text-destructive"
      case "중간": return "text-warning"
      case "낮음": return "text-success"
    }
  }

  const handleStatusChange = async (eventId: number) => {
    try {
      const actionBy = getActionByFromToken()
      // API 호출 (조치 완료: COMPLETED)
      const response = await eventApi.updateEventAction(
        String(eventId),
        "COMPLETED",
        actionBy,
        "테이블에서 즉시 조치 완료 처리"
      )

      if (response && response.success) {
        // 1. Context 상태 업데이트 (알림/마스코트)
        updateEventStatus(eventId, "조치 완료")
        
        // 2. 로컬 상태 업데이트
        setEventsData(prev => prev.map(e => e.id === eventId ? { ...e, status: "조치 완료" } : e))
        setAllEventsData(prev => prev.map(e => e.id === eventId ? { ...e, status: "조치 완료" } : e))
        
        // 3. AI 스코어 및 통계 업데이트
        setActionStats(prev => ({ ...prev, act: prev.act + 1 }))
        setAiTrustScore(prev => Math.min(100, prev + 2))
        setAiDistrustScore(prev => Math.max(0, prev - 2))
      } else {
        alert(response?.message || "이벤트 조치 상태 업데이트에 실패했습니다.")
      }
    } catch (error) {
      console.error("Failed to update event status:", error)
      alert("이벤트 조치 상태 업데이트 중 오류가 발생했습니다.")
    }
  }

  // 조치 완료 처리 - AI 신뢰도 증가, 불신 지수 감소
  const handleActionComplete = async (eventId: number) => {
    try {
      const actionBy = getActionByFromToken()
      // API 호출 (조치 완료: COMPLETED)
      const response = await eventApi.updateEventAction(
        String(eventId),
        "COMPLETED",
        actionBy,
        actionReason || "상세 보기에서 조치 완료 처리"
      )

      if (response && response.success) {
        // 1. AI 스코어 및 통계 업데이트
        setAiTrustScore(prev => Math.min(100, prev + 2))
        setAiDistrustScore(prev => Math.max(0, prev - 2))
        setActionStats(prev => ({ ...prev, act: prev.act + 1 }))

        // 2. Context 상태 업데이트 (알림/마스코트)
        updateEventStatus(eventId, "조치 완료")

        // 3. 로컬 상태 업데이트
        setEventsData(prev => prev.map(e => e.id === eventId ? { ...e, status: "조치 완료" } : e))
        setAllEventsData(prev => prev.map(e => e.id === eventId ? { ...e, status: "조치 완료" } : e))

        setSelectedEvent(null)
      } else {
        alert(response?.message || "이벤트 조치 상태 업데이트에 실패했습니다.")
      }
    } catch (error) {
      console.error("Failed to complete event action:", error)
      alert("이벤트 조치 상태 업데이트 중 오류가 발생했습니다.")
    }
  }

  // 조치 불필요 처리 - AI 신뢰도 감소, 불신 지수 증가
  const handleActionUnnecessary = async (eventId: number) => {
    try {
      const actionBy = getActionByFromToken()
      // API 호출 (조치 불필요: NOT_NEEDED)
      const response = await eventApi.updateEventAction(
        String(eventId),
        "NOT_NEEDED",
        actionBy,
        actionReason || "상세 보기에서 조치 불필요 처리"
      )

      if (response && response.success) {
        // 1. AI 스코어 및 통계 업데이트
        setAiTrustScore(prev => Math.max(0, prev - 3))
        setAiDistrustScore(prev => Math.min(100, prev + 3))
        setActionStats(prev => ({ ...prev, ign: prev.ign + 1 }))

        // 2. Context 상태 업데이트 (알림/마스코트)
        updateEventStatus(eventId, "조치 불필요")

        // 3. 로컬 상태 업데이트
        setEventsData(prev => prev.map(e => e.id === eventId ? { ...e, status: "조치 불필요" } : e))
        setAllEventsData(prev => prev.map(e => e.id === eventId ? { ...e, status: "조치 불필요" } : e))

        setSelectedEvent(null)
      } else {
        alert(response?.message || "이벤트 조치 상태 업데이트에 실패했습니다.")
      }
    } catch (error) {
      console.error("Failed to update event to action unnecessary:", error)
      alert("이벤트 조치 상태 업데이트 중 오류가 발생했습니다.")
    }
  }

  // 우선순위 등급 결정 함수
  const getPriorityLevel = (score: number): "높음" | "중간" | "낮음" => {
    if (score >= 267) return "높음"
    if (score >= 134) return "중간"
    return "낮음"
  }

  // 영역 필터 매핑
  const AREA_MAPPING: Record<string, string> = {
  "PRESS": "PRESS",
  "BODY": "BODY",
  "PAINT": "PAINT",
  "ASSEMBLY": "ASSEMBLY",
  "INSPECTION": "INSPECTION",
};

const AREA_KOREAN_MAP: Record<string, string> = {
  PRESS: "프레스",
  BODY: "차체",
  PAINT: "도장",
  ASSEMBLY: "의장",
  INSPECTION: "검사",
};
  const severityMap: Record<string, string> = { DANGER: "위험", CAUTION: "경고" };
  const statusMap: Record<string, string> = {COMPLETED: "조치 완료", INCOMPLETE: "조치 미완료", NOT_NEEDED: "조치 불필요" };
  const filteredEvents = allEventsData.filter(event => {
    // Severity filter (DB enum -> Korean)
    if (severityFilter !== "전체" && event.severity !== severityMap[severityFilter]) return false;
    // Status filter (DB enum -> Korean)
    if (statusFilter !== "전체" && event.status !== statusMap[statusFilter]) return false;
    // Area filter (English code)
    if (areaFilter !== "전체") {
      if (event.area !== areaFilter) return false;
    }
    // Priority filter
    if (priorityFilter !== "전체") {
      const priorityScore = event.priorityScore || 0;
      const priorityLevel = getPriorityLevel(priorityScore);
      if (priorityLevel !== priorityFilter) return false;
    }
    // Date range filter
    const eventDate = new Date(event.datetime.split(' ')[0]);
    if (startDate && eventDate < startDate) return false;
    if (endDate && eventDate > endDate) return false;
    // Search filter
    if (searchQuery && !event.title.includes(searchQuery) && !event.content.includes(searchQuery)) return false;
    return true;
  }).sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a));

  // 페이지네이션 계산
  const totalEvents = filteredEvents.length
  // const totalPages = Math.max(1, Math.ceil(totalEvents / pageSize)) // 중복 선언 제거
  const computedTotalPages = Math.max(1, Math.ceil(totalEvents / pageSize))
  const safePage = Math.min(currentPage, computedTotalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalEvents)
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex)
  const currentPageCount = paginatedEvents.length

  // 필터 변경 시 1페이지로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [severityFilter, statusFilter, areaFilter, priorityFilter, startDate, endDate, searchQuery, pageSize])

  // 표시할 페이지 번호 목록 (현재 페이지 주변 최대 5개)
  const getPageNumbers = () => {
    const pages: number[] = []
    let start = Math.max(1, safePage - 2)
    let end = Math.min(computedTotalPages, start + 4)
    start = Math.max(1, end - 4)
    for (let p = start; p <= end; p++) pages.push(p)
    return pages
  }
  const pageNumbers = getPageNumbers()

  // 요약 통계 계산 (전체 데이터 기반)
  const today = new Date().toISOString().substring(0, 10)
  const allEvents = allEventsData
  const todayEvents = allEvents.filter(e => e.datetime.startsWith(today))
  
  // 오늘 이벤트 시간별 추이 계산 (동적)
  const eventTrendData = useMemo(() => {
    const hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"];
    return hours.map(hour => {
      const startHour = parseInt(hour);
      const endHour = startHour + 4;
      const eventsInBucket = todayEvents.filter(e => {
        const eHour = parseInt(e.datetime.substring(11, 13));
        return eHour >= startHour && eHour < endHour;
      });
      return {
        time: hour,
        danger: eventsInBucket.filter(e => e.severity === "위험").length,
        warning: eventsInBucket.filter(e => e.severity === "경고").length
      };
    });
  }, [todayEvents]);
  
  const totalEventsCount = allEvents.length
  const actionNeededCount = allEvents.filter(e => e.status === "조치 미완료").length
  const dangerCount = allEvents.filter(e => e.severity === "위험").length
  const warningCount = allEvents.filter(e => e.severity === "경고").length

  const todayDangerCount = todayEvents.filter(e => e.severity === "위험").length
  const todayWarningCount = todayEvents.filter(e => e.severity === "경고").length

  return (
    <AuthGuard>
    <div className="min-h-screen bg-background flex flex-col">
      <Header currentTime={currentTime} />
      <main className="flex-1 p-4 overflow-auto">
        <div className="flex gap-4">
          {/* Main Content */}
          <div className="flex-1">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>알림 관리</span>
              <span>{">"}</span>
              <span className="text-foreground">알림 목록</span>
            </div>

            {/* Title */}
            <h1 className="text-xl font-semibold mb-4">알림 목록</h1>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="px-3 py-2 bg-card border border-border rounded-lg text-sm w-32 text-left">
                      {startDate ? startDate.toLocaleDateString() : "시작일"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">~</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="px-3 py-2 bg-card border border-border rounded-lg text-sm w-32 text-left">
                      {endDate ? endDate.toLocaleDateString() : "종료일"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Severity Filter */}
              <div className="relative">
                <select 
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as "전체" | "DANGER" | "CAUTION")}
                  className="appearance-none flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm pr-8"
                >
                  <option value="전체">전체 심각도</option>
                  <option value="DANGER">위험</option>
                  <option value="CAUTION">경고</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "전체" | "COMPLETED" | "INCOMPLETE" | "NOT_NEEDED")}
                  className="appearance-none flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm pr-8"
                >
                  <option value="전체">전체 상태</option>
                  <option value="COMPLETED">조치 완료</option>
                  <option value="INCOMPLETE">조치 미완료</option>
                  <option value="NOT_NEEDED">조치 불필요</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Area Filter */}
              <div className="relative">
                <select 
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="appearance-none flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm pr-8"
                >
                  <option value="전체">전체 영역</option>
                  <option value="PRESS">프레스</option>
                  <option value="BODY">차체</option>
                  <option value="PAINT">도장</option>
                  <option value="ASSEMBLY">의장</option>
                  <option value="INSPECTION">검사</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Priority Filter */}
              <div className="relative">
                <select 
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                  className="appearance-none flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm pr-8"
                >
                  <option value="전체">전체 우선순위</option>
                  <option value="높음">높음 (267~400)</option>
                  <option value="중간">중간 (134~266)</option>
                  <option value="낮음">낮음 (0-133)</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Search */}
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="알림 제목, 내용 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Events Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">로그 번호</th>
                    <th className="text-center py-3 px-4 font-medium">우선순위</th>
                    <th className="text-left py-3 px-4 font-medium">심각도</th>
                    <th className="text-left py-3 px-4 font-medium">유형</th>
                    <th className="text-left py-3 px-4 font-medium">영역</th>
                    <th className="text-left py-3 px-4 font-medium">알림 제목</th>
                    <th className="text-left py-3 px-4 font-medium">내용</th>
                    <th className="text-center py-3 px-4 font-medium">상태</th>
                    <th className="text-center py-3 px-4 font-medium">조치</th>
                    <th className="text-center py-3 px-4 font-medium">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEvents.map((event) => {
                    const priorityScore = event.priorityScore || 0
                    const priorityLevel = getPriorityLevel(priorityScore)
                    const priorityColor = priorityLevel === "높음" ? "text-destructive bg-destructive/20" : 
                                          priorityLevel === "중간" ? "text-warning bg-warning/20" : 
                                          "text-success bg-success/20"
                    
                    return (
                    <tr key={event.id} className="border-t border-border hover:bg-secondary/20">
                      <td className="py-3 px-4 font-mono text-xs text-primary">
                        {event.id}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${priorityColor}`}>
                            {priorityScore}점
                          </span>
                          <span className="text-[10px] text-muted-foreground">{priorityLevel}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`w-4 h-4 ${event.severity === "위험" ? "text-destructive" : "text-warning"}`} />
                          <span className={`px-2 py-0.5 rounded text-xs ${getSeverityStyle(event.severity)}`}>
                            {severityMap[event.severity] || event.severity}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded text-xs font-semibold border",
                          event.alertType === "공정" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
                          event.alertType === "설비" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : 
                          "bg-muted text-muted-foreground border-border"
                        )}>
                          {event.alertType || "알 수 없음"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{event.area}</p>
                          <p className="text-xs text-muted-foreground">{event.subArea}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">{event.title}</td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">{event.content}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${getStatusStyle(event.status)}`}>
                          {event.status === "조치 완료" && <Check className="w-3 h-3" />}
                          {event.status === "조치 불필요" && <Ban className="w-3 h-3" />}
                          {event.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {event.status === "조치 미완료" ? (
                          <button
                            onClick={() => handleStatusChange(event.id)}
                            className="px-3 py-1 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/80"
                          >
                            조치 처리
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3 py-1 rounded text-xs bg-success/20 text-success cursor-default"
                          >
                            처리됨
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => setSelectedEvent(event)}
                          className="p-1.5 hover:bg-secondary rounded transition-colors"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                현재 페이지 {currentPageCount}건 / 전체 {totalEvents}건
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage === 1}
                  className="p-2 hover:bg-secondary rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="첫 페이지"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="p-2 hover:bg-secondary rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="이전 페이지"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {pageNumbers[0] > 1 && (
                  <span className="px-2 text-muted-foreground">...</span>
                )}
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded text-sm ${
                      currentPage === page 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-secondary"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    <span className="px-2 text-muted-foreground">...</span>
                    <button 
                      onClick={() => setCurrentPage(totalPages)}
                      className={`w-8 h-8 rounded text-sm ${
                        currentPage === totalPages ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="p-2 hover:bg-secondary rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="다음 페이지"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="p-2 hover:bg-secondary rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="마지막 페이지"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">페이지 크기</span>
                <div className="relative">
                  <select 
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="appearance-none flex items-center gap-2 px-3 py-1 bg-card border border-border rounded pr-8"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Summary Panel */}
          <div className="w-80 space-y-4">
            {/* Summary Stats */}
            <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">알림 요약</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">전체 알림</span>
                <span className="text-2xl font-bold">{totalEventsCount}건</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">조치 미완료</span>
                <span className="text-2xl font-bold text-primary">{actionNeededCount}건</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-destructive">위험</span>
                </div>
                <span className="font-bold">{dangerCount}건</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-warning">경고</span>
                </div>
                <span className="font-bold">{warningCount}건</span>
              </div>
            </div>
            </div>

            {/* Event Trend Chart */}
            <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">오늘 이벤트 현황</h3>
              <button className="text-xs text-muted-foreground hover:text-foreground">
                ?
              </button>
            </div>

            <div className="flex items-center gap-4 mb-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-destructive" />
                <span className="text-muted-foreground">위험</span>
                <span className="font-bold">{todayDangerCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-warning" />
                <span className="text-muted-foreground">경고</span>
                <span className="font-bold">{todayWarningCount}</span>
              </div>
            </div>

              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={eventTrendData}>
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
                      dataKey="danger" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 0, r: 3 }}
                      name="위험"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="warning" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', strokeWidth: 0, r: 3 }}
                      name="경고"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Reliability Assessment Panel (MVP.A) */}
            <div className="bg-card border border-border rounded-lg">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-medium">AI 알림 신뢰성 평가</h3>
                  <div className="relative group">
                    <button className="w-4 h-4 rounded-full bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary flex items-center justify-center text-xs font-medium">
                      ?
                    </button>
                    {/* Tooltip Popup */}
                    <div className="absolute right-full top-0 mr-2 w-72 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <div className="flex items-center justify-between p-3 border-b border-border">
                        <span className="text-xs font-medium">계산 기준 보기</span>
                        <ChevronUp className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="p-3 border-b border-border">
                        <div className="bg-secondary/50 rounded p-3 font-mono text-xs">
                          <p className="text-muted-foreground mb-1">불신 지수 =</p>
                          <p>(<span className="text-destructive">IGN</span> × 1.0 + <span className="text-warning">VIEW</span> × 0.5) / 전체 경고 수 × 100</p>
                        </div>
                      </div>
                      <div className="p-3 space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-bold text-primary w-10">ACT</span>
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-success mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-success">경고 인지 + 조치 취함</p>
                              <p className="text-[10px] text-muted-foreground">(경고 후 N분 내 설비 점검/액션 발생)</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-bold text-warning w-10">VIEW</span>
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-warning mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-warning">경고 확인했지만 조치 없음</p>
                              <p className="text-[10px] text-muted-foreground">(클릭은 했으나 후속 액션 없음)</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-bold text-destructive w-10">IGN</span>
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-destructive mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-destructive">경고 자체를 무시</p>
                              <p className="text-[10px] text-muted-foreground">(일정 시간 내 읽지 않음)</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <select className="appearance-none text-xs bg-secondary border border-border rounded px-2 py-1 pr-6" defaultValue="최근 7일">
                    <option>최근 7일</option>
                    <option>최근 30일</option>
                    <option>전체</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
              </div>
              
              {/* Distrust Index */}
              <div className="p-4 border-b border-border">
                <p className="text-xs text-muted-foreground mb-2">불신 지수</p>
                <div className="flex flex-col items-center py-4">
                  <span className={`text-5xl font-bold ${aiDistrustScore >= 70 ? "text-destructive" : aiDistrustScore >= 40 ? "text-warning" : "text-success"}`}>
                    {aiDistrustScore}%
                  </span>
                  <span className={`mt-2 text-sm ${aiDistrustScore >= 70 ? "text-destructive" : aiDistrustScore >= 40 ? "text-warning" : "text-success"}`}>
                    {aiDistrustScore >= 70 ? "경고 피로 위험" : aiDistrustScore >= 40 ? "주의 필요" : "정상 범위"}
                  </span>
                </div>
                
                {/* Action Stats */}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 rounded border border-primary/30">
                    <span className="text-xs font-medium text-primary">ACT</span>
                    <span className="text-sm font-bold text-primary">{actionStats.act}건</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-warning/10 rounded border border-warning/30">
                    <span className="text-xs font-medium text-warning">VIEW</span>
                    <span className="text-sm font-bold text-warning">{actionStats.view}건</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-destructive/10 rounded border border-destructive/30">
                    <span className="text-xs font-medium text-destructive">IGN</span>
                    <span className="text-sm font-bold text-destructive">{actionStats.ign}건</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg w-[700px] max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">알림 상세 정보</h2>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 hover:bg-secondary rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">발생 시간</label>
                    <p className="font-medium">{selectedEvent.datetime}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">심각도</label>
                    <p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getSeverityStyle(selectedEvent.severity)}`}>
                        <AlertTriangle className="w-3 h-3" />
                        {selectedEvent.severity}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">영역</label>
                    <p className="font-medium">{selectedEvent.area}</p>
                    <p className="text-xs text-muted-foreground">{selectedEvent.subArea}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">상태</label>
                    <p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${getStatusStyle(selectedEvent.status)}`}>
                        {selectedEvent.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">알림 유형</label>
                    <p className="mt-1">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded text-xs font-semibold border",
                        selectedEvent.alertType === "공정" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
                        selectedEvent.alertType === "설비" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : 
                        "bg-muted text-muted-foreground border-border"
                      )}>
                        {selectedEvent.alertType || "알 수 없음"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Title & Content */}
                <div>
                  <label className="text-xs text-muted-foreground">알림 제목</label>
                  <p className="font-medium text-lg">{selectedEvent.title}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">내용</label>
                  <p className="text-sm text-muted-foreground">{selectedEvent.content}</p>
                </div>

                {/* Handler Info & Action Method */}
                {selectedEvent.handler && (
                  <div>
                    <label className="text-xs text-muted-foreground">조치자</label>
                    <p className="font-medium">{selectedEvent.handler}</p>
                  </div>
                )}

                {/* Action Method (조치 완료시) */}
                {selectedEvent.status === "조치 완료" && selectedEvent.actionMethod && (
                  <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-4 h-4 text-success" />
                      <h3 className="text-sm font-medium text-success">조치 방법</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedEvent.actionMethod}</p>
                  </div>
                )}

                {/* Action Timeline (조치 완료시) */}
                {selectedEvent.status === "조치 완료" && selectedEvent.actionTimeline && (
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-medium">조치 타임라인</h3>
                      <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">
                        총 {selectedEvent.actionTimeline.length}단계
                      </span>
                    </div>
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                      
                      <div className="space-y-3">
                        {selectedEvent.actionTimeline.map((item, index) => {
                          const getTypeStyle = (type: string) => {
                            switch (type) {
                              case "확인": return "bg-primary/20 text-primary border-primary/30"
                              case "분석": return "bg-warning/20 text-warning border-warning/30"
                              case "조치": return "bg-success/20 text-success border-success/30"
                              case "검증": return "bg-primary/20 text-primary border-primary/30"
                              case "완료": return "bg-success/20 text-success border-success/30"
                              default: return "bg-secondary text-muted-foreground"
                            }
                          }
                          
                          const getDotColor = (type: string) => {
                            switch (type) {
                              case "확인": return "bg-primary"
                              case "분석": return "bg-warning"
                              case "조치": return "bg-success"
                              case "��증": return "bg-primary"
                              case "완료": return "bg-success"
                              default: return "bg-muted-foreground"
                            }
                          }
                          
                          return (
                            <div key={index} className="flex gap-3 relative">
                              {/* Timeline dot */}
                              <div className={`w-4 h-4 rounded-full ${getDotColor(item.type)} flex-shrink-0 z-10 flex items-center justify-center`}>
                                {item.type === "완료" && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 bg-secondary/30 rounded-lg p-3 -mt-0.5">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-muted-foreground">{item.time}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getTypeStyle(item.type)}`}>
                                      {item.type}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{item.handler}</span>
                                </div>
                                <p className="text-sm">{item.action}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Analysis (조치 미완료시) */}
                {selectedEvent.status === "조치 미완료" && selectedEvent.aiAnalysis && (
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-medium">AI 판단</h3>
                      <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">분석</span>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-4 h-4 text-destructive" />
                          <span className="text-xs font-medium text-destructive">원인 추정</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedEvent.aiAnalysis.causeEstimation}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-warning" />
                          <span className="text-xs font-medium text-warning">판단 영향</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedEvent.aiAnalysis.impactAssessment}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium text-primary">추가 영향</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedEvent.aiAnalysis.additionalImpact}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Recommended Action (조치 미완료시 - 시니어 조치 기록 기반) */}
                {selectedEvent.status === "조치 미완료" && selectedEvent.aiRecommendation && (
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-warning" />
                      <h3 className="text-sm font-medium">AI 추천 조치</h3>
                      <span className="text-xs px-2 py-0.5 bg-warning/20 text-warning rounded">시니어 기록 기반</span>
                    </div>
                    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-warning">추천 조치 방법</span>
                          <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded">
                            신뢰도 {selectedEvent.aiRecommendation.confidence}%
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-line">{selectedEvent.aiRecommendation.recommendedAction}</p>
                      </div>
                      <div className="pt-2 border-t border-warning/20">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">참조 시니어:</span>
                            <span className="ml-1 font-medium">{selectedEvent.aiRecommendation.seniorHandler}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">유사 케이스:</span>
                            <span className="ml-1 font-mono text-primary">{selectedEvent.aiRecommendation.similarCaseId}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          근거: {selectedEvent.aiRecommendation.basedOn}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trust Score (MVP.A) */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium">AI 신뢰도 점수</h3>
                    <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">MVP.A</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          (selectedEvent.trustScore || 0) >= 90 ? 'bg-success' :
                          (selectedEvent.trustScore || 0) >= 70 ? 'bg-warning' : 'bg-destructive'
                        }`}
                        style={{ width: `${selectedEvent.trustScore || 0}%` }} 
                      />
                    </div>
                    <span className="text-xl font-bold">{selectedEvent.trustScore}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    관제사 반응 기반 알림 우선순위 점수
                  </p>
                </div>

                {/* Impact Prediction (MVP.B) */}
                {selectedEvent.impactPrediction && (
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-medium">후속 공정 영향 예측</h3>
                      <span className="text-xs px-2 py-0.5 bg-warning/20 text-warning rounded">MVP.B</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">영향 공정</span>
                        </div>
                        <p className="font-medium">{selectedEvent.impactPrediction.affectedProcesses.join(", ")}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">영향도</span>
                        </div>
                        <p className={`font-medium ${getImpactLevelStyle(selectedEvent.impactPrediction.impactLevel)}`}>
                          {selectedEvent.impactPrediction.impactLevel}
                        </p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">예상 지연</span>
                        </div>
                        <p className="font-medium">{selectedEvent.impactPrediction.estimatedDelay}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 조치 사유 입력 (조치 필요시) */}
                {selectedEvent.status === "조치 미완료" && (
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-foreground">조치 사유 / 내역</span>
                    </div>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="이벤트 조치에 대한 사유나 조치 내역을 입력해주세요. (선택사항)"
                      className="w-full bg-input border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition resize-none"
                      rows={3}
                    />
                  </div>
                )}

                {/* Action Buttons - 모달 최하단 */}
                <div className="flex justify-between items-center gap-3 pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                  {selectedEvent.status === "조치 미완료" && (
                    <span>버튼 클릭 시 AI 신뢰도 점수가 조정됩니다</span>
                  )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedEvent(null)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary"
                    >
                      <X className="w-4 h-4" />
                      닫기
                    </button>
                    {selectedEvent.status === "조치 미완료" && (
                      <>
                        <button 
                          onClick={() => handleActionUnnecessary(selectedEvent.id)}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-muted text-muted-foreground border border-border rounded-lg hover:bg-secondary"
                          title="AI 신뢰도 -3%"
                        >
                          <Ban className="w-4 h-4" />
                          조치 불필요
                          <ThumbsDown className="w-3 h-3 text-destructive" />
                        </button>
                        <button 
                          onClick={() => handleActionComplete(selectedEvent.id)}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/80"
                          title="AI 신뢰도 +2%"
                        >
                          <Check className="w-4 h-4" />
                          조치 완료 처리
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mascot */}
        <Mascot />
      </main>
      <Footer />
    </div>
    </AuthGuard>
  )
}
