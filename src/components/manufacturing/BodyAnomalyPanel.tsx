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

export function BodyAnomalyPanel({ dashboard }: { dashboard: any }) {
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
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">로봇 모션 상태</p>
                      <p className={`whitespace-nowrap text-base font-bold ${latestBodyData.robot_motion_status === "NORMAL" ? "text-primary" : latestBodyData.robot_motion_status === "WARNING" ? "text-warning" : "text-destructive"}`}>
                        {latestBodyData.robot_motion_status}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">운전 모드</p>
                      <p className="whitespace-nowrap text-base font-bold text-warning">{latestBodyData.robot_operation_mode}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">진동 점수</p>
                      <p className="whitespace-nowrap text-lg font-bold text-destructive">{latestBodyData.robot_vibration_score} <span className="text-xs font-normal">/ 100</span></p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">피크 주파수 대역</p>
                      <p className="whitespace-nowrap text-base font-bold text-warning">{latestBodyData.frequency_peak_band}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">피크 진동값</p>
                      <p className="whitespace-nowrap text-lg font-bold text-warning">{latestBodyData.frequency_peak_value.toFixed(1)} <span className="text-xs font-normal">mm/s</span></p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">전체 위험도</p>
                      <p className={`whitespace-nowrap text-lg font-bold ${latestBodySeverity.className}`}>{latestBodySeverity.label}</p>
                    </div>
                  </div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium">로봇 진동·주파수 및 위험도 추이</h4>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      날짜
                      <select
                        aria-label="차체 로봇 차트 날짜 선택"
                        value={selectedBodyDate}
                        onChange={handleBodyDateChange}
                        className="rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        {bodyDateOptions.map((date: any) => (
                          <option key={date} value={date}>{date}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                    {isBodyAnalysisLoading && (
                      <div className="mb-2 text-xs text-muted-foreground">차체 분석 데이터를 불러오는 중...</div>
                    )}
                    {bodyAnalysisError && (
                      <div className="mb-2 text-xs text-destructive">오류: {bodyAnalysisError}</div>
                    )}
                  <div className="flex items-center gap-4 mb-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-primary" />
                      <span>로봇 진동 점수</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-destructive" />
                      <span>위험도</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-success" />
                      <span>피크 진동값</span>
                    </div>
                  </div>
                  <div
                    className={`chart-line-reveal select-none ${isBodyChartDragging ? "cursor-grabbing" : "cursor-grab"}`}
                    style={{ touchAction: "none" }}
                    onPointerDownCapture={handleBodyChartPointerDown}
                    onMouseEnter={() => setIsBodyChartHovered(true)}
                    onMouseLeave={() => setIsBodyChartHovered(false)}
                  >
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart
                        key={activeTab}
                        data={visibleBodyData}
                        margin={{ top: 5, right: 24, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="dateTime"
                          interval={4}
                          padding={{ left: 8, right: 12 }}
                          tick={{ fontSize: 10 }}
                          stroke="#64748b"
                          tickFormatter={formatChartTick}
                        />
                        <YAxis yAxisId="score" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#64748b" />
                        <YAxis yAxisId="peak" orientation="right" domain={[0, 12]} tick={{ fontSize: 10 }} stroke="#22c55e" />
                        <Tooltip
                          labelFormatter={(label) => `분석 시각 ${label}`}
                          formatter={(value, name) => [
                            `${Number(value).toFixed(1)}${name === "피크 진동값" ? " mm/s" : " 점"}`,
                            name,
                          ]}
                          contentStyle={{
                            backgroundColor: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            color: "var(--popover-foreground)",
                          }}
                          labelStyle={{ color: "var(--popover-foreground)" }}
                          wrapperStyle={{
                            visibility:
                              isBodyChartHovered && !isBodyChartDragging ? "visible" : "hidden",
                            pointerEvents: "none",
                          }}
                        />
                        <Line isAnimationActive={false} pathLength={1} yAxisId="score" type="monotone" dataKey="robot_vibration_score" stroke="#00d4ff" name="로봇 진동 점수" dot={false} strokeWidth={2} />
                        <Line isAnimationActive={false} pathLength={1} yAxisId="score" type="monotone" dataKey="risk_score" stroke="#ef4444" name="위험도" dot={false} strokeWidth={2} />
                        <Line isAnimationActive={false} pathLength={1} yAxisId="peak" type="monotone" dataKey="frequency_peak_value" stroke="#22c55e" name="피크 진동값" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                    <p>그래프 안을 좌우로 드래그하면 이전 날짜와 시간까지 이동할 수 있습니다.</p>
                    <p className="shrink-0 font-medium text-foreground">
                      {visibleBodyData[0]?.dateTime} ~ {visibleBodyData[visibleBodyData.length - 1]?.dateTime}
                    </p>
                  </div>
                </div>
                <div className={`${bodyAnalysis?.alert?.detected === false ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"} border rounded p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    {bodyAnalysis?.alert?.detected === false ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                    <span className={`font-medium ${bodyAnalysis?.alert?.detected === false ? "text-success" : "text-destructive"}`}>
                      {bodyAnalysis?.alert?.title ?? (bodyAnalysis?.alert?.detected === false ? "차체 이상 미탐지" : "차체 이상 탐지")}
                    </span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {!bodyAnalysis ? (
                      <li>• 이상 징후가 감지되지 않았습니다.</li>
                    ) : bodyAnalysis.alert?.reasons && bodyAnalysis.alert.reasons.length > 0 ? (
                      bodyAnalysis.alert.reasons.map((reason: any) => (
                        <li key={reason}>• {reason}</li>
                      ))
                    ) : (
                      <li>• {bodyAnalysis.alert?.detected === false ? "이상 징후가 감지되지 않았습니다." : "이상 사유가 존재하지 않습니다."}</li>
                    )}
                  </ul>
                  <div className="mt-4 border-t border-destructive/20 pt-4">
                    <p className="text-xs font-medium">주파수 대역별 진동 분포</p>
                    <div className="mt-3 space-y-2 text-xs">
                      {[
                        { label: "LOW", value: latestBodyData.band_low, color: "bg-success" },
                        { label: "MID", value: latestBodyData.band_mid, color: "bg-warning" },
                        { label: "HIGH", value: latestBodyData.band_high, color: "bg-destructive" },
                      ].map((band) => (
                        <div key={band.label} className="flex items-center gap-2">
                          <span className="w-9 text-muted-foreground">{band.label}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded bg-secondary">
                            <div className={`h-full ${band.color}`} style={{ width: `${Math.min(100, band.value * 10)}%` }} />
                          </div>
                          <span className="w-12 text-right">{band.value.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
  );
}
