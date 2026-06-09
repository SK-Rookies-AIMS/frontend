"use client"

import { useState, useEffect } from "react"
import { Truck } from "lucide-react"

// AGV paths for animation - following the exact lines in the design
// New Route: AGV저장소 -> 프레스 -> 차체 -> 도장 -> 의장 -> 최종 검사 -> AGV저장소 (direct return via bottom curve)
const agvPath = [
  { x: 80, y: 365 },  // AGV 저장소
  { x: 80, y: 100 },  // Up to 프레스
  { x: 200, y: 100 },  // 프레스 to 차체 (horizontal)
  { x: 200, y: 230 },  // 차체 to 도장 (vertical down)
  { x: 320, y: 230 },  // 도장 to 의장 (horizontal right)
  { x: 440, y: 230 },  // 의장 to 최종 검사
  { x: 440, y: 380 },  // 최종 검사 down to bottom
  { x: 80, y: 380 },  // Horizontal back to AGV 저장소 (bottom path)
]

export function ProcessFlow() {
  const [agvPositions, setAgvPositions] = useState([
    { pathIndex: 0, progress: 0 },
    { pathIndex: 2, progress: 0.5 },
  ])

  // Animate AGVs along the path
  useEffect(() => {
    const interval = setInterval(() => {
      setAgvPositions(prev => prev.map(agv => {
        const currentIdx = agv.pathIndex
        const nextIdx = (currentIdx + 1) % agvPath.length
        let newProgress = agv.progress + 0.015
        let newPathIndex = currentIdx

        if (newProgress >= 1) {
          newProgress = 0
          newPathIndex = nextIdx
        }

        return {
          pathIndex: newPathIndex,
          progress: newProgress,
        }
      }))
    }, 50)

    return () => clearInterval(interval)
  }, [])

  // Calculate AGV positions
  const getAgvPosition = (agv: { pathIndex: number; progress: number }) => {
    const currentPoint = agvPath[agv.pathIndex]
    const nextPoint = agvPath[(agv.pathIndex + 1) % agvPath.length]
    return {
      x: currentPoint.x + (nextPoint.x - currentPoint.x) * agv.progress,
      y: currentPoint.y + (nextPoint.y - currentPoint.y) * agv.progress,
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium">공정 흐름도</h2>
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-primary"></div>
            <span className="text-muted-foreground">주행 경로</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-muted-foreground"></div>
            <span className="text-muted-foreground">대기 경로</span>
          </div>
        </div>
      </div>

      {/* Process Flow 2D Map */}
      <div className="relative h-[450px] rounded-lg overflow-hidden bg-[#0a1628]">
        <svg viewBox="0 0 550 450" className="absolute inset-0 w-full h-full">
          <defs>
            <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-warning" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Connection Lines */}
          {/* AGV저장소 to 프레스 (vertical line up) */}
          <line x1="80" y1="320" x2="80" y2="140" stroke="#64748b" strokeWidth="2" />
          
          {/* 프레스 to 차체 (horizontal line) */}
          <line x1="120" y1="100" x2="150" y2="100" stroke="#64748b" strokeWidth="2" />
          
          {/* 차체 to 도장 (vertical dashed line) */}
          <line x1="200" y1="140" x2="200" y2="180" stroke="#64748b" strokeWidth="2" strokeDasharray="6 4" />
          
          {/* 도장 to 의장 (horizontal line) */}
          <line x1="250" y1="230" x2="270" y2="230" stroke="#64748b" strokeWidth="2" />
          
          {/* 의장 to 최종 검사 (horizontal line) */}
          <line x1="370" y1="230" x2="390" y2="230" stroke="#64748b" strokeWidth="2" />
          
          {/* 최종 검사 to bottom (vertical line down) */}
          <line x1="440" y1="280" x2="440" y2="380" stroke="#64748b" strokeWidth="2" />
          
          {/* Bottom horizontal line from 최종 검사 to AGV저장소 */}
          <line x1="440" y1="380" x2="120" y2="380" stroke="#64748b" strokeWidth="2" />
          
          {/* Bottom to AGV저장소 (short vertical) */}
          <line x1="80" y1="380" x2="80" y2="410" stroke="#64748b" strokeWidth="2" />

          {/* ========== STATION NODES ========== */}
          
          {/* 프레스 Station - Top Left */}
          <g transform="translate(30, 50)">
            <rect x="0" y="0" width="90" height="80" rx="8" fill="#0f1d32" stroke="#22d3ee" strokeWidth="1.5" filter="url(#glow-cyan)" />
            <rect x="20" y="30" width="50" height="40" rx="4" fill="#1a2d4a" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.3" />
            {/* Press Machine Icon */}
            <g transform="translate(30, 36)">
              <rect x="0" y="5" width="30" height="20" rx="2" fill="#22d3ee" fillOpacity="0.3" />
              <rect x="5" y="0" width="20" height="8" rx="1" fill="#22d3ee" fillOpacity="0.5" />
              <rect x="10" y="15" width="10" height="10" rx="1" fill="#22d3ee" fillOpacity="0.6" />
            </g>
            <text x="45" y="16" textAnchor="middle" fill="#22d3ee" fontSize="10" fontWeight="500">프레스</text>
          </g>

          {/* 차체 Station - Top Right */}
          <g transform="translate(150, 50)">
            <rect x="0" y="0" width="90" height="80" rx="8" fill="#0f1d32" stroke="#22d3ee" strokeWidth="1.5" filter="url(#glow-cyan)" />
            <rect x="20" y="30" width="50" height="40" rx="4" fill="#1a2d4a" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.3" />
            {/* Car Body Icon */}
            <g transform="translate(30, 38)">
              <path d="M 5 20 L 10 10 L 25 10 L 30 20 L 30 25 L 5 25 Z" fill="#22d3ee" fillOpacity="0.4" stroke="#22d3ee" strokeWidth="1" />
              <circle cx="10" cy="25" r="4" fill="#22d3ee" fillOpacity="0.6" />
              <circle cx="25" cy="25" r="4" fill="#22d3ee" fillOpacity="0.6" />
            </g>
            <text x="45" y="16" textAnchor="middle" fill="#22d3ee" fontSize="10" fontWeight="500">차체</text>
          </g>

          {/* 도장 Station - Center with Warning */}
          <g transform="translate(150, 180)">
            <rect x="0" y="0" width="90" height="90" rx="8" fill="#0f1d32" stroke="#f59e0b" strokeWidth="2" filter="url(#glow-warning)">
              <animate attributeName="stroke-opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite"/>
            </rect>
            <rect x="20" y="35" width="50" height="45" rx="4" fill="#1a2d4a" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.3" />
            {/* Paint Spray Icon */}
            <g transform="translate(30, 42)">
              <rect x="5" y="15" width="25" height="20" rx="3" fill="#f59e0b" fillOpacity="0.3" stroke="#f59e0b" strokeWidth="1" />
              <path d="M 12 5 L 23 5 L 23 15 L 17 25 L 12 15 Z" fill="#f59e0b" fillOpacity="0.5" />
            </g>
            <text x="45" y="18" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="500">도장</text>
            {/* Warning indicator */}
            <g transform="translate(75, -10)">
              <circle cx="10" cy="10" r="12" fill="#f59e0b" fillOpacity="0.3">
                <animate attributeName="r" values="12;16;12" dur="1s" repeatCount="indefinite"/>
              </circle>
              <circle cx="10" cy="10" r="9" fill="#f59e0b" />
              <text x="10" y="14" textAnchor="middle" fill="#0a1628" fontSize="12" fontWeight="bold">!</text>
            </g>
          </g>

          {/* 의장 Station - Right */}
          <g transform="translate(270, 180)">
            <rect x="0" y="0" width="90" height="90" rx="8" fill="#0f1d32" stroke="#22d3ee" strokeWidth="1.5" filter="url(#glow-cyan)" />
            <rect x="20" y="35" width="50" height="45" rx="4" fill="#1a2d4a" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.3" />
            {/* Car Assembly Icon */}
            <g transform="translate(30, 44)">
              <path d="M 5 22 L 10 12 L 25 12 L 30 22 L 30 28 L 5 28 Z" fill="#22d3ee" fillOpacity="0.4" stroke="#22d3ee" strokeWidth="1" />
              <circle cx="10" cy="28" r="4" fill="#22d3ee" fillOpacity="0.6" />
              <circle cx="25" cy="28" r="4" fill="#22d3ee" fillOpacity="0.6" />
            </g>
            <text x="45" y="18" textAnchor="middle" fill="#22d3ee" fontSize="10" fontWeight="500">의장</text>
          </g>

          {/* 최종 검사 Station - Far Right */}
          <g transform="translate(390, 180)">
            <rect x="0" y="0" width="90" height="90" rx="8" fill="#0f1d32" stroke="#22d3ee" strokeWidth="1.5" filter="url(#glow-cyan)" />
            <rect x="20" y="35" width="50" height="45" rx="4" fill="#1a2d4a" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.3" />
            {/* Check Icon */}
            <g transform="translate(30, 45)">
              <rect x="5" y="5" width="25" height="25" rx="4" fill="#22d3ee" fillOpacity="0.3" stroke="#22d3ee" strokeWidth="1" />
              <path d="M 10 18 L 15 23 L 25 12" stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <text x="45" y="18" textAnchor="middle" fill="#22d3ee" fontSize="9" fontWeight="500">최종 검사</text>
          </g>

          {/* AGV 저장소 Station - Bottom Left */}
          <g transform="translate(30, 320)">
            <rect x="0" y="0" width="90" height="80" rx="8" fill="#0f1d32" stroke="#22d3ee" strokeWidth="1.5" filter="url(#glow-cyan)" />
            <rect x="20" y="30" width="50" height="40" rx="4" fill="#1a2d4a" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.3" />
            {/* Forklift/AGV Icon */}
            <g transform="translate(27, 35)">
              <rect x="0" y="15" width="25" height="18" rx="2" fill="#22d3ee" fillOpacity="0.4" stroke="#22d3ee" strokeWidth="1" />
              <rect x="25" y="10" width="8" height="23" rx="1" fill="#22d3ee" fillOpacity="0.3" />
              <circle cx="6" cy="33" r="4" fill="#22d3ee" fillOpacity="0.6" />
              <circle cx="19" cy="33" r="4" fill="#22d3ee" fillOpacity="0.6" />
            </g>
            <text x="45" y="16" textAnchor="middle" fill="#22d3ee" fontSize="9" fontWeight="500">AGV 저장소</text>
          </g>

          {/* ========== AGV Vehicles ========== */}
          {agvPositions.map((agv, idx) => {
            const pos = getAgvPosition(agv)
            return (
              <g key={idx} transform={`translate(${pos.x - 18}, ${pos.y - 15})`}>
                {/* AGV glow effect */}
                <ellipse cx="18" cy="20" rx="15" ry="12" fill="#22d3ee" fillOpacity="0.15">
                  <animate attributeName="rx" values="15;20;15" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="ry" values="12;16;12" dur="2s" repeatCount="indefinite"/>
                </ellipse>
                {/* AGV body */}
                <rect x="6" y="12" width="24" height="16" fill="#1e293b" stroke="#22d3ee" strokeWidth="1.5" rx="3"/>
                <rect x="9" y="15" width="18" height="10" fill="#22d3ee" fillOpacity="0.25" rx="1"/>
                {/* Wheels */}
                <circle cx="10" cy="28" r="3" fill="#22d3ee" fillOpacity="0.5" />
                <circle cx="26" cy="28" r="3" fill="#22d3ee" fillOpacity="0.5" />
                {/* AGV label */}
                <rect x="2" y="-2" width="32" height="12" fill="#0f172a" fillOpacity="0.95" rx="3" stroke="#22d3ee" strokeWidth="0.5"/>
                <text x="18" y="7" textAnchor="middle" fill="#22d3ee" fontSize="7" fontWeight="600">
                  AGV-0{idx + 1}
                </text>
                {/* Status indicator */}
                <circle cx="30" cy="4" r="3" fill="#22c55e">
                  <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite"/>
                </circle>
              </g>
            )
          })}
        </svg>

        {/* Mini Legend */}
        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm rounded-lg p-2 text-[10px]">
          <div className="flex items-center gap-2 text-slate-400">
            <Truck className="w-3 h-3 text-cyan-400"/>
            <span>AGV 2대 운행중</span>
          </div>
        </div>
      </div>
    </div>
  )
}
