"use client"

import { useEffect, useMemo, useState } from "react"
import { Truck } from "lucide-react"

type AgvStatus = "WAITING" | "MOVING" | "RETURNING"
type AgvPhase = "WAIT_START" | "MOVING" | "WAIT_END" | "RETURNING"

type Agv = {
  id: string
  routeIndex: number
  laneIndex: number
  progress: number
  status: AgvStatus
  phase: AgvPhase
  waitTick: number
  speed: number
}

const SVG_WIDTH = 1500
const SVG_HEIGHT = 230 // 200 -> 230 으로 높이 확대

const PROCESS_Y = 40 // Y 위치 조정 (상하단 여백 최적화)
const PROCESS_WIDTH = 132 // 110 -> 132 로 확대
const PROCESS_HEIGHT = 92 // 80 -> 92 로 확대

// 박스 중앙 Y
const PROCESS_CENTER_Y = PROCESS_Y + PROCESS_HEIGHT / 2 // 40 + 46 = 86

// 레인 간격 및 시작 Y (5개 레인을 박스 중앙 기준으로 수직 정렬)
const LANE_GAP = 15.5 // 13 -> 15.5 로 넓혀서 AGV 간 세로 간격 가시성 확보
const LANE_COUNT = 5
const LANE_START_Y = PROCESS_CENTER_Y - ((LANE_COUNT - 1) / 2) * LANE_GAP // 86 - 2 * 15.5 = 55

const PROCESS_NODES = [
  { name: "프레스", x: 30 },
  { name: "차체", x: 340 },
  { name: "도장", x: 650 },
  { name: "의장", x: 960 },
  { name: "최종검사", x: 1270 },
]

const ROUTES = [
  { routeName: "AGV 1~5", fromX: 162, toX: 340, agvStart: 1 },
  { routeName: "AGV 6~10", fromX: 472, toX: 650, agvStart: 6 },
  { routeName: "AGV 11~15", fromX: 782, toX: 960, agvStart: 11 },
  { routeName: "AGV 16~20", fromX: 1092, toX: 1270, agvStart: 16 },
]

const WAIT_START_TICK = 60
const WAIT_END_TICK = 40

const createInitialAgvs = (): Agv[] => {
  const agvs: Agv[] = []

  ROUTES.forEach((route, routeIndex) => {
    for (let laneIndex = 0; laneIndex < 5; laneIndex++) {
      const agvNumber = route.agvStart + laneIndex
      let status: AgvStatus = "WAITING"
      let phase: AgvPhase = "WAIT_START"
      let progress = 0
      let waitTick = laneIndex * 15

      if (laneIndex === 0) { status = "MOVING"; phase = "MOVING"; progress = 0.3 }
      if (laneIndex === 3) { status = "RETURNING"; phase = "RETURNING"; progress = 0.7 }

      agvs.push({
        id: `AGV-${String(agvNumber).padStart(2, "0")}`,
        routeIndex,
        laneIndex,
        progress,
        status,
        phase,
        waitTick,
        speed: 0.003 + laneIndex * 0.00025,
      })
    }
  })

  return agvs
}

const getStatusColor = (status: AgvStatus) => {
  if (status === "MOVING") return "#22d3ee"
  if (status === "RETURNING") return "#a855f7"
  return "#eab308"
}

const getStatusLabel = (status: AgvStatus) => {
  if (status === "MOVING") return "운반"
  if (status === "RETURNING") return "복귀"
  return "대기"
}

