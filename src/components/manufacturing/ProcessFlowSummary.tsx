import type { ComponentType } from "react"

type ProcessStage = {
  id: string
  name: string
  rate: number | null
  rateLabel?: string
  events?: number
  status: string
  defectRate?: number
  targetProcess?: string
  isBottleneck?: boolean
  bottleneckRiskLevel?: string | null
}

type ProcessFlowSummaryProps = {
  stages: ProcessStage[]
  stageCount: number
  StageIcon: ComponentType<{ type: string }>
}

function getStatusMeta(stage: ProcessStage): {
  dotColor: string
  dotGlow: string
  badgeText: string
  badgeClass: string
  rateClass: string
  borderClass: string
  headerAccent: string
} {
  if (stage.isBottleneck) {
    return {
      dotColor: "bg-red-500",
      dotGlow: "shadow-[0_0_6px_rgba(239,68,68,0.9)]",
      badgeText: "BOTTLENECK",
      badgeClass: "bg-red-500/20 text-red-400 border border-red-500/40",
      rateClass: "text-red-400",
      // 빨간색 border + 레드 glow shadow 강조
      borderClass: "border-red-500/75 shadow-[0_0_0_1px_rgba(255,77,79,0.18),0_0_20px_rgba(255,77,79,0.14)]",
      headerAccent: "from-red-500/10 to-transparent",
    }
  }
  if (stage.status === "analysis") {
    return {
      dotColor: "bg-violet-400",
      dotGlow: "shadow-[0_0_6px_rgba(167,139,250,0.8)]",
      badgeText: "ANALYSIS",
      badgeClass: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
      rateClass: "text-violet-300",
      borderClass: "border-violet-500/20",
      headerAccent: "from-violet-500/8 to-transparent",
    }
  }
  if (stage.status === "danger") {
    return {
      dotColor: "bg-orange-400",
      dotGlow: "shadow-[0_0_6px_rgba(251,146,60,0.8)] animate-pulse",
      badgeText: "WARNING",
      badgeClass: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
      rateClass: "text-orange-400",
      borderClass: "border-orange-500/20",
      headerAccent: "from-orange-500/8 to-transparent",
    }
  }
  if (stage.status === "warning") {
    return {
      dotColor: "bg-yellow-400",
      dotGlow: "shadow-[0_0_6px_rgba(234,179,8,0.7)]",
      badgeText: "CAUTION",
      badgeClass: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
      rateClass: "text-yellow-300",
      borderClass: "border-yellow-500/20",
      headerAccent: "from-yellow-500/8 to-transparent",
    }
  }
  return {
    dotColor: "bg-emerald-400",
    dotGlow: "shadow-[0_0_6px_rgba(52,211,153,0.7)]",
    badgeText: "NORMAL",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
    rateClass: "text-emerald-400",
    borderClass: "border-slate-700/60",
    headerAccent: "from-emerald-500/6 to-transparent",
  }
}

