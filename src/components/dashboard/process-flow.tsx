"use client"

import { useMemo } from "react"
import { Truck } from "lucide-react"

import { useAgvWebsocket } from "@/hooks/use-agv-websocket"
import type { ProcessFlowAgv } from "@/lib/agv-mapper"

// ─────────────────────────────────────────────────────────────────────────────
//  SVG Canvas
// ─────────────────────────────────────────────────────────────────────────────
const SVG_W = 1380
const SVG_H = 760

// ─────────────────────────────────────────────────────────────────────────────
//  Process station layout  (cx,cy = center of front-face)
//    01 프레스 ────────────── 02 차체
//                               │
//                 03 도장 ──── 04 의장 ──── 05 최종검사
// ─────────────────────────────────────────────────────────────────────────────
const BW = 210   // building front-face width
const BH = 170   // building front-face height
const ISO_DX = 30  // isometric side-face X depth
const ISO_DY = 20  // isometric roof/side Y depth

const STATIONS = [
  { id: 0, name: "프레스",   num: "01", cx: 170,  cy: 250 },
  { id: 1, name: "차체",     num: "02", cx: 560,  cy: 250 },
  { id: 2, name: "도장",     num: "03", cx: 490,  cy: 530 },
  { id: 3, name: "의장",     num: "04", cx: 870,  cy: 530 },
  { id: 4, name: "최종검사", num: "05", cx: 1230, cy: 530 },
]

// ─────────────────────────────────────────────────────────────────────────────
//  Routes (routeIndex matches agv-mapper.ts ROUTE_INDEX)
//    0 = PRESS_BODY          프레스 → 차체
//    1 = BODY_PAINT          차체   → 도장  (L-shaped: right then down)
//    2 = PAINT_ASSEMBLY      도장   → 의장
//    3 = ASSEMBLY_INSPECTION 의장   → 최종검사
// ─────────────────────────────────────────────────────────────────────────────
const ROUTES: { pts: { x: number; y: number }[] }[] = [
  {
    // 프레스 → 차체  (horizontal)
    pts: [
      { x: STATIONS[0].cx + BW / 2 + ISO_DX + 8, y: STATIONS[0].cy + BH / 4 },
      { x: STATIONS[1].cx - BW / 2 - 8,           y: STATIONS[1].cy + BH / 4 },
    ],
  },
  {
    // 차체 → 도장  (L-shape: go down then left)
    pts: [
      { x: STATIONS[1].cx + BW / 4, y: STATIONS[1].cy + BH / 2 + 8 },
      { x: STATIONS[1].cx + BW / 4, y: STATIONS[2].cy },
      { x: STATIONS[2].cx + BW / 2 + ISO_DX + 8, y: STATIONS[2].cy },
    ],
  },
  {
    // 도장 → 의장  (horizontal)
    pts: [
      { x: STATIONS[2].cx + BW / 2 + ISO_DX + 8, y: STATIONS[2].cy + BH / 4 },
      { x: STATIONS[3].cx - BW / 2 - 8,           y: STATIONS[3].cy + BH / 4 },
    ],
  },
  {
    // 의장 → 최종검사  (horizontal)
    pts: [
      { x: STATIONS[3].cx + BW / 2 + ISO_DX + 8, y: STATIONS[3].cy + BH / 4 },
      { x: STATIONS[4].cx - BW / 2 - 8,           y: STATIONS[4].cy + BH / 4 },
    ],
  },
]

const LANE_COUNT = 5
const LANE_SPREAD = 40

// ─────────────────────────────────────────────────────────────────────────────
//  AGV status helpers  (logic unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const getStatusColor = (status: ProcessFlowAgv["status"]) => {
  if (status === "MOVING") return "#22d3ee"
  if (status === "RETURNING") return "#a855f7"
  if (status === "UNLOADING") return "#22c55e"
  return "#eab308"
}
const getStatusLabel = (status: ProcessFlowAgv["status"]) => {
  if (status === "MOVING") return "운반"
  if (status === "RETURNING") return "복귀"
  if (status === "UNLOADING") return "하역"
  return "대기"
}

// ─────────────────────────────────────────────────────────────────────────────
//  AGV position on a polyline  (unchanged logic, supports multi-segment)
// ─────────────────────────────────────────────────────────────────────────────
function lerp2(
  pts: { x: number; y: number }[],
  t: number,
  laneOffset: number
): { x: number; y: number; angle: number } {
  if (pts.length < 2) return { x: pts[0].x, y: pts[0].y, angle: 0 }
  const segs: { dx: number; dy: number; len: number }[] = []
  let total = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x
    const dy = pts[i + 1].y - pts[i].y
    const len = Math.sqrt(dx * dx + dy * dy) || 0.0001
    segs.push({ dx, dy, len })
    total += len
  }
  let dist = t * total
  let segI = 0
  let accumulated = 0
  while (segI < segs.length - 1 && accumulated + segs[segI].len < dist) {
    accumulated += segs[segI].len
    segI++
  }
  const seg = segs[segI]
  const local = (dist - accumulated) / seg.len
  const ux = seg.dx / seg.len
  const uy = seg.dy / seg.len
  const px = -uy * laneOffset
  const py = ux * laneOffset
  return {
    x: pts[segI].x + ux * seg.len * local + px,
    y: pts[segI].y + uy * seg.len * local + py,
    angle: Math.atan2(seg.dy, seg.dx) * (180 / Math.PI),
  }
}

function ptsToStr(pts: { x: number; y: number }[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(" ")
}

function offsetPolyline(
  pts: { x: number; y: number }[],
  d: number
): { x: number; y: number }[] {
  if (pts.length < 2) return pts
  
  const res: { x: number; y: number }[] = []
  const normals: { nx: number; ny: number }[] = []
  
  // Calculate normal for each segment
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x
    const dy = pts[i + 1].y - pts[i].y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    normals.push({ nx: -dy / len, ny: dx / len })
  }
  
  // Apply offset to points
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) {
      res.push({ x: pts[i].x + normals[0].nx * d, y: pts[i].y + normals[0].ny * d })
    } else if (i === pts.length - 1) {
      res.push({ x: pts[i].x + normals[i - 1].nx * d, y: pts[i].y + normals[i - 1].ny * d })
    } else {
      const n1 = normals[i - 1]
      const n2 = normals[i]
      const dot = n1.nx * n2.nx + n1.ny * n2.ny
      const denom = Math.abs(1 + dot) < 0.001 ? 1 : 1 + dot
      const nx = (n1.nx + n2.nx) / denom
      const ny = (n1.ny + n2.ny) / denom
      res.push({ x: pts[i].x + nx * d, y: pts[i].y + ny * d })
    }
  }
  return res
}

