"use client"

import { useState, useCallback, useRef, useEffect, createContext, useContext } from "react"
import { useLocation } from "react-router-dom"
import { AlertTriangle, X, Bell } from "lucide-react"
import {
  eventsData,
  generateLogCode,
  isActionableStatus,
  isProductionProcess,
  calculatePriorityScore,
  type EventItem,
  type EventStatus,
} from "@/lib/events-data"

// 마스코트/팝업에 사용할 파생 알림 형태
interface DerivedNotification {
  id: number
  title: string
  location: string
  item: string
  severity: "경고" | "위험"
  logCode: string
  aiScore: number
}

interface EventNotificationContextValue {
  // 이벤트 단일 상태 (이벤트 페이지가 공유)
  events: EventItem[]
  // 이벤트 상태 업데이트 (조치 완료/조치 불필요 등)
  updateEventStatus: (id: number, status: EventStatus) => void
  // 마스코트 안내용 - 이벤트 우선순위 점수가 가장 높은 미조치 위험 이벤트
  topEvent: DerivedNotification | null
  activeCount: number
}

const EventNotificationContext = createContext<EventNotificationContextValue>({
  events: eventsData,
  updateEventStatus: () => {},
  topEvent: null,
  activeCount: 0,
})

export function useMascotAlert() {
  return useContext(EventNotificationContext)
}

// 이벤트 페이지가 동일 컨텍스트를 쓰도록 별칭 제공
export function useEvents() {
  return useContext(EventNotificationContext)
}

// 이벤트 항목 -> 파생 알림 변환
function toDerived(event: EventItem): DerivedNotification {
  return {
    id: event.id,
    title: event.title,
    location: event.area,
    item: event.subArea,
    severity: event.severity,
    logCode: generateLogCode(event.severity, event.area, event.equipmentNo, event.eventDate, event.eventCount),
    aiScore: event.aiScore ?? event.trustScore ?? 0,
  }
}

export function EventNotificationProvider({ children }: { children: React.ReactNode }) {
  // 로그인 등 인증 전 화면에서는 알림 UI를 숨긴다 (컨텍스트는 계속 제공)
  const { pathname } = useLocation();
  const isAuthPage = pathname === "/login" || pathname === "/signup"
  // 이벤트 단일 상태 (이벤트 페이지의 데이터를 그대로 사용 - 새로 생성하지 않음)
  const [events, setEvents] = useState<EventItem[]>(eventsData)
  // 팝업(우측 상단 토스트)을 X로 닫은 알림 id 목록.
  // 팝업만 숨기고 마스코트 안내는 그대로 유지한다.
  const [dismissedIds, setDismissedIds] = useState<number[]>([])
  const [isEnabled, setIsEnabled] = useState(true)
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayColor, setOverlayColor] = useState<"danger" | "warning">("danger")
  // 이미 오버레이로 강조했던 알림 id (중복 강조 방지)
  const alertedIdsRef = useRef<Set<number>>(new Set())

  // 이벤트 상태 업데이트 - 조치/확인 처리 시 호출
  const updateEventStatus = useCallback((id: number, status: EventStatus) => {
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, status } : e)))
  }, [])

  // 팝업으로 노출할 알림: 미조치(조치 필요) + 위험 이벤트만
  // 단, 차체/도장/의장/프레스 등 생산 공정에서 발생한 이벤트만 (검사/자재 관리 제외)
  // -> 이벤트 페이지의 실제 데이터에서만 발생하고, 조치되면 자동으로 사라짐
  const activeNotifications: DerivedNotification[] = events
    .filter(e => e.severity === "위험" && isActionableStatus(e.status) && isProductionProcess(e.area))
    .map(toDerived)

  // 처음 등장하는 위험 알림이 있으면 오버레이를 한 번만 강조 (8초 재알림 없음)
  useEffect(() => {
    if (isAuthPage || !isEnabled) {
      setShowOverlay(false)
      return
    }
    const newOnes = activeNotifications.filter(n => !alertedIdsRef.current.has(n.id))
    if (newOnes.length > 0) {
      newOnes.forEach(n => alertedIdsRef.current.add(n.id))
      setOverlayColor("danger")
      setShowOverlay(true)
      const t = setTimeout(() => setShowOverlay(false), 3000)
      return () => clearTimeout(t)
    }
    if (activeNotifications.length === 0) {
      setShowOverlay(false)
    }
  }, [activeNotifications.map(n => n.id).join(","), isAuthPage, isEnabled])

  // 화면에 실제로 떠 있는 팝업 (X로 닫은 알림 제외)
  const visiblePopups = activeNotifications.filter(n => !dismissedIds.includes(n.id))

  // 마스코트 안내용: 이벤트 우선순위 점수가 가장 높은 미조치 위험 이벤트
  // (생산 공정 이벤트만 대상 - 검사/자재 관리 제외)
  // (AI 지수가 아닌 calculatePriorityScore 기준)
  const actionableEvents = events.filter(e => e.severity === "위험" && isActionableStatus(e.status) && isProductionProcess(e.area))
  const topEvent = !isAuthPage && actionableEvents.length > 0
    ? toDerived(
        [...actionableEvents].sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a))[0]
      )
    : null

  // 팝업 X 클릭: 알림 자체는 유지하고 팝업만 닫는다.
  const dismissPopup = (id: number) => {
    setDismissedIds(prev => (prev.includes(id) ? prev : [...prev, id]))
  }

  return (
    <EventNotificationContext.Provider value={{
      events,
      updateEventStatus,
      topEvent,
      activeCount: isAuthPage ? 0 : activeNotifications.length,
    }}>
      {children}

      {!isAuthPage && (
        <>
          {/* Screen Overlay - 반투명 화면 덮기 */}
          {showOverlay && (
            <div
              className={`
                fixed inset-0 z-[90] pointer-events-none
                animate-in fade-in duration-300
                ${overlayColor === "danger" ? "bg-destructive/40" : "bg-warning/40"}
              `}
              style={{
                animation: "pulse-overlay 1s ease-in-out infinite"
              }}
            />
          )}

          {/* Notification Container - 미조치 위험 이벤트 중 팝업으로 닫지 않은 것만 표시 */}
          <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm">
            {visiblePopups.map((notification) => (
              <div
                key={notification.id}
                className={`
                  flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm
                  animate-in slide-in-from-right-5 duration-300
                  ${notification.severity === "위험"
                    ? "bg-destructive/10 border-destructive/50 text-destructive"
                    : "bg-warning/10 border-warning/50 text-warning"
                  }
                `}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${notification.severity === "위험" ? "bg-destructive/20" : "bg-warning/20"}
                `}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      notification.severity === "위험" ? "bg-destructive/20" : "bg-warning/20"
                    }`}>
                      {notification.severity}
                    </span>
                    {/* 로그 번호 표시 */}
                    <span className="text-xs font-mono text-muted-foreground">{notification.logCode}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.location} | {notification.item}</p>
                </div>
                <button
                  onClick={() => dismissPopup(notification.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Toggle Button for Notifications */}
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`
              fixed top-20 right-4 z-[99] p-2 rounded-full shadow-lg border transition-all
              ${visiblePopups.length > 0 ? "translate-x-[-340px]" : ""}
              ${isEnabled
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border"
              }
            `}
            title={isEnabled ? "알림 끄기" : "알림 켜기"}
            style={{ display: visiblePopups.length > 0 ? 'none' : 'flex' }}
          >
            <Bell className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Overlay Animation Style */}
      <style jsx global>{`
        @keyframes pulse-overlay {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </EventNotificationContext.Provider>
  )
}
