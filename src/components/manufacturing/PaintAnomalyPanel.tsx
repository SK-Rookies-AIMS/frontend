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

export function PaintAnomalyPanel({ dashboard }: { dashboard: any }) {
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
                      <p className="text-xs text-muted-foreground">도장 분석 건수</p>
                      <p className="text-2xl font-bold">{paintKpis.analysisCount.toLocaleString()} <span className="text-sm font-normal">건</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">불량 감지율</p>
                      <p className="text-2xl font-bold text-destructive">{paintKpis.defectRate.toFixed(1)}% <span className="text-sm font-normal">(이상/DEFECT)</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">평균 품질 점수</p>
                      <p className="text-2xl font-bold text-success">{paintKpis.averageQuality.toFixed(1)} <span className="text-sm font-normal">점</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">위험 알람 건수</p>
                      <p className="text-2xl font-bold text-warning">{paintKpis.riskAlarmCount} <span className="text-sm font-normal">건</span></p>
                    </div>
                  </div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium">도장 품질 지표 추이</h4>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      날짜
                      <select
                        aria-label="도장 대시보드 날짜 선택"
                        value={selectedPaintDate}
                        onChange={(event) => {
                          const date = event.target.value
                          setSelectedPaintDate(date)
                          void fetchPaintDashboardData(date)
                        }}
                        disabled={isPaintDatesLoading || paintDateOptions.length === 0}
                        className="rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        {paintDateOptions.length === 0 && (
                          <option value="">데이터 없음</option>
                        )}
                        {paintDateOptions.map((date: any) => (
                          <option key={date} value={date}>{date}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {paintDatesError && (
                    <div className="mb-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {paintDatesError}
                    </div>
                  )}
                  {paintDashboardError && (
                    <div className="mb-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {paintDashboardError}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mb-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-primary" />
                      <span>불량 점수</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-destructive" />
                      <span>표면 품질 점수</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-warning" />
                      <span>도장 두께</span>
                    </div>
                  </div>
                  <div className="chart-line-reveal">
                    {isPaintDashboardLoading ? (
                      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                        도장 대시보드 데이터를 불러오는 중입니다.
                      </div>
                    ) : paintChartData.length === 0 ? (
                      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                        표시할 도장 품질 데이터가 없습니다.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart key={activeTab} data={paintChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis 
                            dataKey="time" 
                            ticks={paintChartData.length > 0 ? Array.from(new Set([paintChartData[0].time, paintChartData[paintChartData.length - 1].time])) : []}
                            tick={{ fontSize: 10 }} 
                            stroke="#64748b" 
                          />
                          <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                          <Tooltip content={<PaintTooltip />} />
                          <Legend />
                          <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="defectScoreScaled" stroke="#00d4ff" name="불량 점수" dot={false} strokeWidth={2} />
                          <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="surfaceQualityScore" stroke="#ef4444" name="표면 품질 점수" dot={false} strokeWidth={2} />
                          <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="thicknessValue" stroke="#f59e0b" name="도장 두께" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
                <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-medium text-destructive">{paintDashboard.alert?.title ?? "도장 품질 이상 감지"}</span>
                  </div>
                  {paintDashboard.alert?.messages?.length ? (
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {paintDashboard.alert.messages.map((message: any) => (
                        <li key={message}>- {message}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      현재 감지된 도장 품질 이상이 없습니다.
                    </p>
                  )}
                </div>
              </div>
  );
}
