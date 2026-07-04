import React from "react"
import { ChevronDown, AlertTriangle, CheckCircle } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { PaintTooltip } from "./useManufacturingDashboard"

export function PressAnomalyPanel({ dashboard }: { dashboard: any }) {
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
                      <p className="text-xs text-muted-foreground">Timestamp 지연</p>
                      <p className="text-2xl font-bold text-destructive">{latestPressDisplayData.timestamp_delay_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
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
                  <div className="flex items-center gap-4 mb-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-primary" />
                      <span>실제 사이클 타임</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-success" />
                      <span>기준 사이클 타임</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-warning" />
                      <span>Timestamp 지연</span>
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
                      style={{ touchAction: "none" }}
                      onPointerDownCapture={handlePressChartPointerDown}
                      onMouseEnter={() => setIsPressChartHovered(true)}
                      onMouseLeave={() => setIsPressChartHovered(false)}
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
                          <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                          <Tooltip
                            labelFormatter={(label: string) => {
                              // label은 dateTime 필드 값 ("YYYY-MM-DD HH:mm:ss" 또는 "YYYY-MM-DD HH:mm")
                              // 백엔드 eventTime과 일치하는 형식으로 표시
                              return `이벤트 시각 ${label}`
                            }}
                            formatter={(value, name) => [`${Number(value).toFixed(1)} sec`, name]}
                            contentStyle={{
                              backgroundColor: "var(--popover)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              color: "var(--popover-foreground)",
                            }}
                            labelStyle={{ color: "var(--popover-foreground)" }}
                            wrapperStyle={{
                              visibility: isPressChartHovered && !isPressChartDragging ? "visible" : "hidden",
                              pointerEvents: "none",
                            }}
                          />
                          <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="actual_cycle_time_sec" stroke="#00d4ff" name="실제 사이클 타임" dot={visiblePressData.length === 1 ? { r: 4 } : false} strokeWidth={2} />
                          <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="target_cycle_time_sec" stroke="#22c55e" name="기준 사이클 타임" dot={visiblePressData.length === 1 ? { r: 4 } : false} strokeWidth={2} />
                          <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="timestamp_delay_sec" stroke="#f59e0b" name="Timestamp 지연" dot={visiblePressData.length === 1 ? { r: 4 } : false} strokeWidth={2} />
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
