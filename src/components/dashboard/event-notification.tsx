"use client"

import { useState, useRef, useEffect, createContext, useContext } from "react"
import { useLocation } from "react-router-dom"
import { AlertTriangle, X, Bell } from "lucide-react"
import { type EventItem, type EventStatus } from "@/lib/events-data"
import { useAlertWebSocket } from "@/hooks/use-alert-websocket"
import { AlertRealtimeMessage } from "@/types/alert"

interface EventNotificationContextValue {
  /** 이벤트 페이지 공유용 — 더미 제거 후 빈 배열, API 연동 시 교체 예정 */
  events: EventItem[]
  updateEventStatus: (id: number, status: EventStatus) => void
  /** 마스코트 안내용 — 현재 미사용 (null 고정), 실시간 알람은 realtimeAlerts 사용 */
  topEvent: null
  activeCount: number
  /** WebSocket 수신 알람 (priorityScore 내림차순) */
  realtimeAlerts: AlertRealtimeMessage[]
  wsConnected: boolean
}

const EventNotificationContext = createContext<EventNotificationContextValue>({
  events: [],
  updateEventStatus: () => {},
  topEvent: null,
  activeCount: 0,
  realtimeAlerts: [],
  wsConnected: false,
})

export function useMascotAlert() {
  return useContext(EventNotificationContext)
}

export function useEvents() {
  return useContext(EventNotificationContext)
}

// severity 코드 → 한글 표시
const SEVERITY_LABEL: Record<string, "위험" | "경고"> = {
  DANGER: "위험",
  CAUTION: "경고",
}

export function EventNotificationProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isAuthPage = pathname === "/login" || pathname === "/signup"

  const [isEnabled, setIsEnabled] = useState(true)
  const [showOverlay, setShowOverlay] = useState(false)

  // ── 실시간 WebSocket 알람 ──────────────────────────────────────
  const { alerts: realtimeAlerts, connected: wsConnected } = useAlertWebSocket()

  // 팝업을 X로 닫은 eventId 목록
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  // DANGER 알람이 신규 수신될 때 화면 오버레이 강조 (중복 방지)
  const alertedIdsRef = useRef<Set<string>>(new Set())
  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isAuthPage || !isEnabled) {
      setShowOverlay(false)
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current)
      }
      return
    }

    const newDangerAlerts = realtimeAlerts.filter(
      (a) => a.severity === "DANGER" && !alertedIdsRef.current.has(a.eventId)
    )

    if (newDangerAlerts.length > 0) {
      newDangerAlerts.forEach((a) => alertedIdsRef.current.add(a.eventId))
      setShowOverlay(true)

      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current)
      }
      overlayTimerRef.current = setTimeout(() => {
        setShowOverlay(false)
      }, 3000)
    }
  }, [realtimeAlerts.map((a) => a.eventId).join(","), isAuthPage, isEnabled])

  // 컴포넌트 unmount 시에만 남아 있는 타이머 정리
  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current)
      }
    }
  }, [])

  // 화면에 떠 있는 팝업 — dismiss 제외, 최대 3개, priorityScore 이미 내림차순 정렬됨
  const visiblePopups = realtimeAlerts
    .filter((a) => !dismissedIds.includes(a.eventId))
    .slice(0, 3)

  const dismissPopup = (eventId: string) => {
    setDismissedIds((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]))
  }
  // ─────────────────────────────────────────────────────────────

  return (
    <EventNotificationContext.Provider
      value={{
        events: [],
        updateEventStatus: () => {},
        topEvent: null,
        activeCount: isAuthPage ? 0 : realtimeAlerts.length,
        realtimeAlerts,
        wsConnected,
      }}
    >
      {children}

      {!isAuthPage && (
        <>
          {/* Screen Overlay — DANGER 알람 수신 시 3초간 빨간 반투명 강조 */}
          {showOverlay && (
            <div
              className="fixed inset-0 z-[90] pointer-events-none animate-in fade-in duration-300 bg-destructive/40"
              style={{ animation: "pulse-overlay 1s ease-in-out infinite" }}
            />
          )}

          {/* 알람 팝업 — WebSocket 수신 알람만 표시 (priorityScore 내림차순, 최대 3개) */}
          <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm">
            {visiblePopups.map((alert) => {
              const severityLabel = SEVERITY_LABEL[alert.severity] ?? "경고"
              const isDanger = alert.severity === "DANGER"
              return (
                <div
                  key={alert.eventId}
                  className={`
                    flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm
                    animate-in slide-in-from-right-5 duration-300
                    ${isDanger
                      ? "bg-destructive/10 border-destructive/50 text-destructive"
                      : "bg-warning/10 border-warning/50 text-warning"
                    }
                  `}
                >
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      ${isDanger ? "bg-destructive/20" : "bg-warning/20"}
                    `}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          isDanger ? "bg-destructive/20" : "bg-warning/20"
                        }`}
                      >
                        {severityLabel}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        P{alert.priorityScore.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{alert.contents}</p>
                  </div>
                  <button
                    onClick={() => dismissPopup(alert.eventId)}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* 알림 켜기/끄기 버튼 — 팝업이 없을 때만 표시 */}
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
            style={{ display: visiblePopups.length > 0 ? "none" : "flex" }}
          >
            <Bell className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Overlay Animation */}
      <style>{`
        @keyframes pulse-overlay {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </EventNotificationContext.Provider>
  )
}
