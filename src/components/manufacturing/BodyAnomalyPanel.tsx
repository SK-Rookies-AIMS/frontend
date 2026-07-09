import React from "react"
import { AlertTriangle, CheckCircle } from "lucide-react"
import {
  Bar,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
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

function normalizeFrequencyZones(bodyAnalysis: any): ZoneSummary[] {
  const analysis = bodyAnalysis?.frequencyZoneAnalysis
  if (!analysis) return []

  const zones = [
    {
      zone: "Zone 1",
      range: "0~300Hz",
      description: "저주파 / 기본 구조 진동",
      source: analysis.low ?? analysis.zone1,
      color: ZONE_PALETTE[0].color,
    },
    {
      zone: "Zone 2",
      range: "301~600Hz",
      description: "로봇 본체 진동",
      source: analysis.main ?? analysis.zone2,
      color: ZONE_PALETTE[1].color,
    },
    {
      zone: "Zone 3",
      range: "601~900Hz",
      description: "관절·감속기 진동",
      source: analysis.high ?? analysis.zone3,
      color: ZONE_PALETTE[2].color,
    },
    {
      zone: "Zone 4",
      range: "901~1200Hz",
      description: "베어링·기계 이상 진동",
      source: analysis.ultra ?? analysis.zone4,
      color: ZONE_PALETTE[3].color,
    },
    {
      zone: "Zone 5",
      range: "1201~1600Hz",
      description: "고주파 충격·충돌 위험",
      source: analysis.extreme ?? analysis.zone5,
      color: ZONE_PALETTE[4].color,
    },
  ] as const

  return zones
    .filter((entry) => entry.source)
    .map((entry) => ({
      zone: entry.zone,
      range: entry.range,
      description: entry.description,
      avg: Number(entry.source?.avg ?? 0),
      max: Number(entry.source?.max ?? 0),
      color: entry.color,
    }))
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
  labels: { valueLabel: string; secondaryValueLabel?: string; unit: string },
) {
  if (name === "warning_line") return [Number(value).toFixed(3), "경고 기준"]
  if (name === "danger_line") return [Number(value).toFixed(3), "위험 기준"]
  if (labels.secondaryValueLabel && (name === "secondaryValue" || name === labels.secondaryValueLabel)) {
    return [`${Number(value).toFixed(6)} ${labels.unit}`, labels.secondaryValueLabel]
  }
  return [`${Number(value).toFixed(6)} ${labels.unit}`, labels.valueLabel]
}

function TrendChart({
  title,
  subtitle,
  unit,
  data,
  valueLabel,
  secondaryValueLabel,
  valueColor,
  secondaryValueColor,
  hovered,
  dragging,
  onPointerDown,
  onHoverChange,
}: {
  title: string
  subtitle?: string
  unit: string
  data: TrendPoint[]
  valueLabel: string
  secondaryValueLabel?: string
  valueColor: string
  secondaryValueColor?: string
  hovered: boolean
  dragging: boolean
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onHoverChange: (hovered: boolean) => void
}) {
  const maxValue = getMaxFromTrend(data)
  const showSecondary = data.some((row) => row.secondaryValue !== undefined && row.secondaryValue !== null)
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
          <div key={item.label} className="flex items-center gap-1">
            <div
              className={item.dashed ? "h-0.5 w-3 border-t bg-transparent" : "h-0.5 w-3"}
              style={{
                height: 0,
                borderWidth: item.dashed ? 1 : 0,
                borderColor: item.color,
                backgroundColor: item.color,
                borderStyle: item.dashed ? "dashed" : "solid",
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
              domain={[0, maxValue]}
              tick={{ fontSize: 10 }}
              stroke={valueColor}
              tickFormatter={(value) => Number(value).toFixed(3)}
            />
            <Tooltip
              formatter={(value, name) => formatTrendTooltip(Number(value), String(name), { valueLabel, secondaryValueLabel, unit })}
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
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="warning_line"
              stroke="#facc15"
              strokeDasharray="5 5"
              name="warning_line"
              dot={false}
              strokeWidth={1}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="danger_line"
              stroke="#f97316"
              strokeDasharray="5 5"
              name="danger_line"
              dot={false}
              strokeWidth={1}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="value"
              stroke={valueColor}
              name={valueLabel}
              dot={false}
              strokeWidth={2}
            />
            {showSecondary && secondaryValueLabel ? (
              <Line
                isAnimationActive={false}
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
    isBodyChartDragging,
    handleBodyChartPointerDown,
    setIsBodyChartHovered,
    visibleBodyRobotData,
    visibleBodyFrequencyData,
    bodyAnalysis,
  } = dashboard

  const frequencyZones = React.useMemo(() => normalizeFrequencyZones(bodyAnalysis), [bodyAnalysis])
  const frequencySpectrum = bodyAnalysis?.frequencyChart ?? []

  const maxFrequencySpectrumValue = React.useMemo(() => {
    if (!frequencySpectrum.length) return 0.01
    return Math.max(...frequencySpectrum.map((row: any) => Number(row.value ?? 0)), 0.01)
  }, [frequencySpectrum])

  const latestBodyRiskScore = Number(latestBodyData.risk_score ?? 0)
  const robotVibrationScore = Number(latestBodyData.robot_vibration_score ?? 0)
  const frequencyPeakValue = Number(latestBodyData.frequency_peak_value ?? 0)
  const peakWarningLine = Number(latestBodyData.peak_warning_line ?? 0.015)
  const peakDangerLine = Number(latestBodyData.peak_danger_line ?? 0.03)

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
              <li>이상 사유가 존재하지 않습니다.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChart
          title="로봇 진동 가속도 추이"
          unit="g"
          data={visibleBodyRobotData}
          valueLabel="로봇 진동 가속도"
          valueColor="#00d4ff"
          hovered={isBodyChartHovered}
          dragging={isBodyChartDragging}
          onPointerDown={handleBodyChartPointerDown}
          onHoverChange={setIsBodyChartHovered}
        />

        <TrendChart
          title="주파수 피크값 추이"
          unit="mm/s"
          data={visibleBodyFrequencyData}
          valueLabel="피크 진동값"
          secondaryValueLabel="피크 RMS"
          valueColor="#22c55e"
          secondaryValueColor="#38bdf8"
          hovered={isBodyChartHovered}
          dragging={isBodyChartDragging}
          onPointerDown={handleBodyChartPointerDown}
          onHoverChange={setIsBodyChartHovered}
        />

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium">주파수 대역별 진동 분포</h4>
            <p className="text-xs text-muted-foreground">주파수 구간별 실측값만 표시합니다.</p>
          </div>
          <div className="chart-line-reveal select-none">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={frequencySpectrum} margin={{ top: 5, right: 24, left: 4, bottom: 50 }}>
                <CartesianGrid vertical={false} stroke="#334155" />
                <XAxis
                  dataKey="band"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  stroke="#64748b"
                  angle={-45}
                  textAnchor="end"
                  dy={10}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="#64748b" domain={[0, maxFrequencySpectrumValue * 1.2]} />
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value).toFixed(6)}`,
                    name === "value" ? "실측값" : "목표/기준값",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Bar dataKey="value" name="실측값" radius={[2, 2, 0, 0]}>
                  {frequencySpectrum.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={getZoneColorByBand(entry?.band)} />
                  ))}
                </Bar>
                <Line
                  isAnimationActive={false}
                  type="step"
                  dataKey="targetValue"
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  name="목표/기준값"
                  dot={false}
                  strokeWidth={2}
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
