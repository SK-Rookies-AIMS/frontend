import { useEffect, useRef, useState } from "react"
import { Client } from "@stomp/stompjs"
import SockJS from "sockjs-client"

import { AlertRealtimeMessage } from "@/types/alert"

const WS_URL =
    import.meta.env.VITE_SOCKJS_URL ??
    `${window.location.origin}/ws`

const ALERT_TOPIC = "/topic/alerts"

function sortByPriority(alerts: AlertRealtimeMessage[]): AlertRealtimeMessage[] {
    return [...alerts].sort((a, b) => b.priorityScore - a.priorityScore)
}

export interface UseAlertWebSocketResult {
    alerts: AlertRealtimeMessage[]
    connected: boolean
    dismiss: (eventId: string) => void
}

export function useAlertWebSocket(): UseAlertWebSocketResult {
    const [alerts, setAlerts] = useState<AlertRealtimeMessage[]>([])
    const [connected, setConnected] = useState(false)
    const clientRef = useRef<Client | null>(null)

    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            reconnectDelay: 5000,
            onConnect: () => {
                setConnected(true)
                console.log("[Alert WS] connected", ALERT_TOPIC)

                client.subscribe(ALERT_TOPIC, (frame) => {
                    try {
                        const message: AlertRealtimeMessage = JSON.parse(frame.body)

                        console.log("[Alert WS] received alert message:", message)

                        setAlerts((prev) => {
                            const filtered = prev.filter((a) => a.eventId !== message.eventId)
                            return sortByPriority([message, ...filtered])
                        })
                    } catch (e) {
                        console.error("[Alert WS] message parse failed", e)
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
        setAlerts((prev) => prev.filter((a) => a.eventId !== eventId))
    }

    return { alerts, connected, dismiss }
}