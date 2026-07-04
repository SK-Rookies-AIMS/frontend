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

export function AssemblyAnomalyPanel({ dashboard }: { dashboard: any }) {
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
                      <p className="text-xs text-muted-foreground">분석 차량 수</p>
                      <p className="text-2xl font-bold">{assemblyKpis.carCount} <span className="text-sm font-normal">대</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">순서 오류 건수</p>
                      <p className="text-2xl font-bold text-destructive">{assemblyKpis.sequenceErrors} <span className="text-sm font-normal">건</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">누락 부품 건수</p>
                      <p className="text-2xl font-bold text-warning">{assemblyKpis.missingParts} <span className="text-sm font-normal">건</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">체결 오류 건수</p>
                      <p className="text-2xl font-bold text-destructive">{assemblyKpis.fasteningErrors} <span className="text-sm font-normal">건</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">평균 위험도 점수</p>
                      <p className="text-2xl font-bold text-warning">{assemblyKpis.averageRisk.toFixed(1)} <span className="text-sm font-normal">점</span></p>
                    </div>
                  </div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium">차량별 조립 분석 결과</h4>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      날짜
                      <select
                        aria-label="조립 대시보드 날짜 선택"
                        value={selectedAssemblyDate}
                        onChange={(event) => {
                          const date = event.target.value
                          setSelectedAssemblyDate(date)
                          void fetchAssemblyDashboardData(date)
                        }}
                        disabled={isAssemblyDatesLoading || assemblyDateOptions.length === 0}
                        className="rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        {assemblyDateOptions.length === 0 && (
                          <option value="">데이터 없음</option>
                        )}
                        {assemblyDateOptions.map((date: any) => (
                          <option key={date} value={date}>{date}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {assemblyDatesError && (
                    <div className="mb-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {assemblyDatesError}
                    </div>
                  )}
                  {assemblyDashboardError && (
                    <div className="mb-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {assemblyDashboardError}
                    </div>
                  )}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground text-xs">
                        <th className="text-left py-2">차량 ID</th>
                        <th className="text-left py-2">기준 순서</th>
                        <th className="text-left py-2">실제 순서</th>
                        <th className="text-center py-2">순서 오류</th>
                        <th className="text-center py-2">누락 부품</th>
                        <th className="text-center py-2">체결 오류</th>
                        <th className="text-center py-2">위험도</th>
                        <th className="text-center py-2">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isAssemblyDashboardLoading ? (
                        <tr className="border-t border-border">
                          <td className="py-6 text-center text-muted-foreground" colSpan={8}>
                            조립 대시보드 데이터를 불러오는 중입니다.
                          </td>
                        </tr>
                      ) : assemblyData.length === 0 ? (
                        <tr className="border-t border-border">
                          <td className="py-6 text-center text-muted-foreground" colSpan={8}>
                            표시할 조립 분석 데이터가 없습니다.
                          </td>
                        </tr>
                      ) : pagedAssemblyData.map((row: any, index: number) => {
                        const rowIndex = assemblyStartIndex + index
                        return (
                        <tr key={`${row.carMasterId ?? row.carDisplayId}-${row.carDisplayId}-${row.time ?? "no-time"}-${rowIndex}`} className="border-t border-border">
                          <td className="py-2">{row.carDisplayId}</td>
                          <td className="py-2">{formatSequence(row.expectedSequence)}</td>
                          <td className="py-2">{formatSequence(row.actualSequence)}</td>
                          <td className={`text-center font-medium ${row.sequenceErrorCount > 0 ? "text-destructive" : "text-success"}`}>{row.sequenceErrorCount}</td>
                          <td className={`text-center font-medium ${row.missingPartCount > 0 ? "text-warning" : "text-success"}`}>{row.missingPartCount}</td>
                          <td className={`text-center font-medium ${row.fasteningErrorCount > 0 ? "text-destructive" : "text-success"}`}>{row.fasteningErrorCount}</td>
                          <td className={`text-center font-medium ${getRiskTextClass(row.riskScore)}`}>{row.riskScore.toFixed(1)}</td>
                          <td className="text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(row.severity, row.status !== "정상", row.status, row.riskScore)}`}>
                              {getAssemblyStatus(row.severity, row.status !== "정상", row.status)}
                            </span>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {assemblyData.length > 0 && (
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <p>총 {assemblyData.length.toLocaleString()}건</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAssemblyPage((page: number) => Math.max(1, page - 1))}
                          disabled={assemblyPage <= 1}
                          className="rounded border border-border px-2 py-1 text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          이전
                        </button>
                        <span className="min-w-12 text-center text-foreground">
                          {assemblyPage} / {assemblyTotalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAssemblyPage((page: number) => Math.min(assemblyTotalPages, page + 1))}
                          disabled={assemblyPage >= assemblyTotalPages}
                          className="rounded border border-border px-2 py-1 text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          다음
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-medium text-destructive">{assemblyDashboard.alert?.title ?? "조립 순서 오류 감지"}</span>
                  </div>
                  {assemblyDashboard.alert?.messages?.length ? (
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {assemblyDashboard.alert.messages.map((message: any) => (
                        <li key={message}>- {message}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      현재 감지된 조립 순서 오류가 없습니다.
                    </p>
                  )}
                </div>
              </div>
  );
}
