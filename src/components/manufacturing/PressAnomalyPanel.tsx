import React, { useMemo } from "react"
import { ChevronDown, AlertTriangle, CheckCircle } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { PaintTooltip } from "./useManufacturingDashboard"

export function PressAnomalyPanel({ dashboard }: { dashboard: any }) {
  const [isPressTooltipHovered, setIsPressTooltipHovered] = React.useState(false)
  const pressTooltipLeaveTimerRef = React.useRef<number | null>(null)
  const {
    latestPressDisplayData,
    latestPressDisplayRisk,
    selectedPressDate,
    pressDisplayAvailableDates,
    handlePressDateChange,
    pressDisplayData,
    isPressAnalysisLoading,
    pressAnalysisError,
    isPressChartHovered,
    isPressChartDragging,
    handlePressChartPointerDown,
    setIsPressChartHovered,
    visiblePressData,
    pressAnalysis,
    pressChartWindowSize,
    latestBodyData,
    latestBodySeverity,
    selectedBodyDate,
    bodyDateOptions,
    handleBodyDateChange,
    isBodyAnalysisLoading,
    bodyAnalysisError,
    isBodyChartHovered,
    isBodyChartDragging,
    handleBodyChartPointerDown,
    setIsBodyChartHovered,
    visibleBodyData,
    bodyAnalysis,
    paintKpis,
    selectedPaintDate,
    setSelectedPaintDate,
    fetchPaintDashboardData,
    isPaintDatesLoading,
    paintDateOptions,
    paintDatesError,
    paintDashboardError,
    isPaintDashboardLoading,
    paintChartData,
    paintDashboard,
    assemblyKpis,
    selectedAssemblyDate,
    setSelectedAssemblyDate,
    fetchAssemblyDashboardData,
    isAssemblyDatesLoading,
    assemblyDateOptions,
    assemblyDatesError,
    assemblyDashboardError,
    isAssemblyDashboardLoading,
    assemblyData,
    pagedAssemblyData,
    assemblyStartIndex,
    assemblyPage,
    assemblyTotalPages,
    setAssemblyPage,
    assemblyDashboard,
    formatChartTick,
    activeTab,
    getRiskTextClass,
    getStatusBadgeClass,
    getAssemblyStatus,
    formatSequence,
    formatProbability,
    formatDelayTime,
    getDefectRiskTextClass,
    pressChartWindowSize: PRESS_CHART_WINDOW_SIZE,
  } = dashboard;

  const renderPressSeverityDot = (props: any) => {
    const { cx, cy, payload } = props
    const severity = payload?.severity
    if (payload?.countIncreaseYn === false) {
      return <circle cx={cx} cy={cy} r={4.5} fill="#0f172a" stroke="#ef4444" strokeWidth={2.2} />
    }
    if (severity !== "WARNING" && severity !== "CRITICAL") return <g />
    return <circle cx={cx} cy={cy} r={3.5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.25} />
  }

  const renderPressTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    const row = payload[0]?.payload ?? {}
    const isCountIncreaseMissing = row.countIncreaseYn === false

    return (
      <div
        data-chart-tooltip-interactive="true"
        className="rounded-lg border border-border bg-popover px-4 py-3 text-sm shadow-xl"
        style={{
          color: "var(--popover-foreground)",
          backgroundColor: "var(--popover)",
        }}
        onPointerEnterCapture={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onPointerMoveCapture={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onPointerDownCapture={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onMouseDownCapture={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onMouseMoveCapture={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onMouseEnter={() => {
          if (pressTooltipLeaveTimerRef.current !== null) {
            window.clearTimeout(pressTooltipLeaveTimerRef.current)
            pressTooltipLeaveTimerRef.current = null
          }
          setIsPressTooltipHovered(true)
        }}
        onMouseLeave={() => {
          if (pressTooltipLeaveTimerRef.current !== null) {
            window.clearTimeout(pressTooltipLeaveTimerRef.current)
          }
          pressTooltipLeaveTimerRef.current = window.setTimeout(() => {
            setIsPressTooltipHovered(false)
          }, 150)
        }}
      >
        <p className="mb-2 font-semibold text-base">이벤트 시각 {label}</p>
        {isCountIncreaseMissing && (
          <p className="mb-2 text-base font-extrabold text-destructive">생산량 미증가</p>
        )}
        <div className="space-y-1.5">
          {payload.map((item: any, index: number) => (
            <div key={`${item.dataKey ?? item.name ?? "series"}-${index}`} className="flex items-center justify-between gap-6 text-sm">
              <span className="font-medium" style={{ color: item.color ?? "var(--popover-foreground)" }}>{item.name}</span>
              <span className="font-semibold">
                {Number(item.value).toFixed(1)} sec
              </span>
            </div>
          ))}
          {row.isAbnormal && row.logNo ? (
            <div className="pt-1 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium" style={{ color: "#f97316" }}>이벤트 logNO:</span>
                <span className="max-w-[180px] truncate rounded border border-border px-2 py-0.5 font-semibold text-primary" title={row.logNo}>
                  {row.logNo}
                </span>
              </div>
              <button
                type="button"
                data-chart-tooltip-interactive="true"
                className="mt-2 w-full rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 font-semibold text-primary transition-colors hover:bg-primary/20"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  window.location.assign(`/events?logNo=${encodeURIComponent(row.logNo)}`)
                }}
                onPointerDownCapture={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onMouseDownCapture={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onPointerMoveCapture={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onMouseMoveCapture={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
              >
                이벤트 상세 보러가기
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const warningCycleTimeLine =
    latestPressDisplayData.target_cycle_time_sec + Number(latestPressDisplayData.warning_cycle_time_gap_sec ?? 0)
  const dangerCycleTimeLine =
    latestPressDisplayData.target_cycle_time_sec + Number(latestPressDisplayData.danger_cycle_time_gap_sec ?? 0)

  const pressCycleTimeDomain = useMemo<[number, number]>(() => [30, 60], [])

  const pressGapDomain = useMemo<[number, number]>(() => {
    if (pressDisplayData.length === 0) return [-1, 1]

    const gapValues = pressDisplayData.map((item: any) => Number(item.cycle_time_gap_sec))
    const minValue = Math.min(...gapValues)
    const maxValue = Math.max(...gapValues)
    const spread = maxValue - minValue
    const padding = spread > 0 ? Math.max(spread * 0.2, 1) : 1

    return [Math.floor(minValue - padding), Math.ceil(maxValue + padding)]
  }, [pressDisplayData])

  const pressCycleTimeTicks = useMemo(() => {
    const [minValue, maxValue] = pressCycleTimeDomain
    const start = Math.floor(minValue / 5) * 5
    const end = Math.ceil(maxValue / 5) * 5
    const ticks: number[] = []
    for (let value = start; value <= end; value += 5) {
      ticks.push(value)
    }
    return ticks
  }, [pressCycleTimeDomain])

  React.useEffect(() => {
    return () => {
      if (pressTooltipLeaveTimerRef.current !== null) {
        window.clearTimeout(pressTooltipLeaveTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <div className="flex items-center gap-8 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">기준 사이클 타임</p>
                      <p className="text-2xl font-bold">{latestPressDisplayData.target_cycle_time_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">실제 사이클 타임</p>
                      <p className="text-2xl font-bold text-warning">{latestPressDisplayData.actual_cycle_time_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">사이클 지연</p>
                      <p className="text-2xl font-bold text-destructive">{latestPressDisplayData.cycle_time_gap_sec >= 0 ? "+" : ""}{latestPressDisplayData.cycle_time_gap_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">위험도</p>
                      <p className="text-2xl font-bold text-warning">{latestPressDisplayData.risk_score.toFixed(1)} <span className="text-sm font-normal">/ 100</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">전체 위험도</p>
                      <p className={`text-2xl font-bold ${latestPressDisplayRisk.className}`}>{latestPressDisplayRisk.label}</p>
                    </div>
                  </div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium">프레스 사이클 타임 및 지연 추이</h4>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      날짜
                      <select
                        aria-label="프레스 차트 날짜 선택"
                        value={selectedPressDate}
                        onChange={handlePressDateChange}
                        className="rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        {pressDisplayAvailableDates.map((date: any) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <div className="w-3 h-0.5 bg-primary" />
                      <span>실제 사이클 타임</span>
                    </div>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <div className="w-3 h-0.5 bg-success" />
                      <span>기준 {latestPressDisplayData.target_cycle_time_sec.toFixed(1)} sec</span>
                    </div>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <div className="w-3 h-0.5 border-t border-dashed border-warning bg-transparent" />
                      <span>경고 {warningCycleTimeLine.toFixed(1)} sec</span>
                    </div>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <div className="w-3 h-0.5 border-t border-dashed border-destructive bg-transparent" />
                      <span>위험 {dangerCycleTimeLine.toFixed(1)} sec</span>
                    </div>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <div className="w-3 h-0.5 bg-warning" />
                      <span>최대 Cycle Time 지연</span>
                    </div>
                  </div>
                  {pressDisplayData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[210px] bg-muted/5 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
                      {isPressAnalysisLoading ? (
                        <p>프레스 분석 데이터를 불러오는 중입니다...</p>
                      ) : (
                        <>
                          <p>선택한 날짜({selectedPressDate})에 분석 데이터가 없습니다.</p>
                          {pressDisplayAvailableDates.length > 0 && (
                            <p className="text-xs mt-1 text-muted-foreground/60">다른 날짜를 선택하여 조회할 수 있습니다.</p>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`chart-line-reveal select-none ${isPressChartDragging ? "cursor-grabbing" : pressDisplayData.length > PRESS_CHART_WINDOW_SIZE ? "cursor-grab" : ""}`}
                      style={{
                        touchAction: "none",
                        pointerEvents: isPressTooltipHovered ? "none" : "auto",
                      }}
                      onPointerDownCapture={(event) => {
                        const target = event.target as HTMLElement | null
                        if (target?.closest('[data-chart-tooltip-interactive="true"]')) return
                        handlePressChartPointerDown(event)
                      }}
                      onPointerDown={(event) => {
                        const target = event.target as HTMLElement | null
                        if (target?.closest('[data-chart-tooltip-interactive="true"]')) return
                        handlePressChartPointerDown(event)
                      }}
                      onMouseEnter={() => {
                        if (pressTooltipLeaveTimerRef.current !== null) {
                          window.clearTimeout(pressTooltipLeaveTimerRef.current)
                          pressTooltipLeaveTimerRef.current = null
                        }
                        setIsPressChartHovered(true)
                      }}
                      onMouseLeave={() => {
                        if (pressTooltipLeaveTimerRef.current !== null) {
                          window.clearTimeout(pressTooltipLeaveTimerRef.current)
                        }
                        pressTooltipLeaveTimerRef.current = window.setTimeout(() => {
                          setIsPressChartHovered(false)
                        }, 150)
                      }}
                    >
                      <ResponsiveContainer width="100%" height={210}>
                        <LineChart
                          key={activeTab}
                          data={visiblePressData}
                          margin={{ top: 5, right: 24, left: 4, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis
                            dataKey="dateTime"
                            interval={Math.max(0, Math.floor(visiblePressData.length / 6) - 1)}
                            padding={{ left: 8, right: 12 }}
                            tick={{ fontSize: 10 }}
                            stroke="#64748b"
                            tickFormatter={formatChartTick}
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            stroke="#64748b"
                            domain={pressCycleTimeDomain}
                            ticks={pressCycleTimeTicks}
                            allowDataOverflow
                          />
                          <YAxis yAxisId="gap" orientation="right" hide domain={pressGapDomain} />
                          <ReferenceLine
                            y={warningCycleTimeLine}
                            stroke="#facc15"
                            strokeDasharray="5 5"
                            ifOverflow="discard"
                          />
                          <ReferenceLine
                            y={dangerCycleTimeLine}
                            stroke="#ef4444"
                            strokeDasharray="5 5"
                            ifOverflow="discard"
                          />
                          <ReferenceLine
                            y={latestPressDisplayData.target_cycle_time_sec}
                            stroke="#22c55e"
                            strokeDasharray="4 4"
                            ifOverflow="discard"
                          />
                          <Tooltip
                            content={renderPressTooltip}
                            wrapperStyle={{
                              visibility: (isPressChartHovered || isPressTooltipHovered) && !isPressChartDragging ? "visible" : "hidden",
                              pointerEvents: (isPressChartHovered || isPressTooltipHovered) && !isPressChartDragging ? "auto" : "none",
                            }}
                          />
                          <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="actual_cycle_time_sec" stroke="#00d4ff" name="실제 사이클 타임" dot={renderPressSeverityDot} strokeWidth={2} />
                          <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="target_cycle_time_sec" stroke="#22c55e" name="기준 사이클 타임" dot={visiblePressData.length === 1 ? { r: 4 } : false} strokeWidth={2} />
                          <Line isAnimationActive={false} yAxisId="gap" pathLength={1} type="monotone" dataKey="cycle_time_gap_sec" stroke="#f59e0b" name="사이클 지연" dot={visiblePressData.length === 1 ? { r: 4 } : false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                    <p>
                      {isPressAnalysisLoading
                        ? "프레스 이상 탐지 데이터를 불러오는 중입니다."
                        : pressAnalysisError ?? "선택 날짜의 전체 시간 범위를 한눈에 표시합니다."}
                    </p>
                    {visiblePressData.length > 0 && (
                      <p className="shrink-0 font-medium text-foreground">
                        {visiblePressData[0]?.dateTime} ~ {visiblePressData[visiblePressData.length - 1]?.dateTime}
                      </p>
                    )}
                  </div>
                </div>
                <div className={`${pressAnalysis?.alert?.detected === false ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"} border rounded p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    {pressAnalysis?.alert?.detected === false ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                    <span className={`font-medium ${pressAnalysis?.alert?.detected === false ? "text-success" : "text-destructive"}`}>
                      {pressAnalysis?.alert?.title ?? (pressAnalysis?.alert?.detected === false ? "프레스 이상 없음" : "프레스 이상 정지 탐지")}
                    </span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {!pressAnalysis ? (
                      <li>• 이상 징후가 감지되지 않았습니다.</li>
                    ) : pressAnalysis.alert?.reasons && pressAnalysis.alert.reasons.length > 0 ? (
                      pressAnalysis.alert.reasons.map((reason: any) => (
                        <li key={reason}>• {reason}</li>
                      ))
                    ) : (
                      <li>• {pressAnalysis.alert?.detected === false ? "이상 징후가 감지되지 않았습니다." : "이상 사유가 존재하지 않습니다."}</li>
                    )}
                  </ul>
                </div>
              </div>
  );
}

