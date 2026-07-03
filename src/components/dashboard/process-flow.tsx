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
const SVG_HEIGHT = 200

const PROCESS_Y = 50
const PROCESS_WIDTH = 110
const PROCESS_HEIGHT = 80  // 높이를 늘려서 레인 5개가 박스 안에 들어오게

// 박스 중앙 Y
const PROCESS_CENTER_Y = PROCESS_Y + PROCESS_HEIGHT / 2  // 90

// 레인 간격 및 시작 Y (5개 레인을 박스 중앙 기준으로 수직 정렬)
const LANE_GAP = 13
const LANE_COUNT = 5
const LANE_START_Y = PROCESS_CENTER_Y - ((LANE_COUNT - 1) / 2) * LANE_GAP  // 64

const PROCESS_NODES = [
  { name: "프레스", x: 40 },
  { name: "차체", x: 340 },
  { name: "도장", x: 640 },
  { name: "의장", x: 940 },
  { name: "최종검사", x: 1240 },
]

const ROUTES = [
  { routeName: "AGV 1~5", fromX: 150, toX: 340, agvStart: 1 },
  { routeName: "AGV 6~10", fromX: 450, toX: 640, agvStart: 6 },
  { routeName: "AGV 11~15", fromX: 750, toX: 940, agvStart: 11 },
  { routeName: "AGV 16~20", fromX: 1050, toX: 1240, agvStart: 16 },
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
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="text-sm font-semibold tracking-wide text-cyan-100">AGV 실시간 물류 흐름 관제</h2>
        </div>
        <div className="flex gap-6 text-xs font-semibold text-slate-300">
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
        <div className="flex-1 rounded-xl bg-[#030712] border border-slate-800/80 p-4 relative overflow-hidden">
          <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="h-[200px] w-full select-none">
            <defs>
              {/* 배경 그리드 패턴 */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.3" />
                <circle cx="40" cy="40" r="1" fill="#00f2fe" opacity="0.15" />
              </pattern>

              {/* 네온 글로우 필터 */}
              <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComponentTransfer in="blur" result="glow1">
                  <feFuncA type="linear" slope="0.7" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode in="glow1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-purple" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComponentTransfer in="blur" result="glow1">
                  <feFuncA type="linear" slope="0.7" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode in="glow1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-yellow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComponentTransfer in="blur" result="glow1">
                  <feFuncA type="linear" slope="0.7" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode in="glow1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* 스테이션 몸체 메탈 그라데이션 */}
              <linearGradient id="stationBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="60%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>

              {/* 스테이션 3D 상단 덮개 그라데이션 */}
              <linearGradient id="stationTop" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="50%" stopColor="#475569" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* 스테이션 측면 음영 그라데이션 */}
              <linearGradient id="stationSide" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>

              {/* 홀로그램 보드 그라데이션 */}
              <linearGradient id="hologramGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.03" />
              </linearGradient>

              {/* AGV 몸체 그라데이션 */}
              <linearGradient id="agvBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
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
              @keyframes scan-pulse {
                0%, 100% { transform: scale(1); opacity: 0.4; }
                50% { transform: scale(1.15); opacity: 0.8; }
              }
              @keyframes holographic-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-2px); }
              }
              .track-right {
                animation: track-flow-right 1.5s linear infinite;
              }
              .track-left {
                animation: track-flow-left 1.5s linear infinite;
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
              .hologram-float {
                animation: holographic-float 3s ease-in-out infinite;
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
                    x={route.fromX + (route.toX - route.fromX) / 2 - 38}
                    y={PROCESS_Y - 14}
                    width={76} height={14}
                    rx={3}
                    fill="#030712"
                    stroke="#1e3a8a" strokeWidth={1}
                  />
                  <text
                    x={route.fromX + (route.toX - route.fromX) / 2}
                    y={PROCESS_Y - 4}
                    textAnchor="middle"
                    fill="#93c5fd" fontSize={8} fontWeight={800}
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
                          x={route.fromX - 25} y={laneY - 6}
                          width={15} height={11} rx={2.5}
                          fill="#0b1329" stroke="#1e293b" strokeWidth={1}
                        />
                        <text
                          x={route.fromX - 17.5} y={laneY + 2.5}
                          textAnchor="middle"
                          fill="#64748b" fontSize={7.5} fontWeight={800}
                        >
                          L{laneIndex + 1}
                        </text>
                      </g>

                      {/* 1. 정방향 레인 (운반, 상단 레일) */}
                      {/* 물리 레일 베이스 */}
                      <line
                        x1={route.fromX} y1={laneY - 3}
                        x2={route.toX} y2={laneY - 3}
                        stroke="#111827" strokeWidth={4} strokeLinecap="round"
                      />
                      <line
                        x1={route.fromX} y1={laneY - 3}
                        x2={route.toX} y2={laneY - 3}
                        stroke="#1e293b" strokeWidth={2.2} strokeLinecap="round"
                      />
                      {/* 네온 흐름 전류 */}
                      <line
                        x1={route.fromX} y1={laneY - 3}
                        x2={route.toX} y2={laneY - 3}
                        stroke="#22d3ee" strokeWidth={1.2}
                        strokeDasharray="6 12"
                        className="track-right"
                        filter="url(#glow-cyan)"
                      />

                      {/* 2. 역방향 레인 (복귀, 하단 레일) */}
                      {/* 물리 레일 베이스 */}
                      <line
                        x1={route.toX} y1={laneY + 3}
                        x2={route.fromX} y2={laneY + 3}
                        stroke="#111827" strokeWidth={4} strokeLinecap="round"
                      />
                      <line
                        x1={route.toX} y1={laneY + 3}
                        x2={route.fromX} y2={laneY + 3}
                        stroke="#1e293b" strokeWidth={2.2} strokeLinecap="round"
                      />
                      {/* 네온 흐름 전류 */}
                      <line
                        x1={route.toX} y1={laneY + 3}
                        x2={route.fromX} y2={laneY + 3}
                        stroke="#a855f7" strokeWidth={1.2}
                        strokeDasharray="6 12"
                        className="track-left"
                        filter="url(#glow-purple)"
                      />
                    </g>
                  )
                })}
              </g>
            ))}

            {/* 공정 박스 - 2.5D 스마트 팩토리 스테이션 */}
            {PROCESS_NODES.map((node) => {
              const { x, name } = node
              const baseHeight = 10 // 바닥판 높이
              const mainY = PROCESS_Y + 10 // 메인 바디 시작 Y
              const mainHeight = PROCESS_HEIGHT - 10 // 메인 바디 높이

              return (
                <g key={name}>
                  {/* 바닥면 그림자 및 2.5D 바닥 플레이트 */}
                  <rect
                    x={x - 4} y={PROCESS_Y + PROCESS_HEIGHT - 1}
                    width={PROCESS_WIDTH + 8} height={6}
                    rx={3}
                    fill="#000" opacity="0.4"
                    filter="url(#glow-cyan)"
                  />
                  {/* 2.5D 바닥 플레이트 (상단면) */}
                  <polygon
                    points={`
                      ${x - 4},${PROCESS_Y + PROCESS_HEIGHT}
                      ${x + PROCESS_WIDTH + 4},${PROCESS_Y + PROCESS_HEIGHT}
                      ${x + PROCESS_WIDTH + 8},${PROCESS_Y + PROCESS_HEIGHT + baseHeight}
                      ${x - 8},${PROCESS_Y + PROCESS_HEIGHT + baseHeight}
                    `}
                    fill="#0b1329" stroke="#0891b2" strokeWidth="1"
                  />
                  {/* 2.5D 바닥 플레이트 (정면 두께) */}
                  <polygon
                    points={`
                      ${x - 8},${PROCESS_Y + PROCESS_HEIGHT + baseHeight}
                      ${x + PROCESS_WIDTH + 8},${PROCESS_Y + PROCESS_HEIGHT + baseHeight}
                      ${x + PROCESS_WIDTH + 8},${PROCESS_Y + PROCESS_HEIGHT + baseHeight + 3}
                      ${x - 8},${PROCESS_Y + PROCESS_HEIGHT + baseHeight + 3}
                    `}
                    fill="#0369a1"
                  />

                  {/* 메인 스테이션 타워 (3D 블록) */}
                  {/* 좌측 측면 음영 */}
                  <rect
                    x={x} y={mainY}
                    width={10} height={mainHeight}
                    fill="url(#stationSide)"
                  />
                  {/* 메인 정면 */}
                  <rect
                    x={x + 10} y={mainY}
                    width={PROCESS_WIDTH - 20} height={mainHeight}
                    fill="url(#stationBody)"
                    stroke="#1e293b" strokeWidth="1"
                  />
                  {/* 우측 측면 음영 */}
                  <rect
                    x={x + PROCESS_WIDTH - 10} y={mainY}
                    width={10} height={mainHeight}
                    fill="url(#stationSide)"
                  />

                  {/* 스테이션 3D 덮개 (Top Face) */}
                  <polygon
                    points={`
                      ${x},${mainY}
                      ${x + PROCESS_WIDTH},${mainY}
                      ${x + PROCESS_WIDTH - 6},${mainY - 5}
                      ${x + 6},${mainY - 5}
                    `}
                    fill="url(#stationTop)"
                    stroke="#475569" strokeWidth="0.5"
                  />

                  {/* 네온 하이라이트 라인 */}
                  <line
                    x1={x + 10} y1={mainY}
                    x2={x + 10} y2={mainY + mainHeight}
                    stroke="#06b6d4" strokeWidth="1.5" opacity="0.8" filter="url(#glow-cyan)"
                  />
                  <line
                    x1={x + PROCESS_WIDTH - 10} y1={mainY}
                    x2={x + PROCESS_WIDTH - 10} y2={mainY + mainHeight}
                    stroke="#06b6d4" strokeWidth="1.5" opacity="0.8" filter="url(#glow-cyan)"
                  />

                  {/* 작동 상태 지시 LED (Blinking LED) */}
                  <circle cx={x + 18} cy={mainY + 12} r="2.5" className="led-blink-cyan" filter="url(#glow-cyan)" />
                  <circle cx={x + PROCESS_WIDTH - 18} cy={mainY + 12} r="2.5" className="led-blink-cyan" filter="url(#glow-cyan)" />

                  {/* 내부 기계 회로 데코 */}
                  <rect x={x + 22} y={mainY + 24} width={PROCESS_WIDTH - 44} height={8} fill="#020617" rx={1.5} stroke="#334155" strokeWidth={0.5} />
                  <line x1={x + 26} y1={mainY + 28} x2={x + PROCESS_WIDTH - 26} y2={mainY + 28} stroke="#0891b2" strokeWidth={1} strokeDasharray="3 2" />

                  {/* 3D 홀로그램 공정 안내판 (Floating Hologram Plate) */}
                  <g className="hologram-float">
                    {/* 지지대 핀 */}
                    <line x1={x + PROCESS_WIDTH / 2} y1={mainY - 5} x2={x + PROCESS_WIDTH / 2} y2={mainY - 16} stroke="#0891b2" strokeWidth="1.5" />

                    {/* 홀로그램 보드 배경 */}
                    <rect
                      x={x + 10} y={mainY - 35}
                      width={PROCESS_WIDTH - 20} height={19}
                      rx={3}
                      fill="url(#hologramGrad)"
                      stroke="#06b6d4" strokeWidth="1.2"
                      filter="url(#glow-cyan)"
                    />

                    {/* 홀로그램 모서리 브래킷 */}
                    <path d={`M ${x + 12} ${mainY - 31} L ${x + 12} ${mainY - 33} L ${x + 15} ${mainY - 33}`} stroke="#22d3ee" strokeWidth="0.8" fill="none" />
                    <path d={`M ${x + PROCESS_WIDTH - 12} ${mainY - 31} L ${x + PROCESS_WIDTH - 12} ${mainY - 33} L ${x + PROCESS_WIDTH - 15} ${mainY - 33}`} stroke="#22d3ee" strokeWidth="0.8" fill="none" />
                    <path d={`M ${x + 12} ${mainY - 20} L ${x + 12} ${mainY - 18} L ${x + 15} ${mainY - 18}`} stroke="#22d3ee" strokeWidth="0.8" fill="none" />
                    <path d={`M ${x + PROCESS_WIDTH - 12} ${mainY - 20} L ${x + PROCESS_WIDTH - 12} ${mainY - 18} L ${x + PROCESS_WIDTH - 15} ${mainY - 18}`} stroke="#22d3ee" strokeWidth="0.8" fill="none" />

                    {/* 공정명 텍스트 */}
                    <text
                      x={x + PROCESS_WIDTH / 2}
                      y={mainY - 22}
                      textAnchor="middle"
                      fill="#e0f2fe"
                      fontSize={9.5}
                      fontWeight={800}
                      letterSpacing="0.8px"
                      style={{ textShadow: "0 0 6px rgba(6, 182, 212, 0.8)" }}
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
                  {/* 2.5D 타원형 파동 링 (그라운드 프로젝션 효과) */}
                  {agv.status !== "WAITING" && (
                    <ellipse
                      cx="0" cy="2"
                      rx="17" ry="7"
                      fill="none" stroke={color} strokeWidth="1.5" opacity="0.3"
                      filter={`url(#${filterId})`}
                    >
                      <animate attributeName="rx" values="17;22;17" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="ry" values="7;10;7" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0.05;0.4" dur="1.5s" repeatCount="indefinite" />
                    </ellipse>
                  )}

                  {/* 로봇 몸체 - 방향 대칭 적용 (복귀할 때는 scaleX = -1) */}
                  <g transform={`scale(${isReturning ? -1 : 1}, 1)`}>
                    {/* 바퀴 4개 (입체 원통 느낌) */}
                    {/* 왼쪽 위 바퀴 */}
                    <rect x="-10" y="-11" width="5" height="2.5" rx="0.8" fill="#0f172a" stroke="#475569" strokeWidth="0.5" />
                    {/* 오른쪽 위 바퀴 */}
                    <rect x="5" y="-11" width="5" height="2.5" rx="0.8" fill="#0f172a" stroke="#475569" strokeWidth="0.5" />
                    {/* 왼쪽 아래 바퀴 */}
                    <rect x="-10" y="8.5" width="5" height="2.5" rx="0.8" fill="#0f172a" stroke="#475569" strokeWidth="0.5" />
                    {/* 오른쪽 아래 바퀴 */}
                    <rect x="5" y="8.5" width="5" height="2.5" rx="0.8" fill="#0f172a" stroke="#475569" strokeWidth="0.5" />

                    {/* 본체 범퍼/샤시 */}
                    <rect
                      x="-13" y="-8.5"
                      width="26" height="17"
                      rx="3"
                      fill="url(#agvBody)"
                      stroke="#475569" strokeWidth="1"
                    />

                    {/* 상태 지시 LED 라인 (로봇 측면) */}
                    <line x1="-9" y1="-6.5" x2="9" y2="-6.5" stroke={color} strokeWidth="1.2" opacity="0.8" filter={`url(#${filterId})`} />
                    <line x1="-9" y1="6.5" x2="9" y2="6.5" stroke={color} strokeWidth="1.2" opacity="0.8" filter={`url(#${filterId})`} />

                    {/* 라이더/센서 빔 (로봇 전면 - 우측부) */}
                    <path
                      d="M 13 -4.5 Q 16.5 0 13 4.5"
                      fill="none" stroke={color} strokeWidth="1.2"
                      filter={`url(#${filterId})`}
                      opacity="0.8"
                    />
                    {/* 레이저 포인트 */}
                    <circle cx="12" cy="0" r="1.2" fill={color} filter={`url(#${filterId})`} />

                    {/* 적재함 & 화물 */}
                    {agv.status === "MOVING" ? (
                      /* 운반 시 적재 화물 - 3D 큐브 느낌 */
                      <g transform="translate(0, 0)">
                        {/* 3D 화물 상단면 */}
                        <polygon
                          points="-6,-7 4,-7 7,-4 -3,-4"
                          fill="url(#cargoTop)"
                          stroke="#22d3ee" strokeWidth="0.5"
                        />
                        {/* 3D 화물 정면 */}
                        <polygon
                          points="-3,-4 7,-4 7,1 -3,1"
                          fill="url(#cargoFront)"
                          stroke="#0891b2" strokeWidth="0.5"
                        />
                        {/* 3D 화물 측면 */}
                        <polygon
                          points="-6,-7 -3,-4 -3,1 -6,-2"
                          fill="url(#cargoSide)"
                          stroke="#0e7490" strokeWidth="0.5"
                        />
                      </g>
                    ) : (
                      /* 비적재/대기 시 본체 구동 판넬 슬롯 패턴 */
                      <g>
                        <rect x="-6" y="-3.5" width="12" height="7" fill="#020617" rx="1" stroke="#334155" strokeWidth="0.5" />
                        <line x1="-4" y1="-1.5" x2="4" y2="-1.5" stroke="#475569" strokeWidth="0.75" />
                        <line x1="-4" y1="0.5" x2="4" y2="0.5" stroke="#475569" strokeWidth="0.75" />
                        {/* 복귀 시 깜빡이는 지시등 */}
                        {isReturning && (
                          <circle cx="0" cy="0" r="1.8" className="led-blink-purple" filter="url(#glow-purple)" />
                        )}
                        {agv.status === "WAITING" && (
                          <circle cx="0" cy="0" r="1.8" className="led-blink-yellow" filter="url(#glow-yellow)" />
                        )}
                      </g>
                    )}
                  </g>

                  {/* AGV ID 라벨 (로봇 상단에 일체감 있게 배치, 스케일 대칭에서 제외되어 글자가 뒤집히지 않음) */}
                  <g transform="translate(0, -21)">
                    <rect
                      x="-20" y="-4"
                      width="40" height="9"
                      rx="2.5"
                      fill="#020617"
                      stroke={color} strokeWidth={0.8}
                      opacity="0.9"
                    />
                    <text
                      x="0" y="3"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="6"
                      fontWeight="800"
                      letterSpacing="0.4px"
                    >
                      {agv.id}
                    </text>
                  </g>

                  {/* 상태 라벨 (로봇 하단에 슬림 캡슐로 배치, 글자가 뒤집히지 않음) */}
                  <g transform="translate(0, 19)">
                    <rect
                      x="-13" y="-3.5"
                      width="26" height="8"
                      rx="4"
                      fill="#0b1329"
                      stroke={color} strokeWidth={0.8}
                      opacity="0.95"
                    />
                    <text
                      x="0" y="2.5"
                      textAnchor="middle"
                      fill={color}
                      fontSize="5.5"
                      fontWeight="800"
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
        <div className="w-full lg:w-[200px] shrink-0 rounded-xl border border-cyan-500/10 bg-slate-900/60 backdrop-blur-md p-4 flex flex-col justify-between shadow-[0_0_15px_rgba(6,182,212,0.02)]">
          <div>
            <div className="mb-4 flex items-center gap-2 pb-2 border-b border-slate-800">
              <Truck className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-bold text-cyan-100 tracking-wider">AGV 관제 현황</span>
            </div>

            <div className="space-y-4">
              {/* 운반중 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-cyan-400">운반중</span>
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
                  <span className="text-purple-400">복귀중</span>
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
                  <span className="text-yellow-400">대기중</span>
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
