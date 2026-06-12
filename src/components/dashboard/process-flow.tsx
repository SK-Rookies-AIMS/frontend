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
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium">AGV 실시간 물류 흐름</h2>
        <div className="flex gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-cyan-400" />
            <span>운반</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <span>복귀</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <span>대기</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 rounded-lg bg-[#08111f] p-4">
          <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="h-[200px] w-full">

            {/* 공정 박스 */}
            {PROCESS_NODES.map((node) => (
              <g key={node.name}>
                <rect
                  x={node.x} y={PROCESS_Y}
                  width={PROCESS_WIDTH} height={PROCESS_HEIGHT}
                  rx={10}
                  fill="#0f172a" stroke="#22d3ee" strokeWidth={2}
                />
                <text
                  x={node.x + PROCESS_WIDTH / 2}
                  y={PROCESS_Y + PROCESS_HEIGHT / 2 + 5}
                  textAnchor="middle"
                  fill="#22d3ee" fontSize={15} fontWeight={700}
                >
                  {node.name}
                </text>
              </g>
            ))}

            {/* 레인 라인 */}
            {ROUTES.map((route, routeIndex) => (
              <g key={route.routeName}>
                {/* 루트 이름 라벨 — 박스 위에 표시 */}
                <text
                  x={route.fromX + (route.toX - route.fromX) / 2}
                  y={PROCESS_Y - 6}
                  textAnchor="middle"
                  fill="#93c5fd" fontSize={10} fontWeight={700}
                >
                  {route.routeName}
                </text>

                {Array.from({ length: LANE_COUNT }, (_, laneIndex) => {
                  const laneY = LANE_START_Y + laneIndex * LANE_GAP
                  return (
                    <g key={`${routeIndex}-${laneIndex}`}>
                      {/* 레인 번호 */}
                      <text
                        x={route.fromX - 22} y={laneY + 4}
                        fill="#64748b" fontSize={9}
                      >
                        L{laneIndex + 1}
                      </text>

                      {/* 정방향 레인 (운반) */}
                      <line
                        x1={route.fromX} y1={laneY - 3}
                        x2={route.toX} y2={laneY - 3}
                        stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="8 5"
                      />

                      {/* 역방향 레인 (복귀) */}
                      <line
                        x1={route.toX} y1={laneY + 3}
                        x2={route.fromX} y2={laneY + 3}
                        stroke="#a855f7" strokeWidth={1.5} strokeDasharray="8 5"
                      />
                    </g>
                  )
                })}
              </g>
            ))}

            {/* AGV 아이콘 */}
            {agvs.map((agv) => {
              const pos = getAgvPosition(agv)
              const color = getStatusColor(agv.status)
              const label = getStatusLabel(agv.status)

              return (
                <g key={agv.id} transform={`translate(${pos.x},${pos.y})`}>
                  {agv.status !== "WAITING" && (
                    <circle cx="0" cy="0" r="14" fill={color} opacity="0.15">
                      <animate attributeName="r" values="14;20;14" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* 차체 */}
                  <rect x="-13" y="-8" width="26" height="16" rx="4"
                    fill="#1e293b" stroke={color} strokeWidth="1.5" />

                  {/* 바퀴 */}
                  <circle cx="-7" cy="9" r="3" fill={color} />
                  <circle cx="7" cy="9" r="3" fill={color} />

                  {/* AGV ID 라벨 */}
                  <rect x="-22" y="-22" width="44" height="10" rx="3" fill="#020617" />
                  <text x="0" y="-15" textAnchor="middle"
                    fill={color} fontSize="7" fontWeight="700">
                    {agv.id}
                  </text>

                  {/* 상태 라벨 */}
                  <rect x="-18" y="15" width="36" height="10" rx="3" fill="#020617" />
                  <text x="0" y="22" textAnchor="middle"
                    fill={color} fontSize="7" fontWeight="700">
                    {label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* 사이드 패널 */}
        <div className="w-[180px] shrink-0 rounded-lg border border-slate-700 bg-slate-900/95 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">AGV 현황</span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-cyan-400">운반중</span>
              <span className="text-white">{movingCount}대</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">복귀중</span>
              <span className="text-white">{returningCount}대</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400">대기중</span>
              <span className="text-white">{waitingCount}대</span>
            </div>
            <hr className="border-slate-700" />
            <div className="text-xs text-slate-400">AGV 총 20대</div>
            <div className="text-xs text-slate-400">공정 간 Route 4개</div>
            <div className="text-xs text-slate-400">Route당 Lane 5개</div>
          </div>
        </div>
      </div>
    </div>
  )
}