// ─────────────────────────────────────────────────────────────────────────────
//  SVG Defs (gradients, filters)
// ─────────────────────────────────────────────────────────────────────────────
function SvgDefs() {
  return (
    <defs>
      {/* Grid */}
      <pattern id="pf-grid" width="50" height="50" patternUnits="userSpaceOnUse">
        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#5ab4cc" strokeWidth="0.5" opacity="0.22" />
        <circle cx="0" cy="0" r="0.7" fill="#00a8c6" opacity="0.18" />
      </pattern>

      {/* Glow filters */}
      <filter id="pf-glow-c" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="pf-glow-p" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="pf-glow-y" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="pf-glow-g" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="pf-glow-o" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="pf-text-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="pf-drop" x="-10%" y="-10%" width="130%" height="160%">
        <feDropShadow dx="3" dy="6" stdDeviation="7" floodColor="#0a2540" floodOpacity="0.45" />
      </filter>

      {/* Building gradients */}
      <linearGradient id="pf-bldg-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1e3048" />
        <stop offset="40%" stopColor="#111f33" />
        <stop offset="100%" stopColor="#070e1c" />
      </linearGradient>
      <linearGradient id="pf-bldg-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2a4264" />
        <stop offset="100%" stopColor="#1a2e4a" />
      </linearGradient>
      <linearGradient id="pf-bldg-side" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0d1e32" />
        <stop offset="100%" stopColor="#060e1a" />
      </linearGradient>
      <linearGradient id="pf-pillar" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#2a4060" />
        <stop offset="50%" stopColor="#334d70" />
        <stop offset="100%" stopColor="#1a2e48" />
      </linearGradient>
      <linearGradient id="pf-platform-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1a3052" />
        <stop offset="100%" stopColor="#0c1c34" />
      </linearGradient>
      <linearGradient id="pf-platform-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0e1e36" />
        <stop offset="100%" stopColor="#060e1c" />
      </linearGradient>
      <linearGradient id="pf-platform-side" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0a1828" />
        <stop offset="100%" stopColor="#040c18" />
      </linearGradient>
      <linearGradient id="pf-metal-light" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3a5878" />
        <stop offset="100%" stopColor="#1e3248" />
      </linearGradient>
      <linearGradient id="pf-metal-dark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e2e42" />
        <stop offset="100%" stopColor="#0c1624" />
      </linearGradient>
      <linearGradient id="pf-warn-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#d97706" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="pf-window" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0a2a40" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#041520" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="pf-glass" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0e4060" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#042030" stopOpacity="0.7" />
      </linearGradient>
      <linearGradient id="pf-agv-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4f5e75" />
        <stop offset="50%" stopColor="#334155" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
      <linearGradient id="pf-cargo-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#0891b2" />
      </linearGradient>
      <linearGradient id="pf-cargo-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0891b2" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id="pf-cargo-side" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0e7490" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>

      {/* Arrow marker */}
      <marker id="pf-arrow-c" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#22d3ee" opacity="0.9" />
      </marker>
      <marker id="pf-arrow-p" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#a855f7" opacity="0.9" />
      </marker>
    </defs>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  CSS animations (inline in SVG)
// ─────────────────────────────────────────────────────────────────────────────
const SVG_CSS = `
  @keyframes pf-dash-fwd  { from { stroke-dashoffset: 36; } to { stroke-dashoffset: 0; } }
  @keyframes pf-dash-bwd  { from { stroke-dashoffset: 0; }  to { stroke-dashoffset: 36; } }
  @keyframes pf-blink     { 0%,100%{opacity:.25} 50%{opacity:1} }
  @keyframes pf-pulse-o   { 0%,100%{opacity:.5;filter:url(#pf-glow-o)} 50%{opacity:1;filter:url(#pf-glow-o)} }
  @keyframes pf-neon      { 0%,100%{opacity:.45} 50%{opacity:1} }
  @keyframes pf-float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  .pf-track-fwd  { animation: pf-dash-fwd 1.1s linear infinite; }
  .pf-track-bwd  { animation: pf-dash-bwd 1.1s linear infinite; }
  .pf-led-c      { animation: pf-blink 1s   ease-in-out infinite; fill: #22d3ee; }
  .pf-led-g      { animation: pf-blink .8s  ease-in-out infinite; fill: #22c55e; }
  .pf-led-y      { animation: pf-blink 1.3s ease-in-out infinite; fill: #eab308; }
  .pf-led-p      { animation: pf-blink 1s   ease-in-out infinite; fill: #a855f7; }
  .pf-warn-pulse { animation: pf-pulse-o 1.4s ease-in-out infinite; }
  .pf-neon       { animation: pf-neon   2.4s ease-in-out infinite; }
  .pf-float      { animation: pf-float  4s   ease-in-out infinite; }
`

// ─────────────────────────────────────────────────────────────────────────────
//  Isometric Platform
// ─────────────────────────────────────────────────────────────────────────────
function Platform({
  cx, cy, w, h,
  accentColor = "#22d3ee",
  warn = false,
}: {
  cx: number; cy: number; w: number; h: number
  accentColor?: string; warn?: boolean
}) {
  const pw = w + 40
  const ph = h
  const pd = 18
  const sdx = 28
  const sdy = 18

  const x = cx - pw / 2
  const y = cy + ph / 2
  const bdy = y + pd

  const topPts = `${x},${y} ${x + pw},${y} ${x + pw + sdx},${y - sdy} ${x + sdx},${y - sdy}`
  const frontPts = `${x},${y} ${x + pw},${y} ${x + pw},${bdy} ${x},${bdy}`
  const rightPts = `${x + pw},${y} ${x + pw + sdx},${y - sdy} ${x + pw + sdx},${bdy - sdy} ${x + pw},${bdy}`

  const lineColor = warn ? "#f59e0b" : accentColor
  const glowId = warn ? "pf-glow-o" : "pf-glow-c"

  return (
    <g>
      {/* Shadow */}
      <ellipse cx={cx + 14} cy={bdy + 14} rx={pw * 0.55} ry={11} fill="#000" opacity={0.4} />
      {/* Top */}
      <polygon points={topPts} fill="url(#pf-platform-top)" stroke={lineColor} strokeWidth={1.2} />
      {/* Front */}
      <polygon points={frontPts} fill="url(#pf-platform-front)" stroke="#1a3050" strokeWidth={0.8} />
      {/* Right side */}
      <polygon points={rightPts} fill="url(#pf-platform-side)" stroke="#0e1e36" strokeWidth={0.8} />
      {/* Neon edge - front bottom */}
      <line x1={x} y1={bdy} x2={x + pw} y2={bdy} stroke={lineColor} strokeWidth={2.5} opacity={0.7} filter={`url(#${glowId})`} className="pf-neon" />
      {/* LED dots along platform top edge */}
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={i}
          cx={x + 10 + ((pw - 20) / 6) * i} cy={y - 2}
          r={2.2} fill={lineColor} opacity={0.75}
          className="pf-led-c"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
      {/* Warn glow overlay */}
      {warn && (
        <polygon points={topPts} fill="url(#pf-warn-grad)" stroke="#f59e0b" strokeWidth={2.5}
          filter="url(#pf-glow-o)" className="pf-warn-pulse" />
      )}
    </g>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared building shell
// ─────────────────────────────────────────────────────────────────────────────
function BuildingShell({
  x, y, bw, bh, warn = false,
}: {
  x: number; y: number; bw: number; bh: number; warn?: boolean
}) {
  const sdx = ISO_DX
  const sdy = ISO_DY
  const midX = x + bw / 2
  const pw = 13

  const roofColor = warn ? "#f59e0b" : "#22d3ee"
  const glowId = warn ? "pf-glow-o" : "pf-glow-c"
  const borderColor = warn ? "#f59e0b" : "#1a3a5a"
  const borderW = warn ? 2.5 : 1.5

  return (
    <g filter="url(#pf-drop)">
      {/* Isometric right face */}
      <polygon
        points={`${x+bw},${y} ${x+bw+sdx},${y-sdy} ${x+bw+sdx},${y+bh-sdy} ${x+bw},${y+bh}`}
        fill="url(#pf-bldg-side)" stroke="#0a1624" strokeWidth={0.8}
      />
      {/* Isometric top face */}
      <polygon
        points={`${x},${y} ${x+bw},${y} ${x+bw+sdx},${y-sdy} ${x+sdx},${y-sdy}`}
        fill="url(#pf-bldg-top)" stroke={borderColor} strokeWidth={1}
      />
      {/* Roof top neon line */}
      <line x1={x+sdx} y1={y-sdy} x2={x+bw+sdx} y2={y-sdy}
        stroke={roofColor} strokeWidth={2.5} opacity={0.8}
        filter={`url(#${glowId})`} className="pf-neon"
      />
      {/* Front face */}
      <rect x={x} y={y} width={bw} height={bh}
        fill="url(#pf-bldg-front)" stroke={borderColor} strokeWidth={borderW}
      />
      {/* Panel dividers */}
      {[1, 2, 3].map((i) => (
        <line key={i}
          x1={x + (bw / 4) * i} y1={y + 4}
          x2={x + (bw / 4) * i} y2={y + bh - 4}
          stroke="#07111e" strokeWidth={0.8} opacity={0.6}
        />
      ))}
      {/* Corner pillars */}
      <rect x={x} y={y} width={pw} height={bh} fill="url(#pf-pillar)" stroke="#263d5a" strokeWidth={0.6} />
      <rect x={x + bw - pw} y={y} width={pw} height={bh} fill="url(#pf-pillar)" stroke="#263d5a" strokeWidth={0.6} />
      {/* Pillar neon edges */}
      <line x1={x + 3} y1={y + 4} x2={x + 3} y2={y + bh - 4}
        stroke={roofColor} strokeWidth={2.5} opacity={0.9} filter={`url(#${glowId})`} />
      <line x1={x + bw - 3} y1={y + 4} x2={x + bw - 3} y2={y + bh - 4}
        stroke={roofColor} strokeWidth={2.5} opacity={0.9} filter={`url(#${glowId})`} />
      {/* Warn glow border overlay */}
      {warn && (
        <rect x={x - 2} y={y - 2} width={bw + 4} height={bh + 4}
          fill="none" stroke="#f59e0b" strokeWidth={3}
          filter="url(#pf-glow-o)" className="pf-warn-pulse"
        />
      )}
      {/* Windows left */}
      <rect x={x + pw + 5} y={y + 12} width={50} height={36} rx={2}
        fill="#020e1a" stroke="#1e4a6e" strokeWidth={1} />
      <rect x={x + pw + 7} y={y + 14} width={46} height={32} rx={1}
        fill="url(#pf-window)" />
      <line x1={x + pw + 30} y1={y + 14} x2={x + pw + 30} y2={y + 46} stroke="#1e4a6e" strokeWidth={0.7} />
      <line x1={x + pw + 7} y1={y + 30} x2={x + pw + 53} y2={y + 30} stroke="#1e4a6e" strokeWidth={0.7} />
      {/* Windows right */}
      <rect x={x + bw - pw - 55} y={y + 12} width={50} height={36} rx={2}
        fill="#020e1a" stroke="#1e4a6e" strokeWidth={1} />
      <rect x={x + bw - pw - 53} y={y + 14} width={46} height={32} rx={1}
        fill="url(#pf-window)" />
      <line x1={x + bw - pw - 30} y1={y + 14} x2={x + bw - pw - 30} y2={y + 46} stroke="#1e4a6e" strokeWidth={0.7} />
      <line x1={x + bw - pw - 53} y1={y + 30} x2={x + bw - pw - 7} y2={y + 30} stroke="#1e4a6e" strokeWidth={0.7} />
      {/* Entrance shutter */}
      <rect x={midX - 24} y={y + bh - 54} width={48} height={54}
        fill="#01080f" stroke={warn ? "#f59e0b" : "#0e7490"} strokeWidth={1.5} />
      {[0,1,2,3,4,5,6,7].map((i) => (
        <line key={i}
          x1={midX - 22} y1={y + bh - 50 + i * 6}
          x2={midX + 22} y2={y + bh - 50 + i * 6}
          stroke="#142233" strokeWidth={1}
        />
      ))}
      <rect x={midX - 25} y={y + bh - 55} width={50} height={56}
        fill="none" stroke={roofColor} strokeWidth={0.8}
        filter={`url(#${glowId})`} opacity={0.5}
      />
      {/* Status LEDs top corners */}
      <circle cx={x + 22} cy={y + 8} r={4} className={warn ? "pf-led-y" : "pf-led-c"} filter={`url(#${glowId})`} />
      <circle cx={x + bw - 22} cy={y + 8} r={4} className={warn ? "pf-led-y" : "pf-led-c"} filter={`url(#${glowId})`} />
      {/* Mid accent band */}
      <rect x={x} y={y + bh * 0.54} width={bw} height={3} fill="#081828" opacity={0.9} />
      <line x1={x} y1={y + bh * 0.54 + 1.5} x2={x + bw} y2={y + bh * 0.54 + 1.5}
        stroke={roofColor} strokeWidth={0.6} opacity={0.22}
      />
    </g>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Process label (large text above building) — bright background colours
// ─────────────────────────────────────────────────────────────────────────────
function ProcessLabel({
  cx, cy, num, name, warn,
}: {
  cx: number; cy: number; num: string; name: string; warn: boolean
}) {
  const bh = BH
  const sdy = ISO_DY
  const labelY = cy - bh / 2 - sdy - 46  // well above building
  const numColor = warn ? "#d97706" : "#0088aa"
  const nameColor = warn ? "#92400e" : "#0f2d45"
  const numGlow = warn ? "pf-glow-o" : "pf-glow-c"

  return (
    <g className="pf-float">
      {/* Number */}
      <text
        x={cx - BW / 2} y={labelY}
        fill={numColor} fontSize={28} fontWeight={900}
        letterSpacing="1px" fontFamily="'Orbitron', 'Roboto Mono', monospace"
        style={{ filter: warn ? "drop-shadow(0 1px 3px rgba(217,119,6,0.5))" : "none" }}
      >
        {num}
      </text>
      {/* Name */}
      <text
        x={cx - BW / 2 + 42} y={labelY}
        fill={nameColor} fontSize={22} fontWeight={700}
        letterSpacing="0.5px"
      >
        {name}
      </text>
      {/* Warn icon */}
      {warn && (
        <g transform={`translate(${cx + BW / 2 + 8},${labelY - 14})`}>
          <circle cx={0} cy={0} r={12} fill="#f59e0b" filter="url(#pf-glow-o)" className="pf-warn-pulse" />
          <text x={0} y={5} textAnchor="middle" fill="#000" fontSize={14} fontWeight={900}>!</text>
        </g>
      )}
      {/* Thin underline */}
      <line
        x1={cx - BW / 2} y1={labelY + 5}
        x2={cx + BW / 2} y2={labelY + 5}
        stroke={numColor} strokeWidth={1} opacity={0.35}
      />
    </g>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Process-specific interior details
// ─────────────────────────────────────────────────────────────────────────────
function ProcessInterior({ name, x, y, bw, bh }: { name: string; x: number; y: number; bw: number; bh: number }) {
  const midX = x + bw / 2
  switch (name) {
    // ── 01 프레스
    case "프레스":
      return (
        <g>
          <rect x={midX - 46} y={y + 56} width={92} height={78} rx={2}
            fill="#0a1420" stroke="#374151" strokeWidth={1.5} />
          <rect x={midX - 44} y={y + 56} width={88} height={16} fill="#2d3748" stroke="#4b5563" strokeWidth={1} />
          <rect x={midX - 36} y={y + 58} width={72} height={6} fill="#374151" />
          <rect x={midX - 22} y={y + 72} width={44} height={38}
            fill="#1f2937" stroke="#4b5563" strokeWidth={1.2} />
          <rect x={midX - 18} y={y + 74} width={36} height={8} fill="#374151" />
          <rect x={midX - 44} y={y + 116} width={88} height={16}
            fill="#1f2937" stroke="#374151" strokeWidth={1.2} />
          {[0,1,2,3,4,5].map((i) => (
            <rect key={i}
              x={midX - 44 + i * 14.5} y={y + 116}
              width={7} height={16} fill="#eab308" opacity={0.85}
            />
          ))}
          <rect x={x + 18} y={y + 66} width={10} height={55} fill="#1a2a3c" stroke="#374151" strokeWidth={1} rx={2} />
          <rect x={x + bw - 28} y={y + 66} width={10} height={55} fill="#1a2a3c" stroke="#374151" strokeWidth={1} rx={2} />
          <circle cx={x + 23} cy={y + 62} r={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.2} />
          <line x1={x + 23} y1={y + 62} x2={x + 27} y2={y + 56} stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" />
          <circle cx={x + bw - 23} cy={y + 62} r={8} fill="#1f2937" stroke="#4b5563" strokeWidth={1.2} />
          <line x1={x + bw - 23} y1={y + 62} x2={x + bw - 19} y2={y + 56} stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" />
          <rect x={x + 40} y={y - ISO_DY - 26} width={12} height={26} fill="#232f3e" stroke="#374151" strokeWidth={1} rx={2} />
          <rect x={x + bw - 52} y={y - ISO_DY - 22} width={12} height={22} fill="#232f3e" stroke="#374151" strokeWidth={1} rx={2} />
          <ellipse cx={x + 46} cy={y - ISO_DY - 32} rx={7} ry={4} fill="#2d3748" opacity={0.4} />
          <ellipse cx={x + bw - 46} cy={y - ISO_DY - 28} rx={6} ry={3.5} fill="#2d3748" opacity={0.35} />
        </g>
      )

    // ── 02 차체
    case "차체":
      return (
        <g>
          <path
            d={`M ${x+35} ${y+100} L ${x+46} ${y+74} L ${x+70} ${y+62} L ${x+bw-70} ${y+62} L ${x+bw-46} ${y+74} L ${x+bw-35} ${y+100} Z`}
            fill="none" stroke="#374151" strokeWidth={1.8} strokeLinejoin="round"
          />
          <path
            d={`M ${x+54} ${y+74} L ${x+68} ${y+54} L ${x+bw-68} ${y+54} L ${x+bw-54} ${y+74}`}
            fill="#0c1a28" stroke="#263d52" strokeWidth={1.2}
          />
          <polygon points={`${x+70},${y+62} ${x+82},${y+48} ${x+100},${y+46} ${x+100},${y+62}`}
            fill="url(#pf-glass)" opacity={0.7} />
          <circle cx={x + 52} cy={y + 104} r={13} fill="#0d1520" stroke="#374151" strokeWidth={1.8} />
          <circle cx={x + 52} cy={y + 104} r={5} fill="#1a2a3a" stroke="#4b5563" strokeWidth={1.2} />
          <circle cx={x + bw - 52} cy={y + 104} r={13} fill="#0d1520" stroke="#374151" strokeWidth={1.8} />
          <circle cx={x + bw - 52} cy={y + 104} r={5} fill="#1a2a3a" stroke="#4b5563" strokeWidth={1.2} />
          <path d={`M ${x+18} ${y+140} L ${x+28} ${y+118} L ${x+50} ${y+104}`}
            fill="none" stroke="#22d3ee" strokeWidth={4.5}
            strokeLinecap="round" strokeLinejoin="round" filter="url(#pf-glow-c)"
          />
          <circle cx={x+18} cy={y+140} r={5.5} fill="#1a2a3c" stroke="#4b5563" strokeWidth={1.2} />
          <circle cx={x+50} cy={y+104} r={4} fill="#22d3ee" opacity={0.8} filter="url(#pf-glow-c)" />
          <line x1={x+50} y1={y+104} x2={x+56} y2={y+98} stroke="#fcd34d" strokeWidth={1.5} />
          <line x1={x+50} y1={y+104} x2={x+44} y2={y+97} stroke="#fcd34d" strokeWidth={1.5} />
          <path d={`M ${x+bw-18} ${y+140} L ${x+bw-28} ${y+118} L ${x+bw-50} ${y+104}`}
            fill="none" stroke="#22d3ee" strokeWidth={4.5}
            strokeLinecap="round" strokeLinejoin="round" filter="url(#pf-glow-c)"
          />
          <circle cx={x+bw-18} cy={y+140} r={5.5} fill="#1a2a3c" stroke="#4b5563" strokeWidth={1.2} />
          <circle cx={x+bw-50} cy={y+104} r={4} fill="#22d3ee" opacity={0.8} filter="url(#pf-glow-c)" />
          <rect x={midX - 6} y={y - ISO_DY - 20} width={12} height={20} fill="#1f2937" stroke="#374151" strokeWidth={1} />
          <circle cx={midX} cy={y - ISO_DY - 25} r={9} fill="#1f2937" stroke="#374151" strokeWidth={1} />
          <circle cx={midX} cy={y - ISO_DY - 25} r={5} className="pf-led-y" filter="url(#pf-glow-y)" />
        </g>
      )

    // ── 03 도장
    case "도장":
      return (
        <g>
          <rect x={midX - 36} y={y - ISO_DY - 32} width={72} height={32}
            fill="#162230" stroke="#2a4060" strokeWidth={1.5} rx={2} />
          {[0,1,2,3,4].map((i) => (
            <line key={i}
              x1={midX - 32} y1={y - ISO_DY - 28 + i * 6}
              x2={midX + 32} y2={y - ISO_DY - 28 + i * 6}
              stroke="#374151" strokeWidth={0.8}
            />
          ))}
          <rect x={x + 18} y={y - ISO_DY - 20} width={20} height={20} fill="#1a2a3c" stroke="#374151" strokeWidth={1} rx={1} />
          <circle cx={x + 28} cy={y - ISO_DY - 10} r={7} fill="#0d1824" stroke="#4b5563" strokeWidth={1} />
          <circle cx={x + 28} cy={y - ISO_DY - 10} r={3} fill="#162230" />
          <rect x={x + bw - 38} y={y - ISO_DY - 20} width={20} height={20} fill="#1a2a3c" stroke="#374151" strokeWidth={1} rx={1} />
          <circle cx={x + bw - 28} cy={y - ISO_DY - 10} r={7} fill="#0d1824" stroke="#4b5563" strokeWidth={1} />
          <circle cx={x + bw - 28} cy={y - ISO_DY - 10} r={3} fill="#162230" />
          <rect x={x + 22} y={y + 18} width={bw - 44} height={bh - 70}
            fill="#0891b2" fillOpacity={0.04} stroke="#0e7490" strokeWidth={1.5} rx={3}
            filter="url(#pf-glow-c)"
          />
          <path d={`M ${x+22} ${y+28} Q ${midX} ${y+6} ${x+bw-22} ${y+28}`}
            fill="none" stroke="#4a6280" strokeWidth={2}
          />
          {[0,1,2].map((i) => (
            <g key={i}>
              <rect x={x + 24} y={y + 36 + i * 26} width={6} height={12} fill="#3d5060" rx={1} />
              <path d={`M ${x+30} ${y+42 + i*26} L ${x+44} ${y+46 + i*26} L ${x+30} ${y+50 + i*26}`}
                fill="#0e7490" fillOpacity={0.5} />
            </g>
          ))}
          {[0,1,2].map((i) => (
            <g key={i}>
              <rect x={x + bw - 30} y={y + 36 + i * 26} width={6} height={12} fill="#3d5060" rx={1} />
              <path d={`M ${x+bw-30} ${y+42 + i*26} L ${x+bw-44} ${y+46 + i*26} L ${x+bw-30} ${y+50 + i*26}`}
                fill="#0e7490" fillOpacity={0.5} />
            </g>
          ))}
          <rect x={midX - 26} y={y + 112} width={52} height={20} fill="#010a12" rx={3} stroke="#0891b2" strokeWidth={1} />
          <text x={midX} y={y + 126} textAnchor="middle" fill="#22d3ee"
            fontSize={9} fontWeight={900} letterSpacing="0.8px">BOOTH</text>
          {[0,1,2].map((i) => (
            <line key={i}
              x1={x + 22 + i * ((bw-44)/3)} y1={y + bh - 20}
              x2={x + 22 + (i+1) * ((bw-44)/3)} y2={y + bh - 20}
              stroke="#0e3a4a" strokeWidth={2}
            />
          ))}
        </g>
      )

    // ── 04 의장
    case "의장":
      return (
        <g>
          <rect x={x + 14} y={y - ISO_DY - 12} width={bw - 28} height={8}
            fill="#1a2c3e" stroke="#2a4060" strokeWidth={1} rx={1} />
          <rect x={midX - 14} y={y - ISO_DY - 12} width={28} height={14}
            fill="#2d3e52" stroke="#3d5060" strokeWidth={1} rx={1} />
          <rect x={midX - 3} y={y - ISO_DY + 2} width={6} height={10} fill="#4b6070" />
          <rect x={midX - 8} y={y - ISO_DY + 11} width={16} height={4} fill="#1e3a52" />
          <rect x={x + 18} y={y + 86} width={bw - 36} height={14}
            fill="#060e1c" rx={2} stroke="#1e3050" strokeWidth={1} />
          <line x1={x+18} y1={y+93} x2={x+bw-18} y2={y+93}
            stroke="#1e3454" strokeWidth={10} strokeDasharray="7 5" opacity={0.7} />
          <path d={`M ${x+22} ${y+80} L ${x+34} ${y+60} L ${x+54} ${y+50}`}
            fill="none" stroke="#4a6078" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"
          />
          <circle cx={x+22} cy={y+80} r={5.5} fill="#1a2a3c" stroke="#3d5060" strokeWidth={1.2} />
          <circle cx={x+54} cy={y+50} r={3.5} fill="#22c55e" className="pf-led-g" filter="url(#pf-glow-g)" />
          <path d={`M ${x+bw-22} ${y+80} L ${x+bw-34} ${y+60} L ${x+bw-54} ${y+50}`}
            fill="none" stroke="#4a6078" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"
          />
          <circle cx={x+bw-22} cy={y+80} r={5.5} fill="#1a2a3c" stroke="#3d5060" strokeWidth={1.2} />
          <circle cx={x+bw-54} cy={y+50} r={3.5} fill="#22c55e" className="pf-led-g" filter="url(#pf-glow-g)" />
          <rect x={midX - 30} y={y + 18} width={60} height={42}
            fill="#010812" rx={3} stroke="#1a3452" strokeWidth={1.5} />
          <rect x={midX - 26} y={y + 22} width={52} height={20}
            fill="#000d1c" rx={1} stroke="#0e7490" strokeWidth={0.8} />
          <path d={`M ${midX-22} ${y+32} L ${midX-14} ${y+26} L ${midX-6} ${y+34} L ${midX+2} ${y+28} L ${midX+10} ${y+34} L ${midX+18} ${y+26} L ${midX+22} ${y+32}`}
            fill="none" stroke="#22c55e" strokeWidth={1.2} opacity={0.8}
          />
          <circle cx={midX - 16} cy={y + 52} r={3} className="pf-led-c" filter="url(#pf-glow-c)" />
          <circle cx={midX - 6} cy={y + 52} r={3} className="pf-led-g" />
          <circle cx={midX + 4} cy={y + 52} r={3} className="pf-led-y" />
          <circle cx={midX + 14} cy={y + 52} r={3} fill="#ef4444" />
          <rect x={x+16} y={y+106} width={20} height={50} fill="#0d1828" stroke="#374151" strokeWidth={1} rx={1} />
          {[0,1,2].map((i) => (
            <rect key={i} x={x+17} y={y+110 + i*15} width={18} height={10} fill="#1f2937" stroke="#374151" strokeWidth={0.5} />
          ))}
          <rect x={x+bw-36} y={y+106} width={20} height={50} fill="#0d1828" stroke="#374151" strokeWidth={1} rx={1} />
          {[0,1,2].map((i) => (
            <rect key={i} x={x+bw-35} y={y+110 + i*15} width={18} height={10} fill="#1f2937" stroke="#374151" strokeWidth={0.5} />
          ))}
        </g>
      )

    // ── 05 최종검사
    case "최종검사":
      return (
        <g>
          <rect x={x + 20} y={y - ISO_DY - 14} width={20} height={14} fill="#1f2937" stroke="#374151" strokeWidth={1} rx={2} />
          <circle cx={x + 30} cy={y - ISO_DY - 7} r={4.5} fill="#0d1824" stroke="#4b5563" strokeWidth={1} />
          <circle cx={x + 30} cy={y - ISO_DY - 7} r={2} fill="#020a14" />
          <rect x={x + bw - 40} y={y - ISO_DY - 14} width={20} height={14} fill="#1f2937" stroke="#374151" strokeWidth={1} rx={2} />
          <circle cx={x + bw - 30} cy={y - ISO_DY - 7} r={4.5} fill="#0d1824" stroke="#4b5563" strokeWidth={1} />
          <circle cx={x + bw - 30} cy={y - ISO_DY - 7} r={2} fill="#020a14" />
          <rect x={midX - 5} y={y - ISO_DY - 22} width={10} height={22} fill="#1f2937" stroke="#374151" strokeWidth={1} />
          <circle cx={midX} cy={y - ISO_DY - 28} r={10} fill="#1f2937" stroke="#374151" strokeWidth={1.2} />
          <circle cx={midX} cy={y - ISO_DY - 28} r={6} className="pf-led-g" filter="url(#pf-glow-g)" />
          <rect x={x + 36} y={y + 16} width={8} height={bh - 48} fill="#142a44" stroke="#0e7490" strokeWidth={1} />
          <rect x={x + bw - 44} y={y + 16} width={8} height={bh - 48} fill="#142a44" stroke="#0e7490" strokeWidth={1} />
          <rect x={x + 36} y={y + 16} width={bw - 72} height={8} fill="#142a44" stroke="#0e7490" strokeWidth={1} />
          <line x1={x+40} y1={y+24} x2={x+40} y2={y+bh-32} stroke="#22c55e" strokeWidth={1.2} opacity={0.8} className="pf-neon" />
          <line x1={x+bw-40} y1={y+24} x2={x+bw-40} y2={y+bh-32} stroke="#22c55e" strokeWidth={1.2} opacity={0.8} className="pf-neon" />
          <line x1={x+44} y1={y+50}  x2={x+bw-44} y2={y+50}  stroke="#22c55e" strokeWidth={1.6} filter="url(#pf-glow-g)" opacity={0.85} className="pf-neon" />
          <line x1={x+44} y1={y+90}  x2={x+bw-44} y2={y+90}  stroke="#22c55e" strokeWidth={1.6} filter="url(#pf-glow-g)" opacity={0.85} className="pf-neon" style={{ animationDelay: "0.4s" }} />
          <line x1={x+44} y1={y+130} x2={x+bw-44} y2={y+130} stroke="#22c55e" strokeWidth={1.6} filter="url(#pf-glow-g)" opacity={0.85} className="pf-neon" style={{ animationDelay: "0.8s" }} />
          <rect x={midX - 22} y={y + 24} width={44} height={42} fill="#00080a" rx={2} stroke="#1a4028" strokeWidth={1} />
          {[0,1,2,3,4,5].map((i) => (
            <rect key={i} x={midX - 18 + i * 7} y={y + 27} width={i % 2 === 0 ? 4 : 2} height={36}
              fill="#22c55e" opacity={0.7}
            />
          ))}
          <rect x={midX - 30} y={y + bh - 56} width={60} height={24}
            fill="#00080a" rx={3} stroke="#22c55e" strokeWidth={1.5} />
          <text x={midX} y={y + bh - 38} textAnchor="middle"
            fill="#22c55e" fontSize={13} fontWeight={900} letterSpacing="2px"
            filter="url(#pf-glow-g)" className="pf-led-g">
            PASS
          </text>
          <circle cx={x+42} cy={y+20} r={3.5} className="pf-led-g" filter="url(#pf-glow-g)" />
          <circle cx={x+bw-42} cy={y+20} r={3.5} className="pf-led-g" filter="url(#pf-glow-g)" />
        </g>
      )

    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Complete factory station
// ─────────────────────────────────────────────────────────────────────────────
function FactoryStation({
  cx, cy, name, num, warn,
}: {
  cx: number; cy: number; name: string; num: string; warn: boolean
}) {
  const bldgOffset = 22 // Move building down by 22px
  const x = cx - BW / 2
  const y = cy - BH / 2 + bldgOffset
  const bh = BH
  const bw = BW

  return (
    <g>
      <Platform cx={cx + ISO_DX / 2} cy={cy + bh / 2} w={bw} h={bh} warn={warn} />
      <BuildingShell x={x} y={y} bw={bw} bh={bh} warn={warn} />
      <ProcessInterior name={name} x={x} y={y} bw={bw} bh={bh} />
      <ProcessLabel cx={cx} cy={cy + bldgOffset} num={num} name={name} warn={warn} />
    </g>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  AGV path segment (forward + return lanes)
// ─────────────────────────────────────────────────────────────────────────────
function RouteSegment({
  pts, laneOffset, isCenterLane = false, laneIndex = 0
}: {
  pts: { x: number; y: number }[]; laneOffset: number; isCenterLane?: boolean; laneIndex?: number
}) {
  const line = offsetPolyline(pts, laneOffset)
  const isCyan = laneIndex % 2 === 0
  const color = isCyan ? "#22d3ee" : "#a855f7"
  const glow = isCyan ? "pf-glow-c" : "pf-glow-p"
  const animClass = isCyan ? "pf-track-fwd" : "pf-track-bwd"

  return (
    <g>
      {/* Base solid line for clear visibility on bright background */}
      <polyline points={ptsToStr(line)} fill="none" stroke="#264b66" strokeWidth={2.5} opacity={0.9} strokeLinecap="round" />
      {/* Neon dashed line on top, same width so no "border" effect */}
      <polyline points={ptsToStr(line)} fill="none" stroke={color} strokeWidth={2.5}
        strokeDasharray="14 18" className={animClass} filter={`url(#${glow})`} opacity={0.85} strokeLinecap="round"
      />
      {/* Direction arrow (drawn only once in the exact center of the lane bundle) */}
      {isCenterLane && (() => {
        const midT = 0.55
        const aPos = lerp2(pts, midT, 0)
        const aDir = lerp2(pts, midT + 0.06, 0)
        const aDx = aDir.x - aPos.x
        const aDy = aDir.y - aPos.y
        const aLen = Math.sqrt(aDx * aDx + aDy * aDy) || 1
        const ax = (aDx / aLen) * 14
        const ay = (aDy / aLen) * 14
        const px = (-aDy / aLen) * 6
        const py = (aDx / aLen) * 6
        return (
          <polygon
            points={`${aPos.x - px},${aPos.y - py} ${aPos.x + px},${aPos.y + py} ${aPos.x + ax},${aPos.y + ay}`}
            fill="#22d3ee" opacity={0.9} filter="url(#pf-glow-c)"
          />
        )
      })()}
    </g>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
export function ProcessFlow() {
  const agvs = useAgvWebsocket()

  const movingCount   = useMemo(() => agvs.filter((a) => a.status === "MOVING").length,    [agvs])
  const returningCount= useMemo(() => agvs.filter((a) => a.status === "RETURNING").length, [agvs])
  const unloadingCount= useMemo(() => agvs.filter((a) => a.status === "UNLOADING").length, [agvs])
  const waitingCount  = useMemo(() => agvs.filter((a) => a.status === "WAITING").length,   [agvs])
  const safeTotal = agvs.length === 0 ? 1 : agvs.length

  const activeRouteIndices = useMemo(
    () => new Set(agvs.filter((a) => a.status === "MOVING" || a.status === "UNLOADING").map((a) => a.routeIndex)),
    [agvs]
  )
  const warnStation = useMemo(() => {
    const s = new Set<number>()
    activeRouteIndices.forEach((ri) => s.add(ri + 1))
    return s
  }, [activeRouteIndices])

  // AGV position calculation (unchanged logic)
  const getAgvPosition = (agv: ProcessFlowAgv) => {
    const route = ROUTES[agv.routeIndex]
    if (!route) return { x: 0, y: 0, angle: 0 }
    const laneOffset = ((agv.laneIndex - (LANE_COUNT - 1) / 2) * LANE_SPREAD) / LANE_COUNT
    return lerp2(route.pts, agv.progress, laneOffset)
  }

  return (
    <div className="bg-[#060d1e]/90 backdrop-blur-md rounded-xl border border-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.06)] p-5">

      {/* ── Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <h2 className="text-sm font-semibold tracking-wider text-cyan-100 uppercase">
            AGV 실시간 물류 흐름 관제 Dashboard
          </h2>
        </div>
        <div className="flex gap-5 text-xs font-bold text-slate-300">
          {[
            { label: "운반", color: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.7)]" },
            { label: "복귀", color: "bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.7)]" },
            { label: "대기", color: "bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.7)] animate-pulse" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">

        {/* ── SVG Canvas */}
        <div
          className="flex-1 rounded-xl border border-sky-200/60 overflow-hidden relative"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.55) 0%, transparent 55%), " +
              "linear-gradient(135deg, #dff8ff 0%, #b9eaf4 50%, #8ecfe0 100%)",
          }}
        >
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full select-none"
            style={{ height: "auto", minHeight: 400 }}
          >
            <SvgDefs />
            <style>{SVG_CSS}</style>

            {/* Grid overlay on bright background */}
            <rect width="100%" height="100%" fill="url(#pf-grid)" />

            {/* ── Routes (draw under buildings) */}
            {ROUTES.map((route, ri) =>
              Array.from({ length: LANE_COUNT }, (_, li) => {
                const laneOffset = ((li - (LANE_COUNT - 1) / 2) * LANE_SPREAD) / LANE_COUNT
                return (
                  <RouteSegment key={`${ri}-${li}`} pts={route.pts} laneOffset={laneOffset} isCenterLane={li === Math.floor(LANE_COUNT / 2)} laneIndex={li} />
                )
              })
            )}

            {/* ── Corner connector dot (차체→도장 bend point) */}
            {(() => {
              const bendPt = ROUTES[1].pts[1]
              return (
                <g>
                  <circle cx={bendPt.x} cy={bendPt.y} r={8} fill="#000" opacity={0.5} />
                  <circle cx={bendPt.x} cy={bendPt.y} r={5} fill="#22d3ee" opacity={0.4} filter="url(#pf-glow-c)" />
                </g>
              )
            })()}

            {/* ── Factory stations */}
            {STATIONS.map((s) => (
              <FactoryStation
                key={s.id}
                cx={s.cx} cy={s.cy}
                name={s.name} num={s.num}
                warn={warnStation.has(s.id)}
              />
            ))}

            {/* ── AGV Robots */}
            {agvs.map((agv) => {
              const pos = getAgvPosition(agv)
              const color = getStatusColor(agv.status)
              const label = getStatusLabel(agv.status)
              const filterId = agv.status === "MOVING" ? "pf-glow-c"
                : agv.status === "RETURNING" ? "pf-glow-p"
                  : agv.status === "UNLOADING" ? "pf-glow-g"
                    : "pf-glow-y"
              const isReturning = agv.status === "RETURNING"
              const rotateAngle = pos.angle + (isReturning ? 180 : 0)

              return (
                <g key={agv.id} transform={`translate(${pos.x},${pos.y})`}>
                  {/* Motion aura */}
                  {agv.status !== "WAITING" && (
                    <ellipse cx="0" cy="2" rx="30" ry="10"
                      fill="none" stroke={color} strokeWidth={1.8} opacity={0.25}
                      filter={`url(#${filterId})`}
                    >
                      <animate attributeName="rx" values="30;42;30" dur="1.4s" repeatCount="indefinite" />
                      <animate attributeName="ry" values="10;16;10" dur="1.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.38;0.04;0.38" dur="1.4s" repeatCount="indefinite" />
                    </ellipse>
                  )}
                  <g transform={`rotate(${rotateAngle})`}>
                    {/* Wheels */}
                    <rect x="-23" y="-22" width="12" height="6" rx="2" fill="#04060c" stroke="#475569" strokeWidth="0.8" />
                    <rect x="11" y="-22" width="12" height="6" rx="2" fill="#04060c" stroke="#475569" strokeWidth="0.8" />
                    <rect x="-23" y="16" width="12" height="6" rx="2" fill="#04060c" stroke="#475569" strokeWidth="0.8" />
                    <rect x="11" y="16" width="12" height="6" rx="2" fill="#04060c" stroke="#475569" strokeWidth="0.8" />
                    {/* Body */}
                    <rect x="-25" y="-16" width="50" height="32" rx="5"
                      fill="url(#pf-agv-body)" stroke="#4f5e75" strokeWidth={1.8} />
                    {/* Status strips */}
                    <line x1="-20" y1="-12" x2="20" y2="-12" stroke={color} strokeWidth={2} opacity={0.95} filter={`url(#${filterId})`} />
                    <line x1="-20" y1="12" x2="20" y2="12" stroke={color} strokeWidth={2} opacity={0.95} filter={`url(#${filterId})`} />
                    {/* Front sensor */}
                    <path d="M 25 -9 Q 32 0 25 9" fill="none" stroke={color} strokeWidth={2} filter={`url(#${filterId})`} opacity={0.9} />
                    <circle cx="24" cy="0" r="2.5" fill={color} filter={`url(#${filterId})`} />
                    {/* Payload */}
                    {agv.status === "MOVING" ? (
                      <g transform="translate(0,-3)">
                        <polygon points="-13,-15 8,-15 14,-8 -7,-8" fill="url(#pf-cargo-top)" stroke="#22d3ee" strokeWidth={0.7} />
                        <polygon points="-7,-8 14,-8 14,3 -7,3" fill="url(#pf-cargo-front)" stroke="#0891b2" strokeWidth={0.7} />
                        <polygon points="-13,-15 -7,-8 -7,3 -13,-4" fill="url(#pf-cargo-side)" stroke="#0e7490" strokeWidth={0.7} />
                      </g>
                    ) : (
                      <g>
                        <rect x="-12" y="-7" width="24" height="14" fill="#010408" rx="2" stroke="#334155" strokeWidth={0.7} />
                        {isReturning && <circle cx="0" cy="0" r="3.5" className="pf-led-p" filter="url(#pf-glow-p)" />}
                        {agv.status === "WAITING" && <circle cx="0" cy="0" r="3.5" className="pf-led-y" filter="url(#pf-glow-y)" />}
                      </g>
                    )}
                  </g>
                  {/* ID label */}
                  <g transform="translate(0,-32)">
                    <rect x="-27" y="-6" width="54" height="13" rx="3"
                      fill="#010409" stroke={color} strokeWidth={1} opacity={0.95} />
                    <text x="0" y="5" textAnchor="middle" fill="#f8fafc" fontSize="8.5" fontWeight="900" letterSpacing="0.4px">
                      {agv.id}
                    </text>
                  </g>
                  {/* Status label */}
                  <g transform="translate(0,31)">
                    <rect x="-18" y="-5" width="36" height="12" rx="5"
                      fill="#08101e" stroke={color} strokeWidth={1} opacity={0.95} />
                    <text x="0" y="5" textAnchor="middle" fill={color} fontSize="8" fontWeight="900">
                      {label}
                    </text>
                  </g>
                </g>
              )
            })}
          </svg>
        </div>

        {/* ── Side Panel */}
        <div className="w-full lg:w-[200px] shrink-0 rounded-xl border border-cyan-500/10 bg-slate-900/60 backdrop-blur-md p-4 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 pb-2 border-b border-slate-800">
              <Truck className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span className="text-sm font-bold text-cyan-100 tracking-wider">AGV 관제 현황</span>
            </div>
            <div className="space-y-4">
              {[
                { label: "운반중", count: movingCount,    cls: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]",    textCls: "text-cyan-400" },
                { label: "하역중", count: unloadingCount, cls: "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]",  textCls: "text-green-400" },
                { label: "복귀중", count: returningCount, cls: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]", textCls: "text-purple-400" },
                { label: "대기중", count: waitingCount,   cls: "bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-pulse", textCls: "text-yellow-400" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={`${item.textCls} flex items-center gap-1.5`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${item.cls}`} />
                      {item.label}
                    </span>
                    <span className="text-slate-100">{item.count}대</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.cls} transition-all duration-500`}
                      style={{ width: `${(item.count / safeTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-3 border-t border-slate-800 text-[10px] text-slate-400 space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span>AGV 수량:</span><span className="text-slate-200">총 {agvs.length}대</span>
            </div>
            <div className="flex justify-between">
              <span>관제 경로:</span><span className="text-slate-200">Route 4개</span>
            </div>
            <div className="flex justify-between">
              <span>운행 라인:</span><span className="text-slate-200">Route당 Lane 5개</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}