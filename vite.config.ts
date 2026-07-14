import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const ALERT_WS_URLS = {
  development: "http://localhost:8081/ws",
  production: "https://aims-factory.com/api/ws",
} as const;

export default defineConfig(({ mode }) => {
  const alertWebSocketUrl =
    mode === "development"
      ? ALERT_WS_URLS.development
      : ALERT_WS_URLS.production;

  return {
    plugins: [react()],
    define: {
      global: "globalThis",
      __ALERT_WS_URL__: JSON.stringify(alertWebSocketUrl),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },

    server: {
      proxy: {
        // "/ws": {
        //   target: "http://localhost:8081",
        //   changeOrigin: true,
        //   ws: true,
        // },
        "/api/ai": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
        "/api/quality/inspection": {
          target: "http://localhost:8083",
          changeOrigin: true,
        },
        "/api/process": {
          target: "http://localhost:8082",
          changeOrigin: true,
        },
        "/api": {
          target: "http://localhost:8081",
          changeOrigin: true,
        },
      },
    },
  };
});