export function ProcessFlowSummary({ stages, stageCount, StageIcon }: ProcessFlowSummaryProps) {
  return (
    <div className="mb-6 w-full">
      {/* 전체 wrapper: 최대 너비 확장 + 중앙 정렬 */}
      <div className="w-full max-w-[1480px] mx-auto">
        {/*
          items-end: 라벨이 있는 병목 카드와 없는 일반 카드 모두
          카드 하단이 맞춰지도록 정렬
        */}
        <div className="flex items-end justify-between gap-3 overflow-x-auto pb-1 min-w-0">
          {stages.map((stage, index) => {
            const meta = getStatusMeta(stage)
            const isLast = index >= stageCount - 1

            return (
              <div key={stage.id} className="flex items-end flex-1 min-w-0">
                {/*
                  카드 컬럼: flex-col로 [라벨 영역 → 카드] 순서로 쌓음.
                  라벨 영역은 항상 h-7(28px)로 고정해 모든 카드 상단이 맞춰짐.
                  병목 카드: 라벨 텍스트 표시 / 일반 카드: 빈 공간 유지
                */}
                <div className="flex flex-col flex-1 min-w-[180px] max-w-[240px]">

                  {/* ── 병목 상단 라벨 영역 (노멀 플로우, 항상 h-7 확보) ── */}
                  <div className="h-7 flex items-center justify-center mb-1.5">
                    {stage.isBottleneck && (
                      <div className="flex items-center gap-1.5 rounded-full bg-red-500/95 border border-red-400/50 px-3 py-[3px] shadow-[0_2px_14px_rgba(239,68,68,0.45)] whitespace-nowrap">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
                        <span className="text-[10px] font-bold tracking-wider text-white leading-none">
                          최대 병목 구간
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Process Card ── */}
                  <div
                    className={`
                      group relative flex flex-col
                      w-full min-h-[168px]
                      rounded-xl border ${meta.borderClass}
                      bg-[#0b1525]/90 backdrop-blur-sm
                      transition-all duration-200
                      hover:shadow-[0_0_18px_rgba(6,182,212,0.07)]
                      hover:-translate-y-0.5
                      overflow-hidden
                    `}
                  >
                    {/* Top accent gradient */}
                    <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${meta.headerAccent} pointer-events-none`} />

                    {/* Corner grid decoration */}
                    <div className="absolute top-2 right-2 opacity-10 pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M0 0 L16 0 L16 16" stroke="currentColor" strokeWidth="0.8" className="text-cyan-400" />
                        <path d="M4 0 L4 4 L0 4" stroke="currentColor" strokeWidth="0.6" className="text-cyan-400" />
                      </svg>
                    </div>

                    {/* ── Header section ── */}
                    {/* pt-4: 배지가 카드 바깥에 있으므로 일반 패딩 유지 */}
                    <div className="flex items-start gap-2 px-3.5 pt-4 pb-2">
                      {/* Step number */}
                      <div className="flex-shrink-0">
                        <span className="text-[11px] font-black tracking-widest text-cyan-500/70 font-mono">{stage.id}</span>
                      </div>

                      {/* Icon + Name */}
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className={`flex-shrink-0 ${meta.rateClass}`}>
                          <StageIcon type={stage.name} />
                        </div>
                        <span className="text-[13px] font-bold text-slate-100 tracking-wide leading-tight truncate">
                          {stage.name}
                        </span>
                      </div>

                      {/* Status badge */}
                      <div className={`flex-shrink-0 flex items-center gap-1 rounded-md px-1.5 py-0.5 ${meta.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotColor} ${meta.dotGlow}`} />
                        <span className="text-[9px] font-bold tracking-widest">{meta.badgeText}</span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-3.5 h-px bg-slate-700/50" />

                    {/* ── Body section ── */}
                    <div className="flex-1 px-3.5 py-2.5 flex flex-col gap-2">
                      {stage.status !== "analysis" ? (
                        <>
                          {/* Utilization rate */}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[10px] font-medium text-slate-500 tracking-wide uppercase">가동률</span>
                              <span className={`text-xl font-black tabular-nums ${meta.rateClass}`}>
                                {stage.rate !== null ? (
                                  <>
                                    {stage.rate}
                                    <span className="text-xs font-bold ml-0.5 opacity-70">%</span>
                                  </>
                                ) : (
                                  <span className="text-sm">{stage.rateLabel ?? "-"}</span>
                                )}
                              </span>
                            </div>
                            {/* Rate bar */}
                            <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  stage.status === "danger" || stage.isBottleneck
                                    ? "bg-gradient-to-r from-red-600 to-red-400"
                                    : stage.status === "warning"
                                      ? "bg-gradient-to-r from-yellow-600 to-yellow-400"
                                      : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                                }`}
                                style={{ width: `${stage.rate ?? 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Anomaly events */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-slate-500 tracking-wide uppercase">이상 이벤트</span>
                            <div className="flex items-center gap-1">
                              {(stage.events ?? 0) > 0 && (
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                              )}
                              <span className={`text-sm font-bold tabular-nums ${
                                (stage.events ?? 0) === 0 ? "text-slate-400" : "text-red-400"
                              }`}>
                                {stage.events ?? 0}
                                <span className="text-[10px] font-medium ml-0.5 opacity-70">건</span>
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Defect transfer probability */}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[10px] font-medium text-slate-500 tracking-wide uppercase leading-tight">불량 전이 확률</span>
                              <span className={`text-xl font-black tabular-nums ${
                                (stage.defectRate ?? 0) >= 70 ? "text-red-400" : (stage.defectRate ?? 0) >= 50 ? "text-orange-400" : "text-yellow-400"
                              }`}>
                                {stage.defectRate}
                                <span className="text-xs font-bold ml-0.5 opacity-70">%</span>
                              </span>
                            </div>
                            {/* Probability bar */}
                            <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  (stage.defectRate ?? 0) >= 70
                                    ? "bg-gradient-to-r from-red-700 to-red-400"
                                    : (stage.defectRate ?? 0) >= 50
                                      ? "bg-gradient-to-r from-orange-600 to-orange-400"
                                      : "bg-gradient-to-r from-yellow-600 to-yellow-400"
                                }`}
                                style={{ width: `${stage.defectRate ?? 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Bottleneck target */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-medium text-slate-500 tracking-wide uppercase leading-tight flex-shrink-0">병목 예상 구간</span>
                            <span className="text-[11px] font-bold text-violet-300 text-right leading-tight">{stage.targetProcess}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Flow connector arrow ── */}
                {!isLast && (
                  <div className="flex-shrink-0 flex flex-col items-center justify-center w-10 self-center px-1">
                    <div className="relative flex items-center justify-center w-full">
                      {/* Track line */}
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-cyan-500/50 via-cyan-400/35 to-cyan-500/50" />
                      {/* Arrow SVG */}
                      <svg
                        width="20" height="14"
                        viewBox="0 0 20 14"
                        fill="none"
                        className="relative z-10 drop-shadow-[0_0_4px_rgba(34,211,238,0.55)]"
                      >
                        <path
                          d="M1 7 L13 7 M9 2 L15 7 L9 12"
                          stroke="#22d3ee"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
