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
  ComposedChart,
  Bar,
  Cell,
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

  const maxPeakValue = React.useMemo(() => {
    if (!visibleBodyData || visibleBodyData.length === 0) return 0.01;
    let max = 0;
    visibleBodyData.forEach((d: any) => {
      if (d.vibration_peak && d.vibration_peak > max) max = d.vibration_peak;
      if (d.vibration_rms && d.vibration_rms > max) max = d.vibration_rms;
      if (d.target_vibration_peak && d.target_vibration_peak > max) max = d.target_vibration_peak;
    });
    return max === 0 ? 0.01 : max;
  }, [visibleBodyData]);

  const maxVibeValue = React.useMemo(() => {
    if (!visibleBodyData || visibleBodyData.length === 0) return 1;
    let max = 0;
    visibleBodyData.forEach((d: any) => {
      if (d.robot_vibration_score && d.robot_vibration_score > max) max = d.robot_vibration_score;
      if (d.target_vibration_score && d.target_vibration_score > max) max = d.target_vibration_score;
    });
    return max === 0 ? 1 : max;
  }, [visibleBodyData]);

  const { frequencyChartData, customZones } = React.useMemo(() => {
    const chartData = bodyAnalysis?.frequencyChart ?? [];
    
    const zones = [
      { key: "zone1", label: "Zone 1", desc: "저주파 / 기본 구조 진동", range: "0~300Hz", color: "bg-success", hex: "#22c55e", data: [] as number[] },
      { key: "zone2", label: "Zone 2", desc: "로봇 본체(Main Body) 진동", range: "301~600Hz", color: "bg-sky-400", hex: "#38bdf8", data: [] as number[] },
      { key: "zone3", label: "Zone 3", desc: "관절·감속기(Drive) 진동", range: "601~900Hz", color: "bg-yellow-400", hex: "#facc15", data: [] as number[] },
      { key: "zone4", label: "Zone 4", desc: "베어링·기계 이상 진동", range: "901~1200Hz", color: "bg-orange-500", hex: "#f97316", data: [] as number[] },
      { key: "zone5", label: "Zone 5", desc: "고주파 충격·충돌 위험", range: "1201~1600Hz", color: "bg-destructive", hex: "#ef4444", data: [] as number[] },
    ];

    const processedChartData = chartData.map((d: any) => {
      if (!d.band) return { ...d };
      const shortBand = d.band
        .replace(/freq[-_]/i, '')
        .replace(/[-_]hz/i, 'Hz')
        .replace(/[-_]/g, '~');
        
      const match = d.band.match(/\d+/);
      const minFreq = match ? parseInt(match[0], 10) : 0;
      let zoneIdx = 0;
      if (minFreq >= 1200) zoneIdx = 4;
      else if (minFreq >= 900) zoneIdx = 3;
      else if (minFreq >= 600) zoneIdx = 2;
      else if (minFreq >= 300) zoneIdx = 1;
      
      const fill = zones[zoneIdx].hex;
      zones[zoneIdx].data.push(d.value);
      return { ...d, shortBand, fill };
    });

    const processedZones = zones.map(z => {
      const max = z.data.length ? Math.max(...z.data) : 0;
      const avg = z.data.length ? z.data.reduce((a, b) => a + b, 0) / z.data.length : 0;
      return { ...z, max, avg };
    });

    return { frequencyChartData: processedChartData, customZones: processedZones };
  }, [bodyAnalysis?.frequencyChart]);

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
                      <p className="whitespace-nowrap text-base font-bold text-sky-500">{latestBodyData.robot_operation_mode}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">진동 가속도</p>
                      <p className="whitespace-nowrap text-lg font-bold text-destructive">{latestBodyData.robot_vibration_score} <span className="text-xs font-normal">g</span></p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">피크 주파수 대역</p>
                      <p className="whitespace-nowrap text-base font-bold text-warning">{latestBodyData.frequency_peak_band}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">피크 진동값</p>
                      <p className="whitespace-nowrap text-lg font-bold text-warning">{(latestBodyData.vibration_peak ?? 0).toFixed(6)} <span className="text-xs font-normal">mm/s</span></p>
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
                  <div className="flex flex-wrap items-center gap-4 mb-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-sky-400 border-t border-dashed border-sky-400" style={{ height: "0", borderWidth: "1px" }} />
                      <span className="text-muted-foreground">이상 기준 진동 가속도</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-primary" />
                      <span>로봇 진동 가속도</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-destructive" />
                      <span>위험도</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-green-400 border-t border-dashed border-green-400" style={{ height: "0", borderWidth: "1px" }} />
                      <span className="text-muted-foreground">이상 기준 피크 진동값</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-success" />
                      <span>피크 진동값</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-yellow-500" />
                      <span>진동 실효값(RMS)</span>
                    </div>
                  </div>
                  <div
                    className={`select-none ${isBodyChartDragging ? "cursor-grabbing" : "cursor-grab"}`}
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
                        <CartesianGrid vertical={false} stroke="#334155" />
                        <XAxis
                          dataKey="dateTime"
                          interval={4}
                          padding={{ left: 8, right: 12 }}
                          tick={{ fontSize: 10 }}
                          stroke="#64748b"
                          tickFormatter={formatChartTick}
                        />
                        <YAxis yAxisId="vibe" orientation="left" domain={[0, maxVibeValue]} tick={{ fontSize: 10 }} stroke="#00d4ff" />
                        <YAxis yAxisId="score" orientation="left" domain={[0, 100]} hide={true} />
                        <YAxis yAxisId="peak" orientation="right" domain={[0, maxPeakValue]} tick={{ fontSize: 10 }} tickFormatter={(v) => Number(v.toFixed(4)).toString()} stroke="#22c55e" />
                        <Tooltip
                          labelFormatter={(label) => `분석 시각 ${label}`}
                          formatter={(value, name) => {
                            const isPeakOrRms = name.toString().includes("피크") || name.toString().includes("RMS");
                            const isRisk = name.toString().includes("위험도");
                            return [
                              `${Number(value).toFixed(isPeakOrRms ? 6 : 3)}${isPeakOrRms ? " mm/s" : isRisk ? " 점" : " g"}`,
                              name,
                            ];
                          }}
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
                        <Line isAnimationActive={false} className="target-line" yAxisId="vibe" type="monotone" dataKey="target_vibration_score" stroke="#38bdf8" strokeDasharray="5 5" name="이상 기준 진동 가속도" dot={false} strokeWidth={1} />
                        <Line isAnimationActive={false} yAxisId="vibe" type="monotone" dataKey="robot_vibration_score" stroke="#00d4ff" name="로봇 진동 가속도" dot={false} strokeWidth={1} />
                        <Line isAnimationActive={false} yAxisId="score" type="monotone" dataKey="risk_score" stroke="#ef4444" name="위험도" dot={false} strokeWidth={1} />
                        <Line isAnimationActive={false} className="target-line" yAxisId="peak" type="monotone" dataKey="target_vibration_peak" stroke="#4ade80" strokeDasharray="5 5" name="이상 기준 피크 진동값" dot={false} strokeWidth={1} />
                        <Line isAnimationActive={false} yAxisId="peak" type="monotone" dataKey="vibration_peak" stroke="#22c55e" name="피크 진동값" dot={false} strokeWidth={1} />
                        <Line isAnimationActive={false} yAxisId="peak" type="monotone" dataKey="vibration_rms" stroke="#eab308" name="진동 실효값(RMS)" dot={false} strokeWidth={1} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                    <p>그래프 안을 좌우로 드래그하면 이전 날짜와 시간까지 이동할 수 있습니다.</p>
                    <p className="shrink-0 font-medium text-foreground">
                      {visibleBodyData[0]?.dateTime} ~ {visibleBodyData[visibleBodyData.length - 1]?.dateTime}
                    </p>
                  </div>
                  
                  <div className="mt-6 mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium">주파수 대역별 진동 분포</h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mb-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-slate-400 border-t border-dashed border-slate-400" style={{ height: "0", borderWidth: "1px" }} />
                      <span className="text-muted-foreground">목표/기준값</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-primary" />
                      <span>측정값</span>
                    </div>
                  </div>
                  <div className="chart-line-reveal select-none">
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart
                        data={frequencyChartData}
                        margin={{ top: 5, right: 24, left: 4, bottom: 50 }}
                      >
                        <CartesianGrid vertical={false} stroke="#334155" />
                        <XAxis
                          dataKey="shortBand"
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          stroke="#64748b"
                          angle={-45}
                          textAnchor="end"
                          dy={10}
                        />
                        <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                        <Tooltip
                          formatter={(value, name) => [
                            `${Number(value).toFixed(6)}`,
                            name === "value" ? "측정값" : "목표/기준값",
                          ]}
                          contentStyle={{
                            backgroundColor: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            color: "var(--popover-foreground)",
                          }}
                        />
                        <Bar dataKey="value" name="측정값" radius={[2, 2, 0, 0]}>
                          {frequencyChartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                        <Line isAnimationActive={false} type="step" dataKey="targetValue" stroke="#94a3b8" strokeDasharray="5 5" name="목표/기준값" dot={false} strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
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
                    <p className="text-xs font-medium">주파수 대역 존(Zone)별 상세 분석</p>
                    <div className="mt-3 space-y-2 text-xs">
                      {customZones.map((zone) => {
                        const maxVal = zone.max;
                        const percentage = Math.min(100, (maxVal / 0.005) * 100);
                        return (
                          <div key={zone.label} className="flex flex-col gap-1 mb-3">
                            <div className="flex items-center justify-between font-medium">
                              <span className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${zone.color}`} />
                                {zone.label} <span className="text-muted-foreground font-normal">({zone.range})</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground">{zone.desc}</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground mt-0.5">
                              <span>최대: {maxVal.toFixed(6)}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded bg-secondary">
                              <div className={`h-full ${zone.color}`} style={{ width: `${percentage}%` }} />
                            </div>
                            <div className="text-[10px] text-right text-muted-foreground opacity-80">
                              평균: {zone.avg.toFixed(6)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
  );
}