export function ProcessFlow() {
  const [agvs, setAgvs] = useState<Agv[]>(createInitialAgvs())

  useEffect(() => {
    const interval = setInterval(() => {
      setAgvs((prev) =>
        prev.map((agv) => {
          if (agv.phase === "WAIT_START") {
            const nextTick = agv.waitTick + 1
            if (nextTick >= WAIT_START_TICK) {
              return { ...agv, status: "MOVING", phase: "MOVING", waitTick: 0 }
            }
            return { ...agv, status: "WAITING", waitTick: nextTick }
          }

          if (agv.phase === "MOVING") {
            const nextProgress = agv.progress + agv.speed
            if (nextProgress >= 1) {
              return { ...agv, progress: 1, status: "WAITING", phase: "WAIT_END", waitTick: 0 }
            }
            return { ...agv, progress: nextProgress, status: "MOVING" }
          }

          if (agv.phase === "WAIT_END") {
            const nextTick = agv.waitTick + 1
            if (nextTick >= WAIT_END_TICK) {
              return { ...agv, status: "RETURNING", phase: "RETURNING", waitTick: 0 }
            }
            return { ...agv, status: "WAITING", waitTick: nextTick }
          }

          if (agv.phase === "RETURNING") {
            const nextProgress = agv.progress - agv.speed
            if (nextProgress <= 0) {
              return { ...agv, progress: 0, status: "WAITING", phase: "WAIT_START", waitTick: 0 }
            }
            return { ...agv, progress: nextProgress, status: "RETURNING" }
          }

          return agv
        }),
      )
    }, 80)

    return () => clearInterval(interval)
  }, [])

  const movingCount = useMemo(() => agvs.filter((a) => a.status === "MOVING").length, [agvs])
  const returningCount = useMemo(() => agvs.filter((a) => a.status === "RETURNING").length, [agvs])
  const waitingCount = useMemo(() => agvs.filter((a) => a.status === "WAITING").length, [agvs])

  const getAgvPosition = (agv: Agv) => {
    const route = ROUTES[agv.routeIndex]
    const x = route.fromX + (route.toX - route.fromX) * agv.progress
    const y = LANE_START_Y + agv.laneIndex * LANE_GAP
    return { x, y }
  }

  return (
    <div className="bg-[#0b1329]/80 backdrop-blur-md rounded-xl border border-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.05)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <h2 className="text-sm font-semibold tracking-wider text-cyan-100 uppercase">AGV 실시간 물류 흐름 관제 Dashboard</h2>
        </div>
        <div className="flex gap-6 text-xs font-bold text-slate-300">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
            <span>운반</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
            <span>복귀</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.6)] animate-pulse" />
            <span>대기</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        <div className="flex-1 rounded-xl bg-[#02050c] border border-slate-800/80 p-4 relative overflow-hidden">
          <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="h-[230px] w-full select-none">
            <defs>
              {/* 배경 그리드 패턴 */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.25" />
                <circle cx="40" cy="40" r="1.2" fill="#00f2fe" opacity="0.15" />
              </pattern>

              {/* 네온 글로우 필터 */}
              <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComponentTransfer in="blur" result="glow1">
                  <feFuncA type="linear" slope="0.8" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode in="glow1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-purple" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComponentTransfer in="blur" result="glow1">
                  <feFuncA type="linear" slope="0.8" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode in="glow1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-yellow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComponentTransfer in="blur" result="glow1">
                  <feFuncA type="linear" slope="0.8" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode in="glow1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* 스테이션 몸체 메탈 그라데이션 */}
              <linearGradient id="stationBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#273549" />
                <stop offset="60%" stopColor="#151e2b" />
                <stop offset="100%" stopColor="#0a0f18" />
              </linearGradient>

              {/* 스테이션 3D 상단 덮개 그라데이션 */}
              <linearGradient id="stationTop" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3d4f68" />
                <stop offset="50%" stopColor="#5c7394" />
                <stop offset="100%" stopColor="#3d4f68" />
              </linearGradient>

              {/* 스테이션 측면 음영 그라데이션 */}
              <linearGradient id="stationSide" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#111924" />
                <stop offset="100%" stopColor="#05080d" />
              </linearGradient>

              {/* 홀로그램 보드 그라데이션 */}
              <linearGradient id="hologramGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.05" />
              </linearGradient>

              {/* AGV 몸체 그라데이션 */}
              <linearGradient id="agvBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="50%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>

              {/* AGV 화물 3D 그라데이션 */}
              <linearGradient id="cargoTop" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
              <linearGradient id="cargoFront" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0891b2" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <linearGradient id="cargoSide" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0e7490" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
            </defs>

            <style>{`
              @keyframes track-flow-right {
                from { stroke-dashoffset: 24; }
                to { stroke-dashoffset: 0; }
              }
              @keyframes track-flow-left {
                from { stroke-dashoffset: 0; }
                to { stroke-dashoffset: 24; }
              }
              @keyframes led-blink {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 1; }
              }
              @keyframes robotic-spark {
                0%, 100% { transform: scale(0.6) rotate(0deg); opacity: 0.3; }
                50% { transform: scale(1.3) rotate(45deg); opacity: 1; }
              }
              @keyframes holographic-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-3px); }
              }
              .track-right {
                animation: track-flow-right 1.4s linear infinite;
              }
              .track-left {
                animation: track-flow-left 1.4s linear infinite;
              }
              .led-blink-cyan {
                animation: led-blink 1s ease-in-out infinite;
                fill: #22d3ee;
              }
              .led-blink-purple {
                animation: led-blink 1s ease-in-out infinite;
                fill: #a855f7;
              }
              .led-blink-yellow {
                animation: led-blink 1.2s ease-in-out infinite;
                fill: #eab308;
              }
              .spark-anim {
                animation: robotic-spark 0.6s ease-in-out infinite;
                transform-origin: center;
              }
              .hologram-float {
                animation: holographic-float 3.5s ease-in-out infinite;
              }
            `}</style>

            {/* 배경 그리드 적용 */}
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* 레인 라인 */}
            {ROUTES.map((route, routeIndex) => (
              <g key={route.routeName}>
                {/* 루트 이름 라벨 — 박스 위에 표시 */}
                <g>
                  <rect
                    x={route.fromX + (route.toX - route.fromX) / 2 - 40}
                    y={PROCESS_Y - 14}
                    width={80} height={14}
                    rx={3.5}
                    fill="#010409"
                    stroke="#1e3a8a" strokeWidth={1.2}
                  />
                  <text
                    x={route.fromX + (route.toX - route.fromX) / 2}
                    y={PROCESS_Y - 4}
                    textAnchor="middle"
                    fill="#93c5fd" fontSize={8} fontWeight={800}
                    letterSpacing="0.3px"
                  >
                    {route.routeName}
                  </text>
                </g>

                {Array.from({ length: LANE_COUNT }, (_, laneIndex) => {
                  const laneY = LANE_START_Y + laneIndex * LANE_GAP
                  return (
                    <g key={`${routeIndex}-${laneIndex}`}>
                      {/* L1~L5 라인 번호 배지 */}
                      <g>
                        <rect
                          x={route.fromX - 28} y={laneY - 6.5}
                          width={17} height={13} rx={3}
                          fill="#090f1e" stroke="#1e293b" strokeWidth={1}
                        />
                        <text
                          x={route.fromX - 19.5} y={laneY + 3.5}
                          textAnchor="middle"
                          fill="#64748b" fontSize={8} fontWeight={900}
                        >
                          L{laneIndex + 1}
                        </text>
                      </g>

                      {/* 1. 정방향 레인 (운반, 상단 레일) */}
                      {/* 물리 레일 베이스 */}
                      <line
                        x1={route.fromX} y1={laneY - 3}
                        x2={route.toX} y2={laneY - 3}
                        stroke="#090d16" strokeWidth={5} strokeLinecap="round"
                      />
                      <line
                        x1={route.fromX} y1={laneY - 3}
                        x2={route.toX} y2={laneY - 3}
                        stroke="#223147" strokeWidth={2.8} strokeLinecap="round"
                      />
                      {/* 네온 흐름 전류 */}
                      <line
                        x1={route.fromX} y1={laneY - 3}
                        x2={route.toX} y2={laneY - 3}
                        stroke="#22d3ee" strokeWidth={1.4}
                        strokeDasharray="8 14"
                        className="track-right"
                        filter="url(#glow-cyan)"
                      />

                      {/* 2. 역방향 레인 (복귀, 하단 레일) */}
                      {/* 물리 레일 베이스 */}
                      <line
                        x1={route.toX} y1={laneY + 3}
                        x2={route.fromX} y2={laneY + 3}
                        stroke="#090d16" strokeWidth={5} strokeLinecap="round"
                      />
                      <line
                        x1={route.toX} y1={laneY + 3}
                        x2={route.fromX} y2={laneY + 3}
                        stroke="#223147" strokeWidth={2.8} strokeLinecap="round"
                      />
                      {/* 네온 흐름 전류 */}
                      <line
                        x1={route.toX} y1={laneY + 3}
                        x2={route.fromX} y2={laneY + 3}
                        stroke="#a855f7" strokeWidth={1.4}
                        strokeDasharray="8 14"
                        className="track-left"
                        filter="url(#glow-purple)"
                      />
                    </g>
                  )
                })}
              </g>
            ))}

            {/* 공정 박스 - 2.5D 스마트 팩토리 건물동 */}
            {PROCESS_NODES.map((node) => {
              const { x, name } = node
              const baseHeight = 11 // 바닥판 높이
              const mainY = PROCESS_Y + 12 // 메인 바디 시작 Y
              const mainHeight = PROCESS_HEIGHT - 12 // 메인 바디 높이

              // 공정별 세부 개성 요소 정의
              let processDecorations = null
              switch (name) {
                case "프레스":
                  processDecorations = (
                    <g>
                      {/* 묵직한 유압 프레스 실린더 지지 기둥 2개 */}
                      <rect x={x + 36} y={mainY - 14} width={10} height={16} fill="#475569" stroke="#1e293b" strokeWidth="1" />
                      <rect x={x + PROCESS_WIDTH - 46} y={mainY - 14} width={10} height={16} fill="#475569" stroke="#1e293b" strokeWidth="1" />
                      {/* 기계 윗헤드 철판 */}
                      <rect x={x + 28} y={mainY - 16} width={PROCESS_WIDTH - 56} height={5} fill="#1e293b" rx={1} stroke="#334155" strokeWidth="0.8" />
                      
                      {/* 대형 압력 계기판 */}
                      <circle cx={x + PROCESS_WIDTH / 2} cy={mainY + 28} r="8" fill="#090f1e" stroke="#64748b" strokeWidth="1.2" />
                      <path d={`M ${x + PROCESS_WIDTH / 2 - 5} ${mainY + 28} L ${x + PROCESS_WIDTH / 2 + 5} ${mainY + 28}`} stroke="#64748b" strokeWidth="0.8" />
                      <line x1={x + PROCESS_WIDTH / 2} y1={mainY + 28} x2={x + PROCESS_WIDTH / 2 + 4} y2={mainY + 23} stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
                      
                      {/* 경고 노란 스크롤 라인 */}
                      <rect x={x + 25} y={mainY + mainHeight - 14} width={PROCESS_WIDTH - 50} height={3} fill="#eab308" />
                    </g>
                  )
                  break
                case "차체":
                  processDecorations = (
                    <g>
                      {/* 철골 용접 공장 지붕 프레임 트러스 데코 */}
                      <path d={`M ${x + 12} ${mainY} L ${x + PROCESS_WIDTH / 2} ${mainY - 12} L ${x + PROCESS_WIDTH - 12} ${mainY}`} fill="none" stroke="#475569" strokeWidth="1.8" />
                      <line x1={x + 35} y1={mainY} x2={x + 35} y2={mainY - 6} stroke="#475569" strokeWidth="1" />
                      <line x1={x + PROCESS_WIDTH - 35} y1={mainY} x2={x + PROCESS_WIDTH - 35} y2={mainY - 6} stroke="#475569" strokeWidth="1" />
                      <line x1={x + PROCESS_WIDTH / 2} y1={mainY} x2={x + PROCESS_WIDTH / 2} y2={mainY - 12} stroke="#475569" strokeWidth="1.5" />
                      
                      {/* 정밀 조립용 로봇 암 단순 구현 */}
                      <path d={`M ${x + 24} ${mainY + 36} L ${x + 40} ${mainY + 20} L ${x + 58} ${mainY + 28}`} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx={x + 24} cy={mainY + 36} r="3.5" fill="#1e293b" stroke="#334155" />
                      <circle cx={x + 40} cy={mainY + 20} r="3" fill="#1e293b" stroke="#334155" />
                      {/* 스파크 애니메이션 효과 */}
                      <g transform={`translate(${x + 58}, ${mainY + 28})`}>
                        <polygon points="-4,0 4,0 0,-4" fill="#eab308" className="spark-anim" />
                        <polygon points="0,-4 0,4 -4,0" fill="#f97316" className="spark-anim" />
                      </g>
                    </g>
                  )
                  break
                case "도장":
                  processDecorations = (
                    <g>
                      {/* 상단 공기 정화 순환 배기 덕트 관 */}
                      <path d={`M ${x + PROCESS_WIDTH / 2 - 12} ${mainY - 14} L ${x + PROCESS_WIDTH / 2 - 12} ${mainY - 4} L ${x + PROCESS_WIDTH / 2 + 12} ${mainY - 4} L ${x + PROCESS_WIDTH / 2 + 12} ${mainY - 14}`} fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="square" />
                      <circle cx={x + PROCESS_WIDTH / 2} cy={mainY - 9} r="4.5" fill="#334155" />
                      
                      {/* 클린 모니터링 대형 윈도우 */}
                      <rect x={x + 22} y={mainY + 16} width={PROCESS_WIDTH - 44} height={22} fill="#0e7490" fillOpacity="0.25" rx="2" stroke="#0891b2" strokeWidth="1.5" filter="url(#glow-cyan)" />
                      {/* 클린 윈도우 투명 유리 사선 반사광 */}
                      <line x1={x + 35} y1={mainY + 33} x2={x + 50} y2={mainY + 21} stroke="#ffffff" strokeWidth="1.2" opacity="0.35" />
                      <line x1={x + PROCESS_WIDTH - 50} y1={mainY + 33} x2={x + PROCESS_WIDTH - 35} y2={mainY + 21} stroke="#ffffff" strokeWidth="1.2" opacity="0.35" />
                    </g>
                  )
                  break
                case "의장":
                  processDecorations = (
                    <g>
                      {/* 지붕 조립용 이송 캐리어 레일 부속 */}
                      <circle cx={x + 36} cy={mainY - 6} r="6.5" fill="#334155" stroke="#1e293b" />
                      <circle cx={x + 46} cy={mainY - 6} r="4.5" fill="#475569" stroke="#1e293b" />
                      <line x1={x + 36} y1={mainY - 6} x2={x + 46} y2={mainY - 6} stroke="#334155" strokeWidth="1.5" />
                      
                      {/* 전면 제어 콘솔 오실로스코프 파형 판넬 */}
                      <rect x={x + 22} y={mainY + 15} width={PROCESS_WIDTH - 44} height={18} fill="#010409" rx={2} stroke="#334155" strokeWidth="1" />
                      <path d={`M ${x + 26} ${mainY + 24} Q ${x + 36} ${mainY + 16} ${x + 46} ${mainY + 24} T ${x + 66} ${mainY + 24} T ${x + 86} ${mainY + 24}`} fill="none" stroke="#22c55e" strokeWidth="1.2" strokeDasharray="3 1.5" />
                      {/* 보조 작동 램프 */}
                      <circle cx={x + PROCESS_WIDTH - 30} cy={mainY + 24} r="2" fill="#ef4444" className="led-blink-cyan" />
                    </g>
                  )
                  break
                case "최종검사":
                  processDecorations = (
                    <g>
                      {/* 다각도 정밀 비전 카메라 검사 헤드 */}
                      <circle cx={x + PROCESS_WIDTH / 2} cy={mainY - 9} r="4.5" fill="#090f1e" stroke="#94a3b8" strokeWidth="1.2" />
                      <line x1={x + PROCESS_WIDTH / 2} y1={mainY - 9} x2={x + PROCESS_WIDTH / 2} y2={mainY} stroke="#94a3b8" strokeWidth="1.5" />
                      
                      {/* 레이저 스캔 아치 포탈 가상 레이저망 */}
                      <rect x={x + 18} y={mainY + 8} width={PROCESS_WIDTH - 36} height={mainHeight - 10} fill="none" stroke="#22c55e" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.65" />
                      {/* 네온 레이저 수평 스캔 빔 2라인 */}
                      <line x1={x + 18} y1={mainY + 20} x2={x + PROCESS_WIDTH - 18} y2={mainY + 20} stroke="#22c55e" strokeWidth="1.8" filter="url(#glow-cyan)" opacity="0.9" />
                      <line x1={x + 18} y1={mainY + 34} x2={x + PROCESS_WIDTH - 18} y2={mainY + 34} stroke="#22c55e" strokeWidth="1.8" filter="url(#glow-cyan)" opacity="0.9" />
                    </g>
                  )
                  break
              }

              return (
                <g key={name}>
                  {/* 바닥면 그림자 및 2.5D 콘크리트 베이스 */}
                  <rect
                    x={x - 6} y={PROCESS_Y + PROCESS_HEIGHT - 1}
                    width={PROCESS_WIDTH + 12} height={6}
                    rx={3.5}
                    fill="#000" opacity="0.45"
                    filter="url(#glow-cyan)"
                  />
                  {/* 2.5D 바닥 기초 플레이트 (상단면) */}
                  <polygon
                    points={`
                      ${x - 6},${PROCESS_Y + PROCESS_HEIGHT}
                      ${x + PROCESS_WIDTH + 6},${PROCESS_Y + PROCESS_HEIGHT}
                      ${x + PROCESS_WIDTH + 11},${PROCESS_Y + PROCESS_HEIGHT + baseHeight}
                      ${x - 11},${PROCESS_Y + PROCESS_HEIGHT + baseHeight}
                    `}
                    fill="#151e2b" stroke="#0891b2" strokeWidth="1.2"
                  />
                  {/* 2.5D 바닥 기초 플레이트 (앞 두께면) */}
                  <polygon
                    points={`
                      ${x - 11},${PROCESS_Y + PROCESS_HEIGHT + baseHeight}
                      ${x + PROCESS_WIDTH + 11},${PROCESS_Y + PROCESS_HEIGHT + baseHeight}
                      ${x + PROCESS_WIDTH + 11},${PROCESS_Y + PROCESS_HEIGHT + baseHeight + 3}
                      ${x - 11},${PROCESS_Y + PROCESS_HEIGHT + baseHeight + 3}
                    `}
                    fill="#0284c7"
                  />

                  {/* 건물 좌측 셔터 입구 게이트 음영 */}
                  <rect
                    x={x} y={mainY}
                    width={10} height={mainHeight}
                    fill="url(#stationSide)"
                  />
                  {/* 정방향/역방향 레인이 통과하는 가상의 셔터 도어 개구부 (입구) */}
                  <path d={`M ${x + 2} ${mainY + 22} L ${x + 8} ${mainY + 22} L ${x + 8} ${mainY + mainHeight} L ${x + 2} ${mainY + mainHeight} Z`} fill="#010409" />
                  <line x1={x + 2} y1={mainY + 22} x2={x + 8} y2={mainY + 22} stroke="#eab308" strokeWidth="1" />

                  {/* 메인 건물 벽체 전면 */}
                  <rect
                    x={x + 10} y={mainY}
                    width={PROCESS_WIDTH - 20} height={mainHeight}
                    fill="url(#stationBody)"
                    stroke="#1a2536" strokeWidth="1.2"
                  />
                  {/* 전면 벽체 조립식 패널 세로 홈 디자인 */}
                  {Array.from({ length: 4 }, (_, i) => {
                    const lineX = x + 10 + ((PROCESS_WIDTH - 20) / 5) * (i + 1)
                    return (
                      <line
                        key={i}
                        x1={lineX} y1={mainY}
                        x2={lineX} y2={mainY + mainHeight}
                        stroke="#111924" strokeWidth="0.8"
                        opacity="0.6"
                      />
                    )
                  })}

                  {/* 건물 우측 셔터 출구 게이트 음영 */}
                  <rect
                    x={x + PROCESS_WIDTH - 10} y={mainY}
                    width={10} height={mainHeight}
                    fill="url(#stationSide)"
                  />
                  {/* 출구 개구부 */}
                  <path d={`M ${x + PROCESS_WIDTH - 8} ${mainY + 22} L ${x + PROCESS_WIDTH - 2} ${mainY + 22} L ${x + PROCESS_WIDTH - 2} ${mainY + mainHeight} L ${x + PROCESS_WIDTH - 8} ${mainY + mainHeight} Z`} fill="#010409" />
                  <line x1={x + PROCESS_WIDTH - 8} y1={mainY + 22} x2={x + PROCESS_WIDTH - 2} y2={mainY + 22} stroke="#eab308" strokeWidth="1" />

                  {/* 공장 3D 사다리꼴 지붕 (Top Roof) */}
                  <polygon
                    points={`
                      ${x},${mainY}
                      ${x + PROCESS_WIDTH},${mainY}
                      ${x + PROCESS_WIDTH - 8},${mainY - 6}
                      ${x + 8},${mainY - 6}
                    `}
                    fill="url(#stationTop)"
                    stroke="#3d4f68" strokeWidth="0.8"
                  />

                  {/* 건물 전면 네온 기둥 하이라이트 */}
                  <line
                    x1={x + 10} y1={mainY}
                    x2={x + 10} y2={mainY + mainHeight}
                    stroke="#06b6d4" strokeWidth="1.8" opacity="0.85" filter="url(#glow-cyan)"
                  />
                  <line
                    x1={x + PROCESS_WIDTH - 10} y1={mainY}
                    x2={x + PROCESS_WIDTH - 10} y2={mainY + mainHeight}
                    stroke="#06b6d4" strokeWidth="1.8" opacity="0.85" filter="url(#glow-cyan)"
                  />

                  {/* 건물 상단 경고 램프 LED (Blinking LED) */}
                  <circle cx={x + 18} cy={mainY + 12} r="2.8" className="led-blink-cyan" filter="url(#glow-cyan)" />
                  <circle cx={x + PROCESS_WIDTH - 18} cy={mainY + 12} r="2.8" className="led-blink-cyan" filter="url(#glow-cyan)" />

                  {/* 각 공정별 고유 기계 장식 렌더링 */}
                  {processDecorations}

                  {/* 3D 홀로그램 공정 안내 전광판 (Floating Hologram Plate) */}
                  <g className="hologram-float">
                    {/* 지지 기둥 핀 */}
                    <line x1={x + PROCESS_WIDTH / 2} y1={mainY - 6} x2={x + PROCESS_WIDTH / 2} y2={mainY - 18} stroke="#0891b2" strokeWidth="1.8" />

                    {/* 홀로그램 전광판 본체 */}
                    <rect
                      x={x + 10} y={mainY - 39}
                      width={PROCESS_WIDTH - 20} height={21}
                      rx={3.5}
                      fill="url(#hologramGrad)"
                      stroke="#06b6d4" strokeWidth="1.5"
                      filter="url(#glow-cyan)"
                    />

                    {/* 홀로그램 모서리 광학 브래킷 조각 */}
                    <path d={`M ${x + 13} ${mainY - 35} L ${x + 13} ${mainY - 37} L ${x + 17} ${mainY - 37}`} stroke="#22d3ee" strokeWidth="1" fill="none" />
                    <path d={`M ${x + PROCESS_WIDTH - 13} ${mainY - 35} L ${x + PROCESS_WIDTH - 13} ${mainY - 37} L ${x + PROCESS_WIDTH - 17} ${mainY - 37}`} stroke="#22d3ee" strokeWidth="1" fill="none" />
                    <path d={`M ${x + 13} ${mainY - 23} L ${x + 13} ${mainY - 21} L ${x + 17} ${mainY - 21}`} stroke="#22d3ee" strokeWidth="1" fill="none" />
                    <path d={`M ${x + PROCESS_WIDTH - 13} ${mainY - 23} L ${x + PROCESS_WIDTH - 13} ${mainY - 21} L ${x + PROCESS_WIDTH - 17} ${mainY - 21}`} stroke="#22d3ee" strokeWidth="1" fill="none" />

                    {/* 선명한 공정명 텍스트 */}
                    <text
                      x={x + PROCESS_WIDTH / 2}
                      y={mainY - 25}
                      textAnchor="middle"
                      fill="#f0f9ff"
                      fontSize={10.5}
                      fontWeight={900}
                      letterSpacing="1px"
                      style={{ textShadow: "0 0 8px rgba(6, 182, 212, 0.9)" }}
                    >
                      {name}
                    </text>
                  </g>
                </g>
              )
            })}

            {/* AGV 아이콘 */}
            {agvs.map((agv) => {
              const pos = getAgvPosition(agv)
              const color = getStatusColor(agv.status)
              const label = getStatusLabel(agv.status)
              const filterId = agv.status === "MOVING" ? "glow-cyan" : agv.status === "RETURNING" ? "glow-purple" : "glow-yellow"
              const isReturning = agv.status === "RETURNING"

              return (
                <g key={agv.id} transform={`translate(${pos.x},${pos.y})`}>
                  {/* 2.5D 타원형 파동 링 (그라운드 프로젝션 효과 - 크기 확대) */}
                  {agv.status !== "WAITING" && (
                    <ellipse
                      cx="0" cy="2"
                      rx="21" ry="8.5"
                      fill="none" stroke={color} strokeWidth="1.8" opacity="0.3"
                      filter={`url(#${filterId})`}
                    >
                      <animate attributeName="rx" values="21;27;21" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="ry" values="8.5;12;8.5" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.45;0.05;0.45" dur="1.5s" repeatCount="indefinite" />
                    </ellipse>
                  )}

                  {/* 로봇 몸체 - 방향 대칭 적용 (복귀할 때는 scaleX = -1) */}
                  <g transform={`scale(${isReturning ? -1 : 1}, 1)`}>
                    {/* 바퀴 4개 (입체 원통 느낌 - 크기 확대) */}
                    {/* 왼쪽 위 바퀴 */}
                    <rect x="-13" y="-14" width="6.5" height="3" rx="1" fill="#0c0e14" stroke="#475569" strokeWidth="0.5" />
                    {/* 오른쪽 위 바퀴 */}
                    <rect x="6.5" y="-14" width="6.5" height="3" rx="1" fill="#0c0e14" stroke="#475569" strokeWidth="0.5" />
                    {/* 왼쪽 아래 바퀴 */}
                    <rect x="-13" y="11" width="6.5" height="3" rx="1" fill="#0c0e14" stroke="#475569" strokeWidth="0.5" />
                    {/* 오른쪽 아래 바퀴 */}
                    <rect x="6.5" y="11" width="6.5" height="3" rx="1" fill="#0c0e14" stroke="#475569" strokeWidth="0.5" />

                    {/* 본체 범퍼/샤시 - 크기 확대 (가로 34, 세로 22) */}
                    <rect
                      x="-17" y="-11"
                      width="34" height="22"
                      rx="4"
                      fill="url(#agvBody)"
                      stroke="#475569" strokeWidth="1.2"
                    />

                    {/* 상태 지시 LED 라인 (로봇 측면) */}
                    <line x1="-12" y1="-8.5" x2="12" y2="-8.5" stroke={color} strokeWidth="1.5" opacity="0.85" filter={`url(#${filterId})`} />
                    <line x1="-12" y1="8.5" x2="12" y2="8.5" stroke={color} strokeWidth="1.5" opacity="0.85" filter={`url(#${filterId})`} />

                    {/* 라이더/센서 빔 (로봇 전면 - 우측부) */}
                    <path
                      d="M 17 -5.5 Q 21.5 0 17 5.5"
                      fill="none" stroke={color} strokeWidth="1.5"
                      filter={`url(#${filterId})`}
                      opacity="0.85"
                    />
                    {/* 레이저 포인트 */}
                    <circle cx="16" cy="0" r="1.5" fill={color} filter={`url(#${filterId})`} />

                    {/* 적재함 & 화물 */}
                    {agv.status === "MOVING" ? (
                      /* 운반 시 적재 화물 - 3D 큐브 느낌 확대 */
                      <g transform="translate(0, -1)">
                        {/* 3D 화물 상단면 */}
                        <polygon
                          points="-8,-9 5,-9 9,-5 -4,-5"
                          fill="url(#cargoTop)"
                          stroke="#22d3ee" strokeWidth="0.5"
                        />
                        {/* 3D 화물 정면 */}
                        <polygon
                          points="-4,-5 9,-5 9,2 -4,2"
                          fill="url(#cargoFront)"
                          stroke="#0891b2" strokeWidth="0.5"
                        />
                        {/* 3D 화물 측면 */}
                        <polygon
                          points="-8,-9 -4,-5 -4,2 -8,-2"
                          fill="url(#cargoSide)"
                          stroke="#0e7490" strokeWidth="0.5"
                        />
                      </g>
                    ) : (
                      /* 비적재/대기 시 본체 구동 판넬 슬롯 패턴 */
                      <g>
                        <rect x="-8" y="-4.5" width="16" height="9" fill="#010409" rx="1.5" stroke="#334155" strokeWidth="0.5" />
                        <line x1="-5" y1="-2" x2="5" y2="-2" stroke="#475569" strokeWidth="0.8" />
                        <line x1="-5" y1="1" x2="5" y2="1" stroke="#475569" strokeWidth="0.8" />
                        {/* 복귀 시 깜빡이는 지시등 */}
                        {isReturning && (
                          <circle cx="0" cy="-0.5" r="2.2" className="led-blink-purple" filter="url(#glow-purple)" />
                        )}
                        {agv.status === "WAITING" && (
                          <circle cx="0" cy="-0.5" r="2.2" className="led-blink-yellow" filter="url(#glow-yellow)" />
                        )}
                      </g>
                    )}
                  </g>

                  {/* AGV ID 라벨 (로봇 상단 - 텍스트 크기 확대 및 뱃지 확장) */}
                  <g transform="translate(0, -25)">
                    <rect
                      x="-23" y="-5"
                      width="46" height="10.5"
                      rx="3"
                      fill="#010409"
                      stroke={color} strokeWidth={1}
                      opacity="0.95"
                    />
                    <text
                      x="0" y="3.5"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="7.5"
                      fontWeight="900"
                      letterSpacing="0.4px"
                    >
                      {agv.id}
                    </text>
                  </g>

                  {/* 상태 라벨 (로봇 하단 - 크기 확대 및 캡슐화) */}
                  <g transform="translate(0, 24)">
                    <rect
                      x="-16" y="-4"
                      width="32" height="9.5"
                      rx="4.5"
                      fill="#090f1e"
                      stroke={color} strokeWidth={1}
                      opacity="0.95"
                    />
                    <text
                      x="0" y="3.5"
                      textAnchor="middle"
                      fill={color}
                      fontSize="7"
                      fontWeight="900"
                    >
                      {label}
                    </text>
                  </g>
                </g>
              )
            })}
          </svg>
        </div>

        {/* 사이드 패널 - Glassmorphism 적용 */}
        <div className="w-full lg:w-[210px] shrink-0 rounded-xl border border-cyan-500/10 bg-slate-900/60 backdrop-blur-md p-4 flex flex-col justify-between shadow-[0_0_15px_rgba(6,182,212,0.02)]">
          <div>
            <div className="mb-4 flex items-center gap-2 pb-2 border-b border-slate-800">
              <Truck className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span className="text-sm font-bold text-cyan-100 tracking-wider">AGV 관제 현황</span>
            </div>

            <div className="space-y-4">
              {/* 운반중 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-cyan-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
                    운반중
                  </span>
                  <span className="text-slate-100">{movingCount}대</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-500"
                    style={{ width: `${(movingCount / agvs.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* 복귀중 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-purple-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_4px_rgba(168,85,247,0.8)]" />
                    복귀중
                  </span>
                  <span className="text-slate-100">{returningCount}대</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] transition-all duration-500"
                    style={{ width: `${(returningCount / agvs.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* 대기중 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-yellow-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shadow-[0_0_4px_rgba(234,179,8,0.8)] animate-pulse" />
                    대기중
                  </span>
                  <span className="text-slate-100">{waitingCount}대</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.8)] transition-all duration-500"
                    style={{ width: `${(waitingCount / agvs.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-800 text-[10px] text-slate-400 space-y-1.5 font-medium leading-relaxed">
            <div className="flex justify-between">
              <span>AGV 수량:</span>
              <span className="text-slate-200">총 {agvs.length}대</span>
            </div>
            <div className="flex justify-between">
              <span>관제 경로:</span>
              <span className="text-slate-200">Route 4개</span>
            </div>
            <div className="flex justify-between">
              <span>운행 라인:</span>
              <span className="text-slate-200">Route당 Lane 5개</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
