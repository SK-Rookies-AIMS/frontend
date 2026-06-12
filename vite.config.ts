import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  // 로컬 개발 환경용 게이트웨이(프록시) 설정
  server: {
    proxy: {
      // 1. 메인 백엔드 라우팅 (/api/...)
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      // 2. 제조 서비스 백엔드 라우팅 (/api/inspection/...)
      "/api/quality/inspection": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
      // 3. 품질 서비스 백엔드 라우팅 (/api/process/...)
      "/api/process": {
        target: "http://localhost:8083",
        changeOrigin: true,
      },
    },
  },
});