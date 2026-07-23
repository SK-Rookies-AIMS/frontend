import { useEffect, useRef, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

import { AgvOperationResponse } from "@/types/agv";
import {
    ProcessFlowAgv,
    toProcessFlowAgvs,
} from "@/lib/agv-mapper";

const WS_URL = "/ws";

export function useAgvWebsocket() {
    const [agvs, setAgvs] = useState<ProcessFlowAgv[]>([]);
    const latestDtos = useRef<AgvOperationResponse[]>([]);
    const clientRef = useRef<Client | null>(null);

    async function loadInitialAgvs() {

        try {
            const response = await fetch("/api/main/process-flow", {
                credentials: "include",
            });

            if (!response.ok) {
                console.error("[AGV] initial fetch failed", response.status);
                return;
            }

            const body = await response.json();
            latestDtos.current = body.data?.agvs ?? [];
        } catch (e) {
            console.error("[AGV] initial fetch failed", e);
        }

    }

    useEffect(() => {
        let animationId = 0;

        const connect = async () => {
            await loadInitialAgvs();

            const client = new Client({
                webSocketFactory: () => new SockJS(WS_URL),

                reconnectDelay: 3000,

                debug: (str) => {
                    console.log("[STOMP]", str);
                },

                onConnect: () => {
                    console.log("[WS] connected");

                    client.subscribe("/topic/agv", (message) => {
                        try {
                            latestDtos.current = JSON.parse(
                                message.body
                            ) as AgvOperationResponse[];
                        } catch (e) {
                            console.error(e);
                        }
                    });
                },

                onDisconnect: () => {
                    console.log("[WS] disconnected");
                },

                onStompError: (frame) => {
                    console.error(frame);
                },

                onWebSocketError: (e) => {
                    console.error(e);
                },
            });

            client.activate();
            clientRef.current = client;
        };

        connect();

        const animate = () => {
            setAgvs(toProcessFlowAgvs(latestDtos.current, Date.now()));
            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationId);
            clientRef.current?.deactivate();
        };
    }, []);

    return agvs;
}