import React, { useMemo } from "react"
import { AlertTriangle, CheckCircle } from "lucide-react"
import {
  Bar,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type TrendPoint = {
  dateTime: string
  value: number
  secondaryValue?: number
  warning_line: number
  danger_line: number
}

type ZoneSummary = {
  zone: string
  range: string
  description?: string | null
  avg: number
  max: number
  color: string
}

const ZONE_PALETTE = [
  { zone: "Zone 1", color: "#22c55e" },
  { zone: "Zone 2", color: "#38bdf8" },
  { zone: "Zone 3", color: "#facc15" },
  { zone: "Zone 4", color: "#f97316" },
  { zone: "Zone 5", color: "#ef4444" },
] as const

function getBandStartFrequency(band: string) {
  const match = String(band ?? "").match(/\d+/)
  return match ? Number(match[0]) : 0
}

function getZoneColorByBand(band: string) {
  const start = getBandStartFrequency(band)
  if (start >= 1201) return ZONE_PALETTE[4].color
  if (start >= 901) return ZONE_PALETTE[3].color
  if (start >= 601) return ZONE_PALETTE[2].color
  if (start >= 301) return ZONE_PALETTE[1].color
  return ZONE_PALETTE[0].color
}

function getZoneColorByIndex(index: number) {
  return ZONE_PALETTE[Math.min(Math.max(index, 0), ZONE_PALETTE.length - 1)].color
}

function normalizeFrequencyZones(bodyAnalysis: any): ZoneSummary[] {
  const chart = Array.isArray(bodyAnalysis?.frequencyZoneChart) ? bodyAnalysis.frequencyZoneChart : null
  if (chart && chart.length > 0) {
    return chart
      .map((entry: any, index: number) => ({
        zone: entry.zone ?? `Zone ${index + 1}`,
        range: entry.range ?? "",
        description: entry.description ?? null,
        avg: Number(entry.avg ?? 0),
        max: Number(entry.max ?? 0),
        color: getZoneColorByIndex(index),
      }))
      .filter((entry: ZoneSummary) => Boolean(entry.zone))
  }

  const analysis = bodyAnalysis?.frequencyZoneAnalysis
  if (!analysis) return []

  const zones = [
    {
      zone: "Zone 1",
      range: "0~300Hz",
      description: "저주파 / 기본 구조 진동",
      source: analysis.low ?? analysis.zone1,
      color: getZoneColorByIndex(0),
    },
    {
      zone: "Zone 2",
      range: "301~600Hz",
      description: "로봇 본체 진동",
      source: analysis.main ?? analysis.zone2,
      color: getZoneColorByIndex(1),
    },
    {
      zone: "Zone 3",
      range: "601~900Hz",
      description: "관절·감속기 진동",
      source: analysis.high ?? analysis.zone3,
      color: getZoneColorByIndex(2),
    },
    {
      zone: "Zone 4",
      range: "901~1200Hz",
      description: "베어링·기계 이상 진동",
      source: analysis.ultra ?? analysis.zone4,
      color: getZoneColorByIndex(3),
    },
    {
      zone: "Zone 5",
      range: "1201~1600Hz",
      description: "고주파 충격·충돌 위험",
      source: analysis.extreme ?? analysis.zone5,
      color: getZoneColorByIndex(4),
    },
  ] as const

  return zones
    .filter((entry) => entry.source !== undefined && entry.source !== null)
    .map((entry) => ({
      zone: entry.zone,
      range: entry.range,
      description: entry.description,
      avg: Number(entry.source?.avg ?? 0),
      max: Number(entry.source?.max ?? 0),
      color: entry.color,
    }))
}

function formatFrequencyZoneTooltip(
  payload: Array<{ payload?: ZoneSummary; dataKey?: string; value?: number }>,
) {
  const row = payload?.[0]?.payload
  if (!row) return null

  return (
    <div
      className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl"
      style={{
        color: "var(--popover-foreground)",
        backgroundColor: "var(--popover)",
      }}
    >
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium" style={{ color: row.color }}>{row.zone}</span>
          <span className="text-muted-foreground">{row.range}</span>
        </div>
        {row.description ? <div className="text-muted-foreground">{row.description}</div> : null}
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium">평균</span>
          <span className="font-semibold">{row.avg.toFixed(6)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium" style={{ color: "#f97316" }}>최대</span>
          <span className="font-semibold" style={{ color: "#fdba74" }}>{row.max.toFixed(6)}</span>
        </div>
      </div>
    </div>
  )
}

function getMaxFromTrend(data: TrendPoint[], fallback = 1) {
  if (!data.length) return fallback
  let max = 0
  data.forEach((row) => {
    max = Math.max(max, row.value ?? 0, row.secondaryValue ?? 0, row.warning_line ?? 0, row.danger_line ?? 0)
  })
  return max > 0 ? max : fallback
}

function formatTrendRange(data: TrendPoint[]) {
  if (!data.length) return "-"
  return `${data[0].dateTime} ~ ${data[data.length - 1].dateTime}`
}

function formatTrendTooltip(
  value: number,
  name: string,
  labels: { valueLabel: string; secondaryValueLabel?: string; unit: string; precision: number },
) {
  if (name === "warning_line") return [Number(value).toFixed(labels.precision), "경고 기준"]
  if (name === "danger_line") return [Number(value).toFixed(labels.precision), "위험 기준"]
  if (labels.secondaryValueLabel && (name === "secondaryValue" || name === labels.secondaryValueLabel)) {
    return [`${Number(value).toFixed(labels.precision)} ${labels.unit}`, labels.secondaryValueLabel]
  }
  return [`${Number(value).toFixed(labels.precision)} ${labels.unit}`, labels.valueLabel]
}

function formatFrequencySpectrumTooltip(
  payload: Array<{ dataKey?: string; value?: number; color?: string; name?: string; payload?: unknown }>,
  thresholds: { warningValue: number; dangerValue: number },
) {
  const current = payload.find((item) => item.dataKey === "value")
  const row = payload[0]?.payload as any
  const warningValue = Number(row?.warningValue ?? thresholds.warningValue)
  const dangerValue = Number(row?.dangerValue ?? thresholds.dangerValue)

  return (
    <div
      className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl"
      style={{
        color: "var(--popover-foreground)",
        backgroundColor: "var(--popover)",
      }}
    >
      <div className="space-y-1 text-xs">
        {current && (
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium" style={{ color: "#22c55e" }}>실측값</span>
            <span className="font-semibold" style={{ color: "#86efac" }}>
              {Number(current.value ?? 0).toFixed(6)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium" style={{ color: "#facc15" }}>경고 기준</span>
          <span className="font-semibold" style={{ color: "#fde68a" }}>
            {warningValue.toFixed(6)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium" style={{ color: "#f97316" }}>위험 기준</span>
          <span className="font-semibold" style={{ color: "#fdba74" }}>
            {dangerValue.toFixed(6)}
          </span>
        </div>
      </div>
    </div>
  )
}

function TrendChart({
  title,
  subtitle,
  unit,
  data,
  warningLine: warningLineProp,
  dangerLine: dangerLineProp,
  yDomainMax,
  valueLabel,
  secondaryValueLabel,
  valueColor,
  secondaryValueColor,
  precision = 3,
  warningLabelPosition = "insideTopLeft",
  dangerLabelPosition = "insideTopRight",
  allowDataOverflow = false,
  hovered,
  dragging,
  onPointerDown,
  onHoverChange,
}: {
  title: string
  subtitle?: string
  unit: string
  data: TrendPoint[]
  warningLine?: number | null
  dangerLine?: number | null
  yDomainMax?: number
  valueLabel: string
  secondaryValueLabel?: string
  valueColor: string
  secondaryValueColor?: string
  precision?: number
  warningLabelPosition?: "insideTopLeft" | "insideTopRight" | "insideBottomLeft" | "insideBottomRight" | "top" | "bottom"
  dangerLabelPosition?: "insideTopLeft" | "insideTopRight" | "insideBottomLeft" | "insideBottomRight" | "top" | "bottom"
  allowDataOverflow?: boolean
  hovered: boolean
  dragging: boolean
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onHoverChange: (hovered: boolean) => void
}) {
  const maxValue = getMaxFromTrend(data)
  const resolvedYDomainMax = yDomainMax ?? maxValue * 1.15
  const showSecondary = data.some((row) => row.secondaryValue !== undefined && row.secondaryValue !== null)
  const warningLine = warningLineProp ?? data.find((row) => row.warning_line !== undefined && row.warning_line !== null)?.warning_line
  const dangerLine = dangerLineProp ?? data.find((row) => row.danger_line !== undefined && row.danger_line !== null)?.danger_line
  const [showTrendDots, setShowTrendDots] = React.useState(false)
  const trendDataSignature = React.useMemo(
    () => data.map((row) => row.dateTime).join("|"),
    [data],
  )

  React.useEffect(() => {
    setShowTrendDots(false)
    if (!data.length) return

    const timer = window.setTimeout(() => {
      setShowTrendDots(true)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [trendDataSignature])

  const renderTrendDot = (props: any) => {
    const { cx, cy, payload } = props
    const severity = payload?.severity
    if (severity !== "WARNING" && severity !== "CRITICAL") {
      return <g />
    }
    return <circle cx={cx} cy={cy} r={3.5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.25} />
  }
  const legendItems = [
    { label: "경고 기준", color: "#facc15", dashed: true },
    { label: "위험 기준", color: "#f97316", dashed: true },
    { label: valueLabel, color: valueColor, dashed: false },
    ...(showSecondary && secondaryValueLabel
      ? [{ label: secondaryValueLabel, color: secondaryValueColor ?? "#94a3b8", dashed: false }]
      : []),
  ]

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <p className="text-xs text-muted-foreground">{formatTrendRange(data)}</p>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className={item.dashed ? "h-0.5 w-3 border-t bg-transparent" : "h-0.5 w-3"}
              style={{
                height: 2,
                width: 14,
                borderWidth: item.dashed ? 1 : 0,
                borderColor: item.color,
                backgroundColor: item.color,
                borderStyle: item.dashed ? "dashed" : "solid",
                opacity: 1,
              }}
            />
            <span style={{ color: item.color }} className="font-medium">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div
        className={`select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ touchAction: "none" }}
        onPointerDownCapture={onPointerDown}
        onPointerDown={onPointerDown}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 24, left: 4, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#334155" />
            <XAxis
              dataKey="dateTime"
              interval={4}
              padding={{ left: 8, right: 12 }}
              tick={{ fontSize: 10 }}
              stroke="#64748b"
              tickFormatter={(value: string) => value.slice(11, 16)}
            />
            <YAxis
              orientation="left"
              domain={[0, resolvedYDomainMax]}
              tick={{ fontSize: 10 }}
              stroke={valueColor}
              tickFormatter={(value) => Number(value).toFixed(precision)}
              allowDataOverflow={allowDataOverflow}
              tickCount={4}
            />
            <Tooltip
              formatter={(value, name) => formatTrendTooltip(Number(value), String(name), { valueLabel, secondaryValueLabel, unit, precision })}
              labelFormatter={(label) => `측정 시간 ${label}`}
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--popover-foreground)",
              }}
              labelStyle={{ color: "var(--popover-foreground)" }}
              wrapperStyle={{
                visibility: hovered && !dragging ? "visible" : "hidden",
                pointerEvents: "none",
              }}
            />
            {warningLine !== undefined && warningLine !== null ? (
              <ReferenceLine
                y={warningLine}
                stroke="#facc15"
                strokeDasharray="5 5"
                ifOverflow="extendDomain"
                label={{
                  value: `경고선 ${Number(warningLine).toFixed(precision)}`,
                  position: warningLabelPosition,
                  fill: "#fde68a",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            ) : null}
            {dangerLine !== undefined && dangerLine !== null ? (
              <ReferenceLine
                y={dangerLine}
                stroke="#f97316"
                strokeDasharray="5 5"
                ifOverflow="extendDomain"
                label={{
                  value: `위험선 ${Number(dangerLine).toFixed(precision)}`,
                  position: dangerLabelPosition,
                  fill: "#fdba74",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            ) : null}
            <Line
              isAnimationActive
              animationDuration={700}
              type="monotone"
              dataKey="value"
              stroke={valueColor}
              name={valueLabel}
              dot={showTrendDots ? renderTrendDot : false}
              strokeWidth={2}
            />
            {showSecondary && secondaryValueLabel ? (
              <Line
                isAnimationActive
                animationDuration={700}
                type="monotone"
                dataKey="secondaryValue"
                stroke={secondaryValueColor ?? "#94a3b8"}
                name="secondaryValue"
                dot={false}
                strokeWidth={1.5}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function BodyAnomalyPanel({ dashboard }: { dashboard: any }) {
  const {
    latestBodyData,
    latestBodySeverity,
    selectedBodyDate,
    bodyDateOptions,
    handleBodyDateChange,
    isBodyAnalysisLoading,
    bodyAnalysisError,
    isBodyChartHovered,
    isBodyRobotChartDragging,
    isBodyFrequencyChartDragging,
    handleBodyRobotChartPointerDown,
    handleBodyFrequencyChartPointerDown,
    setIsBodyChartHovered,
    visibleBodyRobotData,
    visibleBodyFrequencyData,
    bodyRobotTrendDomainMax,
    bodyFrequencyTrendDomainMax,
    bodyAnalysis,
  } = dashboard

  const frequencyZones = React.useMemo(() => normalizeFrequencyZones(bodyAnalysis), [bodyAnalysis])
  const frequencySpectrum = bodyAnalysis?.frequencyChart ?? []
  const frequencyZoneSpectrum = frequencyZones
  const peakWarningLine = Number(latestBodyData.peak_warning_line ?? 0.015)
  const peakDangerLine = Number(latestBodyData.peak_danger_line ?? 0.03)
  const frequencyPeakTrendDomainMax = React.useMemo(() => {
    const thresholdTop = Math.max(
      peakDangerLine * 1.08,
      peakWarningLine * 1.15,
      peakDangerLine + Math.max((peakDangerLine - peakWarningLine) * 0.5, 0.00001),
      0.00006,
    )
    return thresholdTop
  }, [peakDangerLine, peakWarningLine])
  const frequencySpectrumBarDomainMax = React.useMemo(() => {
    const values = frequencySpectrum.flatMap((row: any) => [
      Number(row.value ?? 0),
      Number(row.avg ?? 0),
      Number(row.max ?? 0),
    ])
    const maxValue = Math.max(...values, 0.005)
    return Math.max(0.0055, maxValue * 1.25)
  }, [frequencySpectrum])
  const frequencySpectrumThresholdDomainMax = React.useMemo(() => {
    const values = frequencySpectrum.flatMap((row: any) => [
      Number(row.warningValue ?? peakWarningLine),
      Number(row.dangerValue ?? peakDangerLine),
      Number(row.value ?? 0),
      Number(row.max ?? 0),
    ])
    return Math.max(peakDangerLine * 1.25, ...values)
  }, [frequencySpectrum, peakDangerLine, peakWarningLine])
  const frequencyZoneBarDomainMax = React.useMemo(() => {
    const values = frequencyZoneSpectrum.flatMap((row: any) => [
      Number(row.avg ?? 0),
      Number(row.max ?? 0),
      Number(row.targetValue ?? 0),
      Number(row.warningValue ?? 0),
      Number(row.dangerValue ?? 0),
    ])
    const maxValue = Math.max(...values, 0.001)
    return Math.max(0.0015, maxValue * 1.35)
  }, [frequencyZoneSpectrum])

  const latestBodyRiskScore = Number(latestBodyData.risk_score ?? 0)
  const robotVibrationScore = Number(latestBodyData.robot_vibration_score ?? 0)
  const frequencyPeakValue = Number(latestBodyData.frequency_peak_value ?? 0)

  const motionClass =
    latestBodyData.robot_motion_status === "NORMAL"
      ? "text-primary"
      : latestBodyData.robot_motion_status === "WARNING"
        ? "text-warning"
        : "text-destructive"
  const riskClass =
    latestBodySeverity.className === "text-destructive"
      ? "text-destructive"
      : latestBodySeverity.className === "text-warning"
        ? "text-warning"
        : "text-foreground"
  const peakClass =
    frequencyPeakValue >= peakDangerLine
      ? "text-destructive"
      : frequencyPeakValue >= peakWarningLine
        ? "text-warning"
        : "text-foreground"

  const [isBodyRobotChartHovered, setIsBodyRobotChartHovered] = React.useState(false)
  const [isBodyFrequencyChartHovered, setIsBodyFrequencyChartHovered] = React.useState(false)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-3">
            {[
              { label: "로봇 모션 상태", value: latestBodyData.robot_motion_status, className: motionClass },
              { label: "운전 모드", value: latestBodyData.robot_operation_mode, className: "text-sky-400" },
              {
                label: "평균 진동 가속도",
                value: `${robotVibrationScore.toFixed(3)} g`,
                className: robotVibrationScore >= 0.75 ? "text-destructive" : robotVibrationScore >= 0.5 ? "text-warning" : "text-foreground",
              },
              {
                label: "피크 집중 주파수 대역",
                value: latestBodyData.frequency_peak_band,
                className: peakClass,
              },
              {
                label: "평균 피크 진동값",
                value: `${frequencyPeakValue.toFixed(6)} mm/s`,
                className: peakClass,
              },
              {
                label: "전체 위험도",
                value: `${latestBodyRiskScore.toFixed(2)} ${latestBodySeverity.label}`,
                className: riskClass,
              },
            ].map((item) => (
              <div key={item.label} className="min-h-[84px] rounded-lg border border-border bg-background/30 p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`mt-1 text-lg font-bold ${item.className}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {isBodyAnalysisLoading && <div className="text-xs text-muted-foreground">차체 분석 데이터를 불러오는 중입니다.</div>}
            {bodyAnalysisError && <div className="text-xs text-destructive">오류: {bodyAnalysisError}</div>}
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              날짜
              <select
                aria-label="차체 이상 날짜 선택"
                value={selectedBodyDate}
                onChange={handleBodyDateChange}
                className="rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {bodyDateOptions.map((date: string) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div
          className={`rounded border p-4 ${
            bodyAnalysis?.alert?.detected === false ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            {bodyAnalysis?.alert?.detected === false ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            <span className={`font-medium ${bodyAnalysis?.alert?.detected === false ? "text-success" : "text-destructive"}`}>
              {bodyAnalysis?.alert?.title ?? (bodyAnalysis?.alert?.detected === false ? "차체 이상 미탐지" : "차체 이상이 감지되었습니다")}
            </span>
          </div>

          <ul className="space-y-1 text-sm text-muted-foreground">
            {!bodyAnalysis ? (
              <li>차체 이상 분석 결과가 아직 없습니다.</li>
            ) : bodyAnalysis.alert?.reasons && bodyAnalysis.alert.reasons.length > 0 ? (
              bodyAnalysis.alert.reasons.map((reason: string) => <li key={reason}>• {reason}</li>)
            ) : (
              <li>이상 징후가 감지되지 않았습니다</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChart
          title="로봇 진동 가속도 추이"
          unit="g"
          data={visibleBodyRobotData}
          warningLine={latestBodyData.vibration_warning_line}
          dangerLine={latestBodyData.vibration_danger_line}
          yDomainMax={bodyRobotTrendDomainMax}
          valueLabel="로봇 진동 가속도"
          valueColor="#00d4ff"
          hovered={isBodyRobotChartHovered}
          dragging={isBodyRobotChartDragging}
          onPointerDown={handleBodyRobotChartPointerDown}
          onHoverChange={setIsBodyRobotChartHovered}
        />

        <TrendChart
          title="주파수 피크값 추이"
          unit="mm/s"
          data={visibleBodyFrequencyData}
          warningLine={peakWarningLine}
          dangerLine={peakDangerLine}
          yDomainMax={frequencyPeakTrendDomainMax}
          valueLabel="피크 진동값"
          secondaryValueLabel="피크 RMS"
          valueColor="#22c55e"
          secondaryValueColor="#38bdf8"
          precision={6}
          warningLabelPosition="insideTopLeft"
          dangerLabelPosition="insideTopRight"
          allowDataOverflow
          hovered={isBodyFrequencyChartHovered}
          dragging={isBodyFrequencyChartDragging}
          onPointerDown={handleBodyFrequencyChartPointerDown}
          onHoverChange={setIsBodyFrequencyChartHovered}
        />

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium">주파수 대역별 진동 분포</h4>
          </div>
          <div className="chart-line-reveal select-none">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={frequencyZoneSpectrum} margin={{ top: 5, right: 24, left: 4, bottom: 50 }}>
                <CartesianGrid vertical={false} stroke="#334155" />
                <XAxis
                  dataKey="zone"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  stroke="#64748b"
                  angle={-25}
                  textAnchor="end"
                  dy={10}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  stroke="#64748b"
                  domain={[0, frequencyZoneBarDomainMax]}
                  tickFormatter={(value) => Number(value).toFixed(6)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  hide
                  domain={[0, frequencySpectrumThresholdDomainMax]}
                />
                <Tooltip content={({ payload }) => formatFrequencyZoneTooltip((payload ?? []) as any)} />
                <Bar yAxisId="left" dataKey="max" name="최대" radius={[2, 2, 0, 0]}>
                  {frequencyZoneSpectrum.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry?.color ?? getZoneColorByIndex(index)} />
                  ))}
                </Bar>
                <ReferenceLine
                  yAxisId="right"
                  y={peakWarningLine}
                  stroke="#facc15"
                  strokeDasharray="5 5"
                  ifOverflow="extendDomain"
                  label={{
                    value: `경고 기준 ${peakWarningLine.toFixed(6)}`,
                    position: "insideTopLeft",
                    fill: "#fde68a",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={peakDangerLine}
                  stroke="#f97316"
                  strokeDasharray="5 5"
                  ifOverflow="extendDomain"
                  label={{
                    value: `위험 기준 ${peakDangerLine.toFixed(6)}`,
                    position: "insideTopRight",
                    fill: "#fdba74",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium">주파수 대역별 상세 분석</p>
          <div className="mt-3 space-y-2 text-xs">
            {frequencyZones.map((zone) => {
              const percentage = Math.min(100, (zone.max / 0.005) * 100)
              return (
                <div key={zone.zone} className="mb-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: zone.color }} />
                      {zone.zone} <span className="font-normal text-muted-foreground">({zone.range})</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{zone.description}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-muted-foreground">
                    <span>최대: {zone.max.toFixed(6)}</span>
                    <span>평균: {zone.avg.toFixed(6)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded bg-secondary">
                    <div className="h-full" style={{ width: `${percentage}%`, backgroundColor: zone.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

