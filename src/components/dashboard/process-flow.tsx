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

// ─────────────────────────────────────────────────────────────────────────────
//  Layout Constants — only these + SVG/JSX rendering changed. All logic below
//  is identical to the previous version.
// ─────────────────────────────────────────────────────────────────────────────
const SVG_WIDTH  = 1500
const SVG_HEIGHT = 460

const PROCESS_Y      = 80   // top of station area (hologram stem starts here)
const PROCESS_WIDTH  = 230  // factory building width
const PROCESS_HEIGHT = 230  // total station height

// Building geometry derived from above
const BLDG_TOP_Y = PROCESS_Y + 22               // 102  — top of building body (roof is above)
const BLDG_BTM_Y = PROCESS_Y + PROCESS_HEIGHT   // 310  — floor level

// 3-D platform below building
const PLATFORM_H   = 22
const PLATFORM_BTM_Y = BLDG_BTM_Y + PLATFORM_H // 332

// Lane layout: AGV paths centered on building mid-height
const PROCESS_CENTER_Y = PROCESS_Y + PROCESS_HEIGHT / 2  // 195
const LANE_GAP    = 44
const LANE_COUNT  = 5
const LANE_START_Y = PROCESS_CENTER_Y - ((LANE_COUNT - 1) / 2) * LANE_GAP  // 107

const PROCESS_NODES = [
  { name: "프레스",   x: 15   },
  { name: "차체",     x: 325  },
  { name: "도장",     x: 635  },
  { name: "의장",     x: 945  },
  { name: "최종검사", x: 1255 },
]

// Each station: [x, x + PROCESS_WIDTH]. Routes fill the 80 px gap between them.
const ROUTES = [
  { routeName: "AGV 1~5",   fromX: 245,  toX: 325,  agvStart: 1  },
  { routeName: "AGV 6~10",  fromX: 555,  toX: 635,  agvStart: 6  },
  { routeName: "AGV 11~15", fromX: 865,  toX: 945,  agvStart: 11 },
  { routeName: "AGV 16~20", fromX: 1175, toX: 1255, agvStart: 16 },
]

// ─────────────────────────────────────────────────────────────────────────────
//  AGV Simulation Logic — NOT modified from original
// ─────────────────────────────────────────────────────────────────────────────
const WAIT_START_TICK = 60
const WAIT_END_TICK   = 40

const createInitialAgvs = (): Agv[] => {
  const agvs: Agv[] = []
  ROUTES.forEach((route, routeIndex) => {
    for (let laneIndex = 0; laneIndex < 5; laneIndex++) {
      const agvNumber = route.agvStart + laneIndex
      let status: AgvStatus = "WAITING"
      let phase: AgvPhase   = "WAIT_START"
      let progress = 0
      let waitTick = laneIndex * 15

      if (laneIndex === 0) { status = "MOVING";    phase = "MOVING";    progress = 0.3 }
      if (laneIndex === 3) { status = "RETURNING"; phase = "RETURNING"; progress = 0.7 }

      agvs.push({
        id: `AGV-${String(agvNumber).padStart(2, "0")}`,
        routeIndex, laneIndex, progress, status, phase, waitTick,
        speed: 0.003 + laneIndex * 0.00025,
      })
    }
  })
  return agvs
}

const getStatusColor = (status: AgvStatus) => {
  if (status === "MOVING")    return "#22d3ee"
  if (status === "RETURNING") return "#a855f7"
  return "#eab308"
}

