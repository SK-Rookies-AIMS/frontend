import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
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
});