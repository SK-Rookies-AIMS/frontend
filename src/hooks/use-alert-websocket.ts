import { useEffect, useRef, useState } from "react"
import { Client } from "@stomp/stompjs"
import SockJS from "sockjs-client"

import { AlertRealtimeMessage } from "@/types/alert"

// const WS_URL = __ALERT_WS_URL__;
const WS_URL = "/ws";

const ALERT_TOPIC = "/topic/alerts"

/** priorityScore 내림차순 정렬 */
function sortByPriority(alerts: AlertRealtimeMessage[]): AlertRealtimeMessage[] {
    return [...alerts].sort((a, b) => b.priorityScore - a.priorityScore)
}

export interface UseAlertWebSocketResult {
    /** priorityScore 내림차순으로 정렬된 알람 목록 */
    alerts: AlertRealtimeMessage[]
    /** WebSocket 연결 상태 */
    connected: boolean
    /** 특정 eventId의 알람을 목록에서 제거 (팝업 dismiss 등) */
    dismiss: (eventId: string) => void
}

export function useAlertWebSocket(): UseAlertWebSocketResult {

    const [alerts, setAlerts] =
        useState<AlertRealtimeMessage[]>([])

    const [connected, setConnected] =
        useState(false)

    const clientRef =
        useRef<Client | null>(null)

    useEffect(() => {

        const client = new Client({

            webSocketFactory: () => {
                console.log("[Alert WS] SockJS URL:", WS_URL)
                return new SockJS(WS_URL)
            },

            reconnectDelay: 5000,

            onConnect: () => {

                setConnected(true)
                console.log("[Alert WS] connected →", ALERT_TOPIC)

                client.subscribe(ALERT_TOPIC, (frame) => {

                    try {

                        const message: AlertRealtimeMessage =
                            JSON.parse(frame.body)

                        console.log("[Alert WS] 알람 메시지 수신:", message)

                        setAlerts((prev) => {
                            const filtered = prev.filter((a) => a.eventId !== message.eventId)
                            return sortByPriority([message, ...filtered])
                        })

                    } catch (e) {

                        console.error("[Alert WS] 메시지 파싱 실패", e)

                    }

                })

            },

            onDisconnect: () => {

                setConnected(false)
                console.warn("[Alert WS] disconnected")

            },

            onStompError: (frame) => {

                console.error("[Alert WS] STOMP error", frame)

            },

            onWebSocketError: (e) => {

                console.error("[Alert WS] WebSocket error", e)

            },

        })

        client.activate()
        clientRef.current = client

        return () => {
            clientRef.current?.deactivate()
        }

    }, [])

    const dismiss = (eventId: string) => {
        setAlerts((prev) =>
            prev.filter((a) => a.eventId !== eventId)
        )
    }

    return { alerts, connected, dismiss }
}