const getStatusLabel = (status: AgvStatus) => {
  if (status === "MOVING")    return "운반"
  if (status === "RETURNING") return "복귀"
  return "대기"
}

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
export function ProcessFlow() {
  const [agvs, setAgvs] = useState<Agv[]>(createInitialAgvs)

  // AGV update loop — identical to original
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

  const movingCount    = useMemo(() => agvs.filter((a) => a.status === "MOVING").length,    [agvs])
  const returningCount = useMemo(() => agvs.filter((a) => a.status === "RETURNING").length, [agvs])
  const waitingCount   = useMemo(() => agvs.filter((a) => a.status === "WAITING").length,   [agvs])

  // AGV position calculation — identical to original
  const getAgvPosition = (agv: Agv) => {
    const route = ROUTES[agv.routeIndex]
    const x = route.fromX + (route.toX - route.fromX) * agv.progress
    const y = LANE_START_Y + agv.laneIndex * LANE_GAP
    return { x, y }
  }

  return (
    <div className="bg-[#0b1329]/80 backdrop-blur-md rounded-xl border border-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.05)] p-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <h2 className="text-sm font-semibold tracking-wider text-cyan-100 uppercase">
            AGV 실시간 물류 흐름 관제 Dashboard
          </h2>
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

        {/* ── SVG Canvas ─────────────────────────────────────────────────── */}
        <div className="flex-1 rounded-xl bg-[#01040a] border border-slate-800/80 p-4 relative overflow-hidden">
          <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="h-[460px] w-full select-none">

            {/* ── Defs ─────────────────────────────────────────────────────── */}
            <defs>
              {/* Grid */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.22" />
                <circle cx="40" cy="40" r="1.2" fill="#00f2fe" opacity="0.16" />
              </pattern>

              {/* Glow filters */}
              <filter id="glow-cyan" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComponentTransfer in="blur" result="g1"><feFuncA type="linear" slope="0.9" /></feComponentTransfer>
                <feMerge><feMergeNode in="g1" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-purple" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComponentTransfer in="blur" result="g1"><feFuncA type="linear" slope="0.9" /></feComponentTransfer>
                <feMerge><feMergeNode in="g1" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-yellow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComponentTransfer in="blur" result="g1"><feFuncA type="linear" slope="0.9" /></feComponentTransfer>
                <feMerge><feMergeNode in="g1" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-green" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComponentTransfer in="blur" result="g1"><feFuncA type="linear" slope="0.85" /></feComponentTransfer>
                <feMerge><feMergeNode in="g1" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>

              {/* Building gradients */}
              <linearGradient id="bldgFront" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#1c2c40" />
                <stop offset="45%"  stopColor="#10192a" />
                <stop offset="100%" stopColor="#060d18" />
              </linearGradient>
              <linearGradient id="bldgSideR" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#0a1625" />
                <stop offset="100%" stopColor="#040c16" />
              </linearGradient>
              <linearGradient id="bldgRoof" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%"   stopColor="#1c2e46" />
                <stop offset="100%" stopColor="#263d58" />
              </linearGradient>
              <linearGradient id="pillarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#263d58" />
                <stop offset="50%"  stopColor="#2e4d6a" />
                <stop offset="100%" stopColor="#1a2e44" />
              </linearGradient>
              <linearGradient id="platformTop" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#162640" />
                <stop offset="100%" stopColor="#0c1c2e" />
              </linearGradient>
              <linearGradient id="platformSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#0c1c2e" />
                <stop offset="100%" stopColor="#060f1c" />
              </linearGradient>
              <linearGradient id="windowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#032a3e" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#011523" stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id="hologramGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#06b6d4" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="pressBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#374151" />
                <stop offset="100%" stopColor="#1f2937" />
              </linearGradient>

              {/* AGV gradients */}
              <linearGradient id="agvBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#4f5e75" />
                <stop offset="50%"  stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="cargoTop" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
              <linearGradient id="cargoFront" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#0891b2" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <linearGradient id="cargoSide" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#0e7490" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
            </defs>

            {/* ── CSS Animations ───────────────────────────────────────────── */}
            <style>{`
              @keyframes track-flow-right {
                from { stroke-dashoffset: 32; }
                to   { stroke-dashoffset: 0;  }
              }
              @keyframes track-flow-left {
                from { stroke-dashoffset: 0;  }
                to   { stroke-dashoffset: 32; }
              }
              @keyframes led-blink {
                0%, 100% { opacity: 0.28; }
                50%       { opacity: 1;    }
              }
              @keyframes robotic-spark {
                0%, 100% { transform: scale(0.5) rotate(0deg);  opacity: 0.2; }
                50%       { transform: scale(1.5) rotate(45deg); opacity: 1;   }
              }
              @keyframes holographic-float {
                0%, 100% { transform: translateY(0px); }
                50%       { transform: translateY(-5px); }
              }
              @keyframes neon-pulse {
                0%, 100% { opacity: 0.45; }
                50%       { opacity: 1;   }
              }
              .track-right       { animation: track-flow-right 1.2s linear infinite; }
              .track-left        { animation: track-flow-left  1.2s linear infinite; }
              .led-blink-cyan    { animation: led-blink 1s   ease-in-out infinite; fill: #22d3ee; }
              .led-blink-purple  { animation: led-blink 1s   ease-in-out infinite; fill: #a855f7; }
              .led-blink-yellow  { animation: led-blink 1.2s ease-in-out infinite; fill: #eab308; }
              .led-blink-green   { animation: led-blink 0.8s ease-in-out infinite; fill: #22c55e; }
              .spark-anim        { animation: robotic-spark 0.5s ease-in-out infinite; transform-origin: center; }
              .hologram-float    { animation: holographic-float 3.8s ease-in-out infinite; }
              .neon-pulse        { animation: neon-pulse 2.2s ease-in-out infinite; }
            `}</style>

            {/* ── Grid Background ─────────────────────────────────────────── */}
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* ── Routes / Lanes ──────────────────────────────────────────── */}
            {ROUTES.map((route, routeIndex) => (
              <g key={route.routeName}>

                {/* Route segment name badge */}
                <rect
                  x={route.fromX + (route.toX - route.fromX) / 2 - 38}
                  y={12} width={76} height={16} rx={3}
                  fill="#01040a" stroke="#1e3a8a" strokeWidth={1}
                />
                <text
                  x={route.fromX + (route.toX - route.fromX) / 2}
                  y={23}
                  textAnchor="middle" fill="#93c5fd"
                  fontSize={9} fontWeight={900} letterSpacing="0.4px"
                >
                  {route.routeName}
                </text>

                {Array.from({ length: LANE_COUNT }, (_, laneIndex) => {
                  const laneY = LANE_START_Y + laneIndex * LANE_GAP
                  return (
                    <g key={`${routeIndex}-${laneIndex}`}>
                      {/* Lane number badge */}
                      <rect
                        x={route.fromX - 36} y={laneY - 10}
                        width={24} height={20} rx={3}
                        fill="#080e1e" stroke="#1e293b" strokeWidth={1}
                      />
                      <text
                        x={route.fromX - 24} y={laneY + 5}
                        textAnchor="middle" fill="#3d556e"
                        fontSize={9} fontWeight={900}
                      >
                        L{laneIndex + 1}
                      </text>

                      {/* ── Forward track (운반) ── */}
                      <line x1={route.fromX} y1={laneY - 5} x2={route.toX} y2={laneY - 5}
                        stroke="#000" strokeWidth={9} strokeLinecap="round" opacity={0.55} />
                      <line x1={route.fromX} y1={laneY - 5} x2={route.toX} y2={laneY - 5}
                        stroke="#182840" strokeWidth={6} strokeLinecap="round" />
                      <line x1={route.fromX} y1={laneY - 9} x2={route.toX} y2={laneY - 9}
                        stroke="#1e3050" strokeWidth={1.2} />
                      <line x1={route.fromX} y1={laneY - 1} x2={route.toX} y2={laneY - 1}
                        stroke="#1e3050" strokeWidth={1.2} />
                      <line x1={route.fromX} y1={laneY - 5} x2={route.toX} y2={laneY - 5}
                        stroke="#22d3ee" strokeWidth={2.2}
                        strokeDasharray="12 18" className="track-right"
                        filter="url(#glow-cyan)"
                      />

                      {/* ── Return track (복귀) ── */}
                      <line x1={route.toX} y1={laneY + 5} x2={route.fromX} y2={laneY + 5}
                        stroke="#000" strokeWidth={9} strokeLinecap="round" opacity={0.55} />
                      <line x1={route.toX} y1={laneY + 5} x2={route.fromX} y2={laneY + 5}
                        stroke="#1a1030" strokeWidth={6} strokeLinecap="round" />
                      <line x1={route.toX} y1={laneY + 1} x2={route.fromX} y2={laneY + 1}
                        stroke="#281840" strokeWidth={1.2} />
                      <line x1={route.toX} y1={laneY + 9} x2={route.fromX} y2={laneY + 9}
                        stroke="#281840" strokeWidth={1.2} />
                      <line x1={route.toX} y1={laneY + 5} x2={route.fromX} y2={laneY + 5}
                        stroke="#a855f7" strokeWidth={2.2}
                        strokeDasharray="12 18" className="track-left"
                        filter="url(#glow-purple)"
                      />
                    </g>
                  )
                })}
              </g>
            ))}

            {/* ── Process Station Buildings ────────────────────────────────── */}
            {PROCESS_NODES.map((node) => {
              const { x, name } = node
              const bW   = PROCESS_WIDTH
              const bTop = BLDG_TOP_Y   // 102
              const bBtm = BLDG_BTM_Y   // 310
              const bH   = bBtm - bTop  // 208
              const pBtm = PLATFORM_BTM_Y // 332
              const midX = x + bW / 2
              const pw   = 14  // pillar width

              // ── Process-specific roof feature ──
              let roofFeature: React.ReactNode = null
              // ── Process-specific interior ──
              let interior: React.ReactNode = null

              switch (name) {

                // ──────────────────────────────────────────────────────────
                case "프레스": {
                  roofFeature = (
                    <g>
                      {/* Exhaust stacks */}
                      <rect x={x + 48}      y={bTop - 32} width={16} height={32} fill="#232f3e" stroke="#374151" strokeWidth={1} rx={2} />
                      <rect x={x + bW - 64} y={bTop - 28} width={16} height={28} fill="#232f3e" stroke="#374151" strokeWidth={1} rx={2} />
                      <rect x={x + 45}      y={bTop - 34} width={22} height={6}  fill="#1f2937" rx={1} />
                      <rect x={x + bW - 67} y={bTop - 30} width={22} height={6}  fill="#1f2937" rx={1} />
                      {/* Smoke puffs */}
                      <circle cx={x + 56}      cy={bTop - 42} r={7} fill="#2d3748" opacity={0.5} />
                      <circle cx={x + 62}      cy={bTop - 52} r={5} fill="#2d3748" opacity={0.3} />
                      <circle cx={x + bW - 56} cy={bTop - 38} r={6} fill="#2d3748" opacity={0.4} />
                    </g>
                  )
                  interior = (
                    <g>
                      {/* Press outer frame */}
                      <rect x={x + 28} y={bTop + 8} width={bW - 56} height={bH - 52}
                        fill="#0d1422" stroke="#374151" strokeWidth={1.5} rx={2} />
                      {/* Vertical columns */}
                      <rect x={x + 30} y={bTop + 10} width={12} height={bH - 56} fill="url(#pressBodyGrad)" />
                      <rect x={x + bW - 42} y={bTop + 10} width={12} height={bH - 56} fill="url(#pressBodyGrad)" />
                      {/* Top crossbeam */}
                      <rect x={x + 30} y={bTop + 18} width={bW - 60} height={18}
                        fill="#374151" stroke="#4b5563" strokeWidth={1} />
                      <rect x={x + 32} y={bTop + 20} width={bW - 64} height={5} fill="#4b5563" />
                      {/* Press ram (SVG native pump animation) */}
                      <g>
                        <animateTransform attributeName="transform" type="translate"
                          values="0,0; 0,16; 0,0" dur="2.4s" repeatCount="indefinite"
                          calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
                        <rect x={midX - 20} y={bTop + 36} width={40} height={52}
                          fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
                        <rect x={midX - 18} y={bTop + 38} width={36} height={10} fill="#374151" />
                        <rect x={midX - 14} y={bTop + 50} width={28} height={34}
                          fill="#111827" stroke="#374151" strokeWidth={1} />
                        {/* Ram surface markings */}
                        <line x1={midX - 10} y1={bTop + 58} x2={midX + 10} y2={bTop + 58}
                          stroke="#4b5563" strokeWidth={1} />
                        <line x1={midX - 10} y1={bTop + 66} x2={midX + 10} y2={bTop + 66}
                          stroke="#4b5563" strokeWidth={1} />
                      </g>
                      {/* Anvil base */}
                      <rect x={x + 30} y={bBtm - 48} width={bW - 60} height={26}
                        fill="#1f2937" stroke="#374151" strokeWidth={1.5} />
                      <rect x={x + 32} y={bBtm - 46} width={bW - 64} height={6} fill="#374151" />
                      {/* Safety stripes */}
                      {Array.from({ length: 7 }, (_, i) => (
                        <rect key={i}
                          x={x + 30 + i * ((bW - 60) / 7)} y={bBtm - 20}
                          width={(bW - 60) / 14} height={12}
                          fill="#eab308" opacity={0.85} />
                      ))}
                      {/* Hydraulic cylinders (left & right) */}
                      <rect x={x + 16} y={bTop + 46} width={11} height={70} fill="#1e2a3a" stroke="#374151" strokeWidth={1} rx={2} />
                      <rect x={x + bW - 27} y={bTop + 46} width={11} height={70} fill="#1e2a3a" stroke="#374151" strokeWidth={1} rx={2} />
                      {/* Pressure gauges */}
                      <circle cx={x + 21} cy={bTop + 42} r={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
                      <line x1={x + 21} y1={bTop + 42} x2={x + 24} y2={bTop + 36} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
                      <circle cx={x + bW - 21} cy={bTop + 42} r={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
                      <line x1={x + bW - 21} y1={bTop + 42} x2={x + bW - 18} y2={bTop + 36} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
                      {/* Warning LEDs */}
                      <circle cx={midX - 22} cy={bTop + 14} r={4} className="led-blink-yellow" filter="url(#glow-yellow)" />
                      <circle cx={midX + 22} cy={bTop + 14} r={4} className="led-blink-yellow" filter="url(#glow-yellow)" />
                    </g>
                  )
                  break
                }

                // ──────────────────────────────────────────────────────────
                case "차체": {
                  roofFeature = (
                    <g>
                      {/* Safety beacon */}
                      <rect x={midX - 7} y={bTop - 22} width={14} height={22} fill="#1f2937" stroke="#374151" strokeWidth={1} />
                      <circle cx={midX} cy={bTop - 27} r={9} fill="#1f2937" stroke="#374151" strokeWidth={1} />
                      <circle cx={midX} cy={bTop - 27} r={5} className="led-blink-yellow" filter="url(#glow-yellow)" />
                    </g>
                  )
                  interior = (
                    <g>
                      {/* Car body silhouette */}
                      <path
                        d={`M ${x+38} ${bTop+95}
                            L ${x+48} ${bTop+68}
                            L ${x+72} ${bTop+58}
                            L ${x+bW-72} ${bTop+58}
                            L ${x+bW-48} ${bTop+68}
                            L ${x+bW-38} ${bTop+95} Z`}
                        fill="none" stroke="#4b5563" strokeWidth={2} strokeLinejoin="round"
                      />
                      {/* Roof line */}
                      <path
                        d={`M ${x+58} ${bTop+68} L ${x+72} ${bTop+46}
                            L ${x+bW-72} ${bTop+46} L ${x+bW-58} ${bTop+68}`}
                        fill="none" stroke="#374151" strokeWidth={1.5}
                      />
                      {/* Windscreen */}
                      <rect x={x+74} y={bTop+47} width={36} height={20} rx={2}
                        fill="#022a3d" opacity={0.65} stroke="#1e4a6e" strokeWidth={0.8} />
                      <rect x={x+bW-110} y={bTop+47} width={36} height={20} rx={2}
                        fill="#022a3d" opacity={0.65} stroke="#1e4a6e" strokeWidth={0.8} />
                      {/* Wheels */}
                      <circle cx={x+58} cy={bTop+100} r={14} fill="#111827" stroke="#374151" strokeWidth={2} />
                      <circle cx={x+58} cy={bTop+100} r={6}  fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
                      <circle cx={x+bW-58} cy={bTop+100} r={14} fill="#111827" stroke="#374151" strokeWidth={2} />
                      <circle cx={x+bW-58} cy={bTop+100} r={6}  fill="#1f2937" stroke="#4b5563" strokeWidth={1.5} />
                      {/* Robot arm Left */}
                      <path
                        d={`M ${x+18} ${bTop+140} L ${x+30} ${bTop+115} L ${x+50} ${bTop+100}`}
                        fill="none" stroke="#22d3ee" strokeWidth={4.5}
                        strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-cyan)"
                      />
                      <circle cx={x+18} cy={bTop+140} r={6} fill="#1e293b" stroke="#4b5563" strokeWidth={1.5} />
                      <circle cx={x+30} cy={bTop+115} r={5} fill="#1e293b" stroke="#4b5563" strokeWidth={1.5} />
                      {/* Welding spark Left */}
                      <g transform={`translate(${x+50},${bTop+100})`}>
                        <polygon points="-7,0 7,0 0,-9" fill="#eab308" className="spark-anim" />
                        <polygon points="0,-9 0,9 -9,0" fill="#f97316" className="spark-anim" />
                        <circle cx="0" cy="0" r="2.5" fill="#fff" />
                      </g>
                      {/* Robot arm Right */}
                      <path
                        d={`M ${x+bW-18} ${bTop+140} L ${x+bW-30} ${bTop+115} L ${x+bW-50} ${bTop+100}`}
                        fill="none" stroke="#22d3ee" strokeWidth={4.5}
                        strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-cyan)"
                      />
                      <circle cx={x+bW-18} cy={bTop+140} r={6} fill="#1e293b" stroke="#4b5563" strokeWidth={1.5} />
                      <circle cx={x+bW-30} cy={bTop+115} r={5} fill="#1e293b" stroke="#4b5563" strokeWidth={1.5} />
                      {/* Conveyor belt at floor */}
                      <rect x={x+28} y={bBtm-42} width={bW-56} height={12}
                        fill="#0f172a" rx={2} stroke="#334155" strokeWidth={1} />
                      <line x1={x+28} y1={bBtm-36} x2={x+bW-28} y2={bBtm-36}
                        stroke="#283e5a" strokeWidth={8} strokeDasharray="7 6">
                        <animate attributeName="stroke-dashoffset" from="26" to="0" dur="0.55s" repeatCount="indefinite" />
                      </line>
                      {/* Status LEDs top */}
                      <circle cx={midX-24} cy={bTop+14} r={4} className="led-blink-cyan"  filter="url(#glow-cyan)" />
                      <circle cx={midX}    cy={bTop+14} r={4} className="led-blink-green" filter="url(#glow-green)" />
                      <circle cx={midX+24} cy={bTop+14} r={4} className="led-blink-cyan"  filter="url(#glow-cyan)" />
                    </g>
                  )
                  break
                }

                // ──────────────────────────────────────────────────────────
                case "도장": {
                  roofFeature = (
                    <g>
                      {/* Main duct */}
                      <rect x={midX-32} y={bTop-30} width={64} height={30}
                        fill="#1c2c3e" stroke="#2a4060" strokeWidth={1.5} rx={2} />
                      {Array.from({ length: 5 }, (_, i) => (
                        <line key={i}
                          x1={midX-28} y1={bTop-26+i*5}
                          x2={midX+28} y2={bTop-26+i*5}
                          stroke="#374151" strokeWidth={0.9} />
                      ))}
                      {/* Side exhaust boxes */}
                      <rect x={x+18} y={bTop-20} width={20} height={20} fill="#1f2937" stroke="#374151" strokeWidth={1} rx={1} />
                      <circle cx={x+28} cy={bTop-10} r={7} fill="#111827" stroke="#4b5563" strokeWidth={1} />
                      <circle cx={x+28} cy={bTop-10} r={3} fill="#1f2937" />
                      <rect x={x+bW-38} y={bTop-20} width={20} height={20} fill="#1f2937" stroke="#374151" strokeWidth={1} rx={1} />
                      <circle cx={x+bW-28} cy={bTop-10} r={7} fill="#111827" stroke="#4b5563" strokeWidth={1} />
                      <circle cx={x+bW-28} cy={bTop-10} r={3} fill="#1f2937" />
                    </g>
                  )
                  interior = (
                    <g>
                      {/* Booth arch */}
                      <path
                        d={`M ${x+28} ${bTop+22} Q ${midX} ${bTop-4} ${x+bW-28} ${bTop+22}`}
                        fill="none" stroke="#64748b" strokeWidth={2.5}
                      />
                      {/* Booth glass enclosure */}
                      <rect x={x+24} y={bTop+22} width={bW-48} height={bH-68}
                        fill="#0891b2" fillOpacity={0.06} stroke="#0e7490" strokeWidth={1.5} rx={3}
                        filter="url(#glow-cyan)"
                      />
                      {/* Left spray nozzle bank */}
                      <rect x={x+26} y={bTop+38} width={6} height={14} fill="#475569" rx={1} />
                      <path d={`M ${x+32} ${bTop+45} L ${x+44} ${bTop+49} L ${x+32} ${bTop+53}`}
                        fill="#0e7490" fillOpacity={0.55} />
                      <rect x={x+26} y={bTop+68} width={6} height={14} fill="#475569" rx={1} />
                      <path d={`M ${x+32} ${bTop+75} L ${x+44} ${bTop+79} L ${x+32} ${bTop+83}`}
                        fill="#0e7490" fillOpacity={0.55} />
                      <rect x={x+26} y={bTop+98} width={6} height={14} fill="#475569" rx={1} />
                      <path d={`M ${x+32} ${bTop+105} L ${x+44} ${bTop+109} L ${x+32} ${bTop+113}`}
                        fill="#0e7490" fillOpacity={0.55} />
                      {/* Right spray nozzle bank */}
                      <rect x={x+bW-32} y={bTop+38} width={6} height={14} fill="#475569" rx={1} />
                      <path d={`M ${x+bW-32} ${bTop+45} L ${x+bW-44} ${bTop+49} L ${x+bW-32} ${bTop+53}`}
                        fill="#0e7490" fillOpacity={0.55} />
                      <rect x={x+bW-32} y={bTop+68} width={6} height={14} fill="#475569" rx={1} />
                      <path d={`M ${x+bW-32} ${bTop+75} L ${x+bW-44} ${bTop+79} L ${x+bW-32} ${bTop+83}`}
                        fill="#0e7490" fillOpacity={0.55} />
                      {/* Spray mist dots */}
                      {[0,1,2,3,4,5].map((i) => (
                        <circle key={i} cx={x+48+i*22} cy={bTop+70} r={4}
                          fill="#22d3ee" opacity={0.1}>
                          <animate attributeName="opacity" values="0;0.55;0" dur="2s" repeatCount="indefinite"
                            begin={`${i*0.28}s`} />
                          <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite"
                            begin={`${i*0.28}s`} />
                        </circle>
                      ))}
                      {/* BOOTH label */}
                      <rect x={midX-26} y={bTop+118} width={52} height={22} fill="#020617" rx={3} stroke="#0891b2" strokeWidth={1} />
                      <text x={midX} y={bTop+133} textAnchor="middle" fill="#22d3ee"
                        fontSize={10} fontWeight={900} letterSpacing="0.8px">BOOTH</text>
                      {/* Floor drain */}
                      {Array.from({ length: 3 }, (_, i) => (
                        <line key={i}
                          x1={x+28+i*((bW-56)/3)} y1={bBtm-22}
                          x2={x+28+(i+1)*((bW-56)/3)} y2={bBtm-22}
                          stroke="#0e3a4a" strokeWidth={2.5} />
                      ))}
                      {/* Status LEDs */}
                      <circle cx={midX-28} cy={bTop+14} r={4} className="led-blink-cyan"  filter="url(#glow-cyan)" />
                      <circle cx={midX}    cy={bTop+14} r={4} className="led-blink-green" filter="url(#glow-green)" />
                      <circle cx={midX+28} cy={bTop+14} r={4} className="led-blink-cyan"  filter="url(#glow-cyan)" />
                    </g>
                  )
                  break
                }

                // ──────────────────────────────────────────────────────────
                case "의장": {
                  roofFeature = (
                    <g>
                      {/* Overhead crane rail */}
                      <rect x={x+12} y={bTop-13} width={bW-24} height={9}
                        fill="#1c2c3e" stroke="#2a4060" strokeWidth={1} rx={1} />
                      {/* Crane trolley */}
                      <rect x={midX-14} y={bTop-13} width={28} height={16}
                        fill="#374151" stroke="#4b5563" strokeWidth={1} rx={1} />
                      <rect x={midX-3} y={bTop+3} width={6} height={12} fill="#4b5563" />
                      <rect x={midX-8} y={bTop+14} width={16} height={5} fill="#2d4a6a" />
                    </g>
                  )
                  interior = (
                    <g>
                      {/* Conveyor line */}
                      <rect x={x+18} y={bTop+95} width={bW-36} height={16}
                        fill="#0f172a" rx={2} stroke="#283e5a" strokeWidth={1} />
                      <line x1={x+18} y1={bTop+103} x2={x+bW-18} y2={bTop+103}
                        stroke="#283e5a" strokeWidth={12} strokeDasharray="8 6">
                        <animate attributeName="stroke-dashoffset" from="28" to="0" dur="0.6s" repeatCount="indefinite" />
                      </line>
                      {/* Robot arm Left */}
                      <path
                        d={`M ${x+24} ${bTop+82} L ${x+36} ${bTop+60} L ${x+58} ${bTop+48}`}
                        fill="none" stroke="#64748b" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
                      />
                      <circle cx={x+24} cy={bTop+82} r={6} fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
                      <circle cx={x+36} cy={bTop+60} r={5} fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
                      <circle cx={x+58} cy={bTop+48} r={4} fill="#22c55e" className="led-blink-green" filter="url(#glow-green)" />
                      {/* Robot arm Right */}
                      <path
                        d={`M ${x+bW-24} ${bTop+82} L ${x+bW-36} ${bTop+60} L ${x+bW-58} ${bTop+48}`}
                        fill="none" stroke="#64748b" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
                      />
                      <circle cx={x+bW-24} cy={bTop+82} r={6} fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
                      <circle cx={x+bW-36} cy={bTop+60} r={5} fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
                      <circle cx={x+bW-58} cy={bTop+48} r={4} fill="#22c55e" className="led-blink-green" filter="url(#glow-green)" />
                      {/* Control panel */}
                      <rect x={midX-32} y={bTop+18} width={64} height={46}
                        fill="#020617" rx={3} stroke="#1e3a52" strokeWidth={1.5} />
                      <rect x={midX-28} y={bTop+22} width={56} height={24}
                        fill="#011020" rx={1} stroke="#0e7490" strokeWidth={0.8} />
                      {/* Display waveform */}
                      <path
                        d={`M ${midX-24} ${bTop+34} Q ${midX-14} ${bTop+26} ${midX-4} ${bTop+34}
                             T ${midX+16} ${bTop+34} T ${midX+24} ${bTop+26}`}
                        fill="none" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="3 2">
                        <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.55s" repeatCount="indefinite" />
                      </path>
                      {/* Panel buttons */}
                      <circle cx={midX-16} cy={bTop+55} r={3.5} className="led-blink-cyan"   filter="url(#glow-cyan)" />
                      <circle cx={midX-6}  cy={bTop+55} r={3.5} className="led-blink-green"  />
                      <circle cx={midX+4}  cy={bTop+55} r={3.5} className="led-blink-yellow" />
                      <circle cx={midX+14} cy={bTop+55} r={3.5} fill="#ef4444" />
                      {/* Parts shelf Left */}
                      <rect x={x+16} y={bTop+130} width={22} height={60} fill="#111827" stroke="#374151" strokeWidth={1} rx={1} />
                      {Array.from({ length: 3 }, (_, i) => (
                        <rect key={i} x={x+17} y={bTop+133+i*18} width={20} height={12}
                          fill="#1f2937" stroke="#374151" strokeWidth={0.5} />
                      ))}
                      {/* Parts shelf Right */}
                      <rect x={x+bW-38} y={bTop+130} width={22} height={60} fill="#111827" stroke="#374151" strokeWidth={1} rx={1} />
                      {Array.from({ length: 3 }, (_, i) => (
                        <rect key={i} x={x+bW-37} y={bTop+133+i*18} width={20} height={12}
                          fill="#1f2937" stroke="#374151" strokeWidth={0.5} />
                      ))}
                    </g>
                  )
                  break
                }

                // ──────────────────────────────────────────────────────────
                case "최종검사": {
                  roofFeature = (
                    <g>
                      {/* Inspection beacon */}
                      <rect x={midX-6} y={bTop-24} width={12} height={24} fill="#1f2937" stroke="#374151" strokeWidth={1} />
                      <circle cx={midX} cy={bTop-28} r={10} fill="#1f2937" stroke="#374151" strokeWidth={1.5} />
                      <circle cx={midX} cy={bTop-28} r={6}  className="led-blink-green" filter="url(#glow-green)" />
                      {/* Camera left */}
                      <rect x={x+22} y={bTop-16} width={22} height={16} fill="#1f2937" stroke="#374151" strokeWidth={1} rx={2} />
                      <circle cx={x+33} cy={bTop-8} r={5} fill="#111827" stroke="#4b5563" strokeWidth={1} />
                      <circle cx={x+33} cy={bTop-8} r={2.5} fill="#022a3d" />
                      {/* Camera right */}
                      <rect x={x+bW-44} y={bTop-16} width={22} height={16} fill="#1f2937" stroke="#374151" strokeWidth={1} rx={2} />
                      <circle cx={x+bW-33} cy={bTop-8} r={5} fill="#111827" stroke="#4b5563" strokeWidth={1} />
                      <circle cx={x+bW-33} cy={bTop-8} r={2.5} fill="#022a3d" />
                    </g>
                  )
                  interior = (
                    <g>
                      {/* Gate portal frame */}
                      <rect x={x+38} y={bTop+18} width={8} height={bH-52}
                        fill="#1a3550" stroke="#0e7490" strokeWidth={1} />
                      <rect x={x+bW-46} y={bTop+18} width={8} height={bH-52}
                        fill="#1a3550" stroke="#0e7490" strokeWidth={1} />
                      <rect x={x+38} y={bTop+18} width={bW-76} height={8}
                        fill="#1a3550" stroke="#0e7490" strokeWidth={1} />
                      {/* Dashed border */}
                      <rect x={x+38} y={bTop+18} width={bW-76} height={bH-52}
                        fill="none" stroke="#22c55e" strokeWidth={1.5}
                        strokeDasharray="5 4" opacity={0.6} filter="url(#glow-green)" />
                      {/* Pillar neon */}
                      <line x1={x+42} y1={bTop+26} x2={x+42} y2={bBtm-34}
                        stroke="#22c55e" strokeWidth={1.2} opacity={0.8} className="neon-pulse" />
                      <line x1={x+bW-42} y1={bTop+26} x2={x+bW-42} y2={bBtm-34}
                        stroke="#22c55e" strokeWidth={1.2} opacity={0.8} className="neon-pulse" />
                      {/* Scan laser beams */}
                      <line x1={x+46} y1={bTop+55} x2={x+bW-46} y2={bTop+55}
                        stroke="#22c55e" strokeWidth={1.8} filter="url(#glow-green)" opacity={0.9} className="neon-pulse" />
                      <line x1={x+46} y1={bTop+100} x2={x+bW-46} y2={bTop+100}
                        stroke="#22c55e" strokeWidth={1.8} filter="url(#glow-green)" opacity={0.9} className="neon-pulse"
                        style={{ animationDelay: "0.5s" }} />
                      <line x1={x+46} y1={bTop+145} x2={x+bW-46} y2={bTop+145}
                        stroke="#22c55e" strokeWidth={1.8} filter="url(#glow-green)" opacity={0.9} className="neon-pulse"
                        style={{ animationDelay: "1s" }} />
                      {/* Animated scan rect */}
                      <rect x={x+46} y={bTop+26} width={bW-92} height={14} fill="#22c55e" opacity={0.18}>
                        <animate attributeName="y" values={`${bTop+26};${bBtm-52};${bTop+26}`}
                          dur="2.6s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0;0.22;0.22;0" dur="2.6s" repeatCount="indefinite" />
                      </rect>
                      {/* Barcode display */}
                      <rect x={midX-22} y={bTop+28} width={44} height={44}
                        fill="#010f06" rx={2} stroke="#1e4a2e" strokeWidth={1} />
                      {[0,1,2,3,4,5].map((i) => (
                        <rect key={i} x={midX-18+i*7} y={bTop+31} width={i%2===0?4:2} height={38}
                          fill="#22c55e" opacity={0.75} />
                      ))}
                      {/* PASS display */}
                      <rect x={midX-32} y={bBtm-62} width={64} height={26}
                        fill="#010f06" rx={3} stroke="#22c55e" strokeWidth={1.5} />
                      <text x={midX} y={bBtm-43} textAnchor="middle"
                        fill="#22c55e" fontSize={14} fontWeight={900} letterSpacing="2.5px"
                        className="led-blink-green" filter="url(#glow-green)">
                        PASS
                      </text>
                      {/* Corner LEDs */}
                      <circle cx={x+44} cy={bTop+22} r={4} className="led-blink-green" filter="url(#glow-green)" />
                      <circle cx={x+bW-44} cy={bTop+22} r={4} className="led-blink-green" filter="url(#glow-green)" />
                    </g>
                  )
                  break
                }
              }

              // ──────────────────────────────────────────────────────────────
              //  Shared building structure (rendered same for every station)
              // ──────────────────────────────────────────────────────────────
              return (
                <g key={name}>

                  {/* Ground shadow blob */}
                  <ellipse cx={x+bW/2} cy={pBtm+12} rx={bW*0.62} ry={15}
                    fill="#000" opacity={0.42} />

                  {/* ── 3D Platform ── */}
                  {/* Platform top face (isometric trapezoid) */}
                  <polygon
                    points={`${x-12},${bBtm} ${x+bW+12},${bBtm} ${x+bW+24},${pBtm} ${x-24},${pBtm}`}
                    fill="url(#platformTop)" stroke="#0891b2" strokeWidth={1.5}
                  />
                  {/* Platform front face */}
                  <polygon
                    points={`${x-24},${pBtm} ${x+bW+24},${pBtm} ${x+bW+24},${pBtm+8} ${x-24},${pBtm+8}`}
                    fill="url(#platformSide)"
                  />
                  {/* Platform LED strip */}
                  <line x1={x-22} y1={pBtm+7} x2={x+bW+22} y2={pBtm+7}
                    stroke="#22d3ee" strokeWidth={3.5} opacity={0.65}
                    filter="url(#glow-cyan)" className="neon-pulse"
                  />
                  {/* Platform LED dots */}
                  {Array.from({ length: 8 }, (_, i) => (
                    <circle key={i}
                      cx={x-20 + ((bW+42)/9)*(i+0.5)} cy={pBtm+3}
                      r={2.5} fill="#22d3ee" opacity={0.8}
                      className="led-blink-cyan"
                      style={{ animationDelay: `${i*0.13}s` }}
                    />
                  ))}

                  {/* ── Building right 3D side face (depth illusion) ── */}
                  <polygon
                    points={`${x+bW},${bTop} ${x+bW+12},${bTop+14} ${x+bW+12},${bBtm+14} ${x+bW},${bBtm}`}
                    fill="url(#bldgSideR)" stroke="#1a2c44" strokeWidth={0.8}
                  />

                  {/* ── Main building front face ── */}
                  <rect x={x} y={bTop} width={bW} height={bH}
                    fill="url(#bldgFront)" stroke="#243448" strokeWidth={1.5}
                  />

                  {/* Vertical panel dividers */}
                  {Array.from({ length: 4 }, (_, i) => (
                    <line key={i}
                      x1={x+(bW/5)*(i+1)} y1={bTop}
                      x2={x+(bW/5)*(i+1)} y2={bBtm}
                      stroke="#081220" strokeWidth={1} opacity={0.55}
                    />
                  ))}

                  {/* ── Corner pillars ── */}
                  <rect x={x}       y={bTop} width={pw} height={bH} fill="url(#pillarGrad)" stroke="#2d4a6a" strokeWidth={0.8} />
                  <rect x={x+bW-pw} y={bTop} width={pw} height={bH} fill="url(#pillarGrad)" stroke="#2d4a6a" strokeWidth={0.8} />
                  {/* Pillar neon edge lines */}
                  <line x1={x+3}    y1={bTop} x2={x+3}    y2={bBtm} stroke="#06b6d4" strokeWidth={3} opacity={0.9} filter="url(#glow-cyan)" />
                  <line x1={x+bW-3} y1={bTop} x2={x+bW-3} y2={bBtm} stroke="#06b6d4" strokeWidth={3} opacity={0.9} filter="url(#glow-cyan)" />

                  {/* ── Windows (upper section, left & right) ── */}
                  <rect x={x+pw+5}      y={bTop+14} width={56} height={40} rx={2} fill="#030f1a" stroke="#1e4a6e" strokeWidth={1.2} />
                  <rect x={x+pw+7}      y={bTop+16} width={52} height={36} rx={1} fill="url(#windowGrad)" opacity={0.88} />
                  <line x1={x+pw+33}    y1={bTop+16} x2={x+pw+33}    y2={bTop+52} stroke="#1e4a6e" strokeWidth={0.8} />
                  <line x1={x+pw+7}     y1={bTop+34} x2={x+pw+59}    y2={bTop+34} stroke="#1e4a6e" strokeWidth={0.8} />

                  <rect x={x+bW-pw-61} y={bTop+14} width={56} height={40} rx={2} fill="#030f1a" stroke="#1e4a6e" strokeWidth={1.2} />
                  <rect x={x+bW-pw-59} y={bTop+16} width={52} height={36} rx={1} fill="url(#windowGrad)" opacity={0.88} />
                  <line x1={x+bW-pw-33} y1={bTop+16} x2={x+bW-pw-33} y2={bTop+52} stroke="#1e4a6e" strokeWidth={0.8} />
                  <line x1={x+bW-pw-59} y1={bTop+34} x2={x+bW-pw-7}  y2={bTop+34} stroke="#1e4a6e" strokeWidth={0.8} />

                  {/* ── Entrance shutter (bottom center) ── */}
                  <rect x={midX-26} y={bBtm-54} width={52} height={54}
                    fill="#010810" stroke="#0e7490" strokeWidth={1.5} />
                  {Array.from({ length: 7 }, (_, i) => (
                    <line key={i}
                      x1={midX-24} y1={bBtm-50+i*7}
                      x2={midX+24} y2={bBtm-50+i*7}
                      stroke="#1a3a4a" strokeWidth={1.2} />
                  ))}
                  {/* Gate neon glow */}
                  <rect x={midX-27} y={bBtm-55} width={54} height={56}
                    fill="none" stroke="#22d3ee" strokeWidth={1}
                    filter="url(#glow-cyan)" opacity={0.55}
                  />

                  {/* ── Mid-building horizontal accent band ── */}
                  <rect x={x} y={bTop+bH*0.56} width={bW} height={4} fill="#0a1c2e" opacity={0.85} />
                  <line x1={x} y1={bTop+bH*0.56+2} x2={x+bW} y2={bTop+bH*0.56+2}
                    stroke="#22d3ee" strokeWidth={0.8} opacity={0.28} />

                  {/* ── Roof (isometric polygon) ── */}
                  <polygon
                    points={`${x},${bTop} ${x+bW},${bTop} ${x+bW+12},${bTop-16} ${x-12},${bTop-16}`}
                    fill="url(#bldgRoof)" stroke="#2a4a6e" strokeWidth={1.5}
                  />
                  {/* Roof top neon edge */}
                  <line x1={x-12} y1={bTop-16} x2={x+bW+12} y2={bTop-16}
                    stroke="#22d3ee" strokeWidth={2.2} opacity={0.7} filter="url(#glow-cyan)" />
                  {/* Roof side seams */}
                  <line x1={x}    y1={bTop} x2={x-12}    y2={bTop-16} stroke="#2a4a6e" strokeWidth={1} />
                  <line x1={x+bW} y1={bTop} x2={x+bW+12} y2={bTop-16} stroke="#2a4a6e" strokeWidth={1} />

                  {/* ── Process-specific roof feature ── */}
                  {roofFeature}

                  {/* ── Process-specific interior ── */}
                  {interior}

                  {/* ── Corner status LEDs ── */}
                  <circle cx={x+20}    cy={bTop+8} r={4.5} className="led-blink-cyan" filter="url(#glow-cyan)" />
                  <circle cx={x+bW-20} cy={bTop+8} r={4.5} className="led-blink-cyan" filter="url(#glow-cyan)" />

                  {/* ── Hologram label (floats above building) ── */}
                  <g className="hologram-float">
                    {/* Stem */}
                    <line x1={midX} y1={bTop-16} x2={midX} y2={bTop-40}
                      stroke="#0891b2" strokeWidth={2} />
                    {/* Label rect */}
                    <rect x={x+10} y={bTop-74} width={bW-20} height={34}
                      rx={5} fill="url(#hologramGrad)"
                      stroke="#06b6d4" strokeWidth={2} filter="url(#glow-cyan)"
                    />
                    {/* Corner bracket marks */}
                    <path d={`M ${x+15} ${bTop-70} L ${x+15} ${bTop-72} L ${x+22} ${bTop-72}`}
                      stroke="#22d3ee" strokeWidth={1.5} fill="none" />
                    <path d={`M ${x+bW-15} ${bTop-70} L ${x+bW-15} ${bTop-72} L ${x+bW-22} ${bTop-72}`}
                      stroke="#22d3ee" strokeWidth={1.5} fill="none" />
                    <path d={`M ${x+15} ${bTop-44} L ${x+15} ${bTop-42} L ${x+22} ${bTop-42}`}
                      stroke="#22d3ee" strokeWidth={1.5} fill="none" />
                    <path d={`M ${x+bW-15} ${bTop-44} L ${x+bW-15} ${bTop-42} L ${x+bW-22} ${bTop-42}`}
                      stroke="#22d3ee" strokeWidth={1.5} fill="none" />
                    {/* Process name */}
                    <text
                      x={midX} y={bTop-50}
                      textAnchor="middle" fill="#f8fafc"
                      fontSize={16} fontWeight={900} letterSpacing="1.8px"
                      style={{ textShadow: "0 0 14px rgba(6, 182, 212, 1)" }}
                    >
                      {name}
                    </text>
                  </g>
                </g>
              )
            })}

            {/* ── AGV Robots ──────────────────────────────────────────────── */}
            {agvs.map((agv) => {
              const pos     = getAgvPosition(agv)
              const color   = getStatusColor(agv.status)
              const label   = getStatusLabel(agv.status)
              const filterId = agv.status === "MOVING" ? "glow-cyan"
                             : agv.status === "RETURNING" ? "glow-purple"
                             : "glow-yellow"
              const isReturning = agv.status === "RETURNING"

              return (
                <g key={agv.id} transform={`translate(${pos.x},${pos.y})`}>

                  {/* Motion aura (animated ellipse) */}
                  {agv.status !== "WAITING" && (
                    <ellipse cx="0" cy="3" rx="32" ry="12"
                      fill="none" stroke={color} strokeWidth={2} opacity={0.28}
                      filter={`url(#${filterId})`}
                    >
                      <animate attributeName="rx" values="32;44;32" dur="1.4s" repeatCount="indefinite" />
                      <animate attributeName="ry" values="12;18;12" dur="1.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.42;0.04;0.42" dur="1.4s" repeatCount="indefinite" />
                    </ellipse>
                  )}

                  <g transform={`scale(${isReturning ? -1 : 1}, 1)`}>
                    {/* Wheels — 4 corners */}
                    <rect x="-24" y="-24" width="13" height="7" rx="2.2" fill="#05070c" stroke="#475569" strokeWidth="0.8" />
                    <rect x="11"  y="-24" width="13" height="7" rx="2.2" fill="#05070c" stroke="#475569" strokeWidth="0.8" />
                    <rect x="-24" y="17"  width="13" height="7" rx="2.2" fill="#05070c" stroke="#475569" strokeWidth="0.8" />
                    <rect x="11"  y="17"  width="13" height="7" rx="2.2" fill="#05070c" stroke="#475569" strokeWidth="0.8" />
                    {/* Wheel hub dots */}
                    <circle cx="-17" cy="-20" r="2.2" fill="#1e293b" />
                    <circle cx="17"  cy="-20" r="2.2" fill="#1e293b" />
                    <circle cx="-17" cy="20"  r="2.2" fill="#1e293b" />
                    <circle cx="17"  cy="20"  r="2.2" fill="#1e293b" />

                    {/* Main body */}
                    <rect x="-26" y="-17" width="52" height="34" rx="5"
                      fill="url(#agvBody)" stroke="#4f5e75" strokeWidth={1.8}
                    />

                    {/* Colour status strips */}
                    <line x1="-21" y1="-13" x2="21" y2="-13" stroke={color} strokeWidth={2.2} opacity={0.95} filter={`url(#${filterId})`} />
                    <line x1="-21" y1="13"  x2="21" y2="13"  stroke={color} strokeWidth={2.2} opacity={0.95} filter={`url(#${filterId})`} />

                    {/* Front sensor arc */}
                    <path d="M 26 -10 Q 34 0 26 10"
                      fill="none" stroke={color} strokeWidth={2.2}
                      filter={`url(#${filterId})`} opacity={0.9}
                    />
                    <circle cx="25" cy="0" r="3" fill={color} filter={`url(#${filterId})`} />

                    {/* Payload */}
                    {agv.status === "MOVING" ? (
                      <g transform="translate(0, -3)">
                        <polygon points="-14,-16 8,-16 15,-9 -7,-9" fill="url(#cargoTop)"   stroke="#22d3ee" strokeWidth={0.8} />
                        <polygon points="-7,-9 15,-9 15,3 -7,3"     fill="url(#cargoFront)" stroke="#0891b2" strokeWidth={0.8} />
                        <polygon points="-14,-16 -7,-9 -7,3 -14,-4" fill="url(#cargoSide)"  stroke="#0e7490" strokeWidth={0.8} />
                      </g>
                    ) : (
                      <g>
                        <rect x="-13" y="-8" width="26" height="16" fill="#01040a" rx="2.5" stroke="#334155" strokeWidth={0.8} />
                        <line x1="-10" y1="-3.5" x2="10" y2="-3.5" stroke="#475569" strokeWidth={1.2} />
                        <line x1="-10" y1="1"     x2="10" y2="1"    stroke="#475569" strokeWidth={1.2} />
                        <line x1="-10" y1="5.5"   x2="10" y2="5.5"  stroke="#475569" strokeWidth={1.2} />
                        {isReturning && (
                          <circle cx="0" cy="-0.5" r="4" className="led-blink-purple" filter="url(#glow-purple)" />
                        )}
                        {agv.status === "WAITING" && (
                          <circle cx="0" cy="-0.5" r="4" className="led-blink-yellow" filter="url(#glow-yellow)" />
                        )}
                      </g>
                    )}
                  </g>

                  {/* AGV ID label */}
                  <g transform="translate(0, -33)">
                    <rect x="-28" y="-7" width="56" height="14" rx="3.5"
                      fill="#010409" stroke={color} strokeWidth={1.1} opacity={0.96}
                    />
                    <text x="0" y="5"
                      textAnchor="middle" fill="#f8fafc"
                      fontSize="9" fontWeight="900" letterSpacing="0.5px"
                    >
                      {agv.id}
                    </text>
                  </g>

                  {/* Status label */}
                  <g transform="translate(0, 33)">
                    <rect x="-20" y="-6" width="40" height="13" rx="6"
                      fill="#090f1e" stroke={color} strokeWidth={1.1} opacity={0.96}
                    />
                    <text x="0" y="5"
                      textAnchor="middle" fill={color}
                      fontSize="8.5" fontWeight="900"
                    >
                      {label}
                    </text>
                  </g>
                </g>
              )
            })}

          </svg>
        </div>

        {/* ── Side Panel ────────────────────────────────────────────────── */}
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
