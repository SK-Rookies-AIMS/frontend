import { Client } from "@stomp/stompjs";

type WebSocketCallbacks = {
  onSummary?: (data: any) => void;
  onProcess?: (data: any) => void;
  onStatus?: (data: any) => void;
  onDrive?: (data: any) => void;
};

let client: Client | null = null;

export function connectWebSocket(callbacks: WebSocketCallbacks) {

  if (client?.active) {
    return () => {};
  }

  client = new Client({
    brokerURL: `${import.meta.env.VITE_WS_URL}/ws`,

    reconnectDelay: 5000,

    debug: (str) => {
      console.log("[STOMP]", str);
    },

    onConnect: () => {

      console.log("✅ WebSocket Connected");

      client?.subscribe("/topic/summary", (message) => {

        callbacks.onSummary?.(
          JSON.parse(message.body)
        );

      });

      client?.subscribe("/topic/process", (message) => {

        callbacks.onProcess?.(
          JSON.parse(message.body)
        );

      });

      client?.subscribe("/topic/status-detail", (message) => {

        callbacks.onStatus?.(
          JSON.parse(message.body)
        );

      });

      client?.subscribe("/topic/drive-detail", (message) => {

        callbacks.onDrive?.(
          JSON.parse(message.body)
        );

      });

    },

    onStompError: (frame) => {

      console.error(
        "STOMP Error",
        frame.headers["message"]
      );

      console.error(frame.body);

    },

    onWebSocketError: (event) => {

      console.error(
        "WebSocket Error",
        event
      );

    }

  });

  client.activate();

  return () => {

    client?.deactivate();
    client = null;

  };

}