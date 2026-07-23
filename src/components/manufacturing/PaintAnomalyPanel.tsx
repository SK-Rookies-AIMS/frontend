import React from "react"
import { AlertTriangle, CheckCircle } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type PaintStatus = "NORMAL" | "WARNING" | "DANGER"
type MetricType = "surfaceQuality" | "thickness" | "defectScore" | "thermalStdTemp"

type MetricPoint = {
  time: string
  value: number | null
  status: PaintStatus
  visionLabel: string | null
  imagePosition: string | null
  riskScore: number | null
  analysisResultId: number | null
}

type MetricMarker = {
  time: string
  value: number | null
  label: string
  imagePosition: string | null
  status: PaintStatus
  analysisResultId: number | null
}

type MetricChart = {
  title: string
  metricKey: string
  unit: string
  points: MetricPoint[]
  markers: MetricMarker[]
}

type ChartRow = MetricPoint & {
  xIndex: number
  displayTime: string
  markerLabel?: string
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "-"
  const normalized = value.replace("T", " ")
  const matched = normalized.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/)
  return matched ? `${matched[1]} ${matched[2]}` : normalized
}

const formatTick = (xIndex: number, rows: ChartRow[]) => rows[xIndex]?.displayTime?.slice(11, 16) ?? ""

const formatNumber = (value: unknown, digits = 1) => {
  if (value === null || value === undefined || value === "") return "-"
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(digits) : "-"
}

const formatValue = (value: unknown, unit = "", digits = 1) => {
  const formatted = formatNumber(value, digits)
  return formatted === "-" ? "-" : `${formatted}${unit ? ` ${unit}` : ""}`
}

const statusClassName = (status?: string | null) => {
  if (status === "DANGER") return "border-destructive/30 bg-destructive/10 text-destructive"
  if (status === "WARNING") return "border-warning/30 bg-warning/10 text-warning"
  return "border-success/30 bg-success/10 text-success"
}

const statusStroke = (status?: string | null) => {
  if (status === "DANGER") return "#ef4444"
  if (status === "WARNING") return "#f59e0b"
  return "#00d4ff"
}

const renderDot = (props: any) => {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined) return null
  const status = payload?.status
  if (status !== "WARNING" && status !== "DANGER") return null
  return <circle cx={cx} cy={cy} r={4} fill={statusStroke(status)} stroke="var(--background)" strokeWidth={1.5} />
}

function MetricTooltip({ active, payload, unit }: { active?: boolean; payload?: any[]; unit: string }) {
  if (!active || !payload?.length) return null
  const row = payload.find((item) => item?.payload?.time)?.payload as ChartRow | undefined
  if (!row) return null

  return (
    <div className="rounded border border-border bg-card p-3 text-xs shadow">
      <p className="mb-2 font-medium">시간: {formatDateTime(row.time)}</p>
      <div className="space-y-1 text-muted-foreground">
        <p>값: {row.value === null || row.value === undefined ? "측정값 없음" : formatValue(row.value, unit, unit ? 1 : 3)}</p>
        <p>
          상태: <span className={row.status === "DANGER" ? "text-destructive" : row.status === "WARNING" ? "text-warning" : "text-success"}>{row.status ?? "-"}</span>
        </p>
        <p>비전 라벨: {row.visionLabel ?? "-"}</p>
        <p>위치: {row.imagePosition ?? "-"}</p>
        <p>위험도: {row.riskScore === null || row.riskScore === undefined ? "-" : Number(row.riskScore).toFixed(1)}</p>
        <p>분석 ID: {row.analysisResultId ?? "-"}</p>
        {row.markerLabel && <p>마커: {row.markerLabel}</p>}
      </div>
    </div>
  )
}

function MetricLineChart({
  chart,
  thresholds,
  metricType,
}: {
  chart: MetricChart | null | undefined
  thresholds: any
  metricType: MetricType
}) {
  const points = Array.isArray(chart?.points) ? chart.points : []
  const markers = Array.isArray(chart?.markers) ? chart.markers : []
  const chartData: ChartRow[] = points.map((point, index) => ({
    ...point,
    xIndex: index,
    displayTime: formatDateTime(point.time),
  }))
  const markerData: ChartRow[] = markers
    .map((marker, markerIndex) => {
      const matchedIndex = chartData.findIndex((point) =>
        marker.analysisResultId !== null && marker.analysisResultId !== undefined
          ? point.analysisResultId === marker.analysisResultId
          : point.time === marker.time && point.value === marker.value,
      )
      const xIndex = matchedIndex >= 0 ? matchedIndex : Math.min(chartData.length + markerIndex, Math.max(chartData.length - 1, 0))

      return {
        time: marker.time,
        value: marker.value,
        status: marker.status,
        visionLabel: marker.label,
        imagePosition: marker.imagePosition,
        riskScore: null,
        analysisResultId: marker.analysisResultId,
        xIndex,
        displayTime: formatDateTime(marker.time),
        markerLabel: marker.label,
      }
    })
    .filter((marker) => marker.value !== null && marker.value !== undefined)

  const hasData = chartData.length > 0 || markerData.length > 0
  const unit = chart?.unit ?? thresholds?.unit ?? ""
  const yValues = [...chartData, ...markerData]
    .map((row) => row.value)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  const thresholdValues =
    metricType === "surfaceQuality"
      ? [thresholds?.warningBelow, thresholds?.dangerBelow]
      : metricType === "thickness"
        ? [thresholds?.target, thresholds?.normalMin, thresholds?.normalMax, thresholds?.warningMin, thresholds?.warningMax]
        : [thresholds?.warningAbove, thresholds?.dangerAbove]
  const boundedValues = [...yValues, ...thresholdValues].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  )
  const minValue = boundedValues.length ? Math.min(...boundedValues) : 0
  const maxValue = boundedValues.length ? Math.max(...boundedValues) : 1
  const padding = Math.max((maxValue - minValue) * 0.15, metricType === "defectScore" ? 0.05 : 1)
  const yDomain =
    metricType === "surfaceQuality"
      ? [0, 100]
      : metricType === "defectScore" && boundedValues.every((value) => value <= 1)
        ? [0, Math.max(1, maxValue)]
        : [Math.max(0, minValue - padding), maxValue + padding]

  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h5 className="text-sm font-medium">{chart?.title ?? "도장 품질 추이"}</h5>
          <p className="text-[10px] text-muted-foreground">{thresholds ? `${thresholds.label ?? chart?.metricKey ?? ""}${unit ? ` (${unit})` : ""}` : "기준값 없음"}</p>
        </div>
        <span className="shrink-0 rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
          {chartData.length.toLocaleString()} points
        </span>
      </div>

      {!hasData ? (
        <div className="flex h-[220px] items-center justify-center rounded border border-dashed border-border text-sm text-muted-foreground">
          표시할 도장 품질 데이터가 없습니다.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData.length > 0 ? chartData : markerData} margin={{ top: 12, right: 18, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.7} />
            <XAxis
              type="number"
              dataKey="xIndex"
              domain={[0, Math.max(chartData.length, markerData.length) - 1]}
              interval={Math.max(0, Math.floor(Math.max(chartData.length, markerData.length) / 5) - 1)}
              tick={{ fontSize: 10 }}
              stroke="#64748b"
              tickFormatter={(value) => formatTick(Number(value), chartData.length > 0 ? chartData : markerData)}
            />
            <YAxis domain={yDomain as any} tick={{ fontSize: 10 }} stroke="#64748b" />
            {metricType === "surfaceQuality" && thresholds?.warningBelow !== undefined && thresholds.warningBelow !== null && (
              <ReferenceLine y={thresholds.warningBelow} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `경고선 ${thresholds.warningBelow}`, fill: "#f59e0b", fontSize: 10 }} />
            )}
            {metricType === "surfaceQuality" && thresholds?.dangerBelow !== undefined && thresholds.dangerBelow !== null && (
              <ReferenceLine y={thresholds.dangerBelow} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `위험선 ${thresholds.dangerBelow}`, fill: "#ef4444", fontSize: 10 }} />
            )}
            {metricType === "thickness" && thresholds?.normalMin !== undefined && thresholds?.normalMax !== undefined && (
              <ReferenceArea y1={thresholds.normalMin} y2={thresholds.normalMax} fill="#22c55e" fillOpacity={0.09} strokeOpacity={0} />
            )}
            {metricType === "thickness" && thresholds?.target !== undefined && thresholds.target !== null && (
              <ReferenceLine y={thresholds.target} stroke="#00d4ff" strokeDasharray="4 4" label={{ value: `목표 ${thresholds.target}${unit ? ` ${unit}` : ""}`, fill: "#00d4ff", fontSize: 10 }} />
            )}
            {metricType === "thickness" && thresholds?.normalMin !== undefined && thresholds.normalMin !== null && (
              <ReferenceLine y={thresholds.normalMin} stroke="#22c55e" strokeDasharray="3 3" label={{ value: `하한 ${thresholds.normalMin}${unit ? ` ${unit}` : ""}`, fill: "#22c55e", fontSize: 10 }} />
            )}
            {metricType === "thickness" && thresholds?.normalMax !== undefined && thresholds.normalMax !== null && (
              <ReferenceLine y={thresholds.normalMax} stroke="#22c55e" strokeDasharray="3 3" label={{ value: `상한 ${thresholds.normalMax}${unit ? ` ${unit}` : ""}`, fill: "#22c55e", fontSize: 10 }} />
            )}
            {metricType === "thickness" && thresholds?.warningMin !== undefined && thresholds.warningMin !== null && (
              <ReferenceLine y={thresholds.warningMin} stroke="#f59e0b" strokeDasharray="2 5" />
            )}
            {metricType === "thickness" && thresholds?.warningMax !== undefined && thresholds.warningMax !== null && (
              <ReferenceLine y={thresholds.warningMax} stroke="#f59e0b" strokeDasharray="2 5" />
            )}
            {(metricType === "defectScore" || metricType === "thermalStdTemp") && thresholds?.warningAbove !== undefined && thresholds.warningAbove !== null && (
              <ReferenceLine y={thresholds.warningAbove} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `경고 ${thresholds.warningAbove}${unit ? unit : ""}`, fill: "#f59e0b", fontSize: 10 }} />
            )}
            {(metricType === "defectScore" || metricType === "thermalStdTemp") && thresholds?.dangerAbove !== undefined && thresholds.dangerAbove !== null && (
              <ReferenceLine y={thresholds.dangerAbove} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `위험 ${thresholds.dangerAbove}${unit ? unit : ""}`, fill: "#ef4444", fontSize: 10 }} />
            )}
            <Tooltip content={<MetricTooltip unit={unit} />} />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="value"
              stroke="#00d4ff"
              strokeWidth={2}
              dot={renderDot}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
            {metricType === "defectScore" && markerData.length > 0 && (
              <Scatter data={markerData} dataKey="value" fill="#f59e0b" shape="diamond" />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {chartData.length > 0 && (
        <div className="mt-1 text-right text-[10px] font-medium text-foreground">
          {chartData[0]?.displayTime} ~ {chartData[chartData.length - 1]?.displayTime}
        </div>
      )}
    </div>
  )
}

export function PaintAnomalyPanel({ dashboard }: { dashboard: any }) {
  const {
    paintKpis,
    selectedPaintDate,
    setSelectedPaintDate,
    fetchPaintDashboardData,
    isPaintDatesLoading,
    paintDateOptions,
    paintDatesError,
    paintDashboardError,
    isPaintDashboardLoading,
    paintDashboard,
  } = dashboard

  const alert = paintDashboard.alert
  const alertDetail = alert?.detail
  const alertStatus = alertDetail?.status ?? alertDetail?.severity ?? "NORMAL"
  const hasAbnormalAlert = alertDetail && alertStatus !== "NORMAL"
  const StatusIcon = hasAbnormalAlert ? AlertTriangle : CheckCircle

  const paintAlertDetailRows = [
    ["최근 이상 시각", formatDateTime(alertDetail?.time)],
    ["상태", alertStatus],
    ["비전 라벨", alertDetail?.visionLabel],
    ["이미지 위치", alertDetail?.imagePosition],
    ["도막 두께", alertDetail?.thicknessValue !== null && alertDetail?.thicknessValue !== undefined ? `${formatNumber(alertDetail.thicknessValue)} μm` : null],
    ["표면 품질 점수", alertDetail?.surfaceQualityScore !== null && alertDetail?.surfaceQualityScore !== undefined ? `${formatNumber(alertDetail.surfaceQualityScore)} 점` : null],
    ["온도 편차", alertDetail?.thermalStdTemp !== null && alertDetail?.thermalStdTemp !== undefined ? `${formatNumber(alertDetail.thermalStdTemp)} ℃` : null],
    ["불량 점수", alertDetail?.defectScore !== null && alertDetail?.defectScore !== undefined ? formatNumber(alertDetail.defectScore, 3) : null],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "-")

  const kpiCards = [
    { label: "평균 도막 두께", value: formatValue(paintKpis.averageThickness, "μm"), className: "text-foreground" },
    { label: "평균 품질 점수", value: formatValue(paintKpis.averageQuality, "점"), className: "text-success" },
    { label: "불량 감지율", value: formatValue(paintKpis.defectRate, "%"), className: "text-destructive" },
    { label: "평균 온도 편차", value: formatValue(paintKpis.averageThermalStdTemp, "℃"), className: "text-warning" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium">도장 품질 지표별 추이</h4>
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
            {paintDateOptions.length === 0 && <option value="">데이터 없음</option>}
            {paintDateOptions.map((date: string) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </label>
      </div>

      {paintDatesError && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {paintDatesError}
        </div>
      )}
      {paintDashboardError && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {paintDashboardError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.className}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {isPaintDashboardLoading ? (
        <div className="flex h-[220px] items-center justify-center rounded-lg border border-border bg-card/60 text-sm text-muted-foreground">
          도장 대시보드 데이터를 불러오는 중입니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <MetricLineChart
            metricType="surfaceQuality"
            chart={paintDashboard.charts?.surfaceQuality}
            thresholds={paintDashboard.thresholds?.surfaceQualityScore}
          />
          <MetricLineChart
            metricType="thickness"
            chart={paintDashboard.charts?.thickness}
            thresholds={paintDashboard.thresholds?.thicknessValue}
          />
          <MetricLineChart
            metricType="defectScore"
            chart={paintDashboard.charts?.defectScore}
            thresholds={paintDashboard.thresholds?.defectScore}
          />
          <MetricLineChart
            metricType="thermalStdTemp"
            chart={paintDashboard.charts?.thermalStdTemp}
            thresholds={paintDashboard.thresholds?.thermalStdTemp}
          />
        </div>
      )}

      <div className={`rounded-lg border p-4 ${statusClassName(alertStatus)}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            <span className="font-medium">{alert?.title ?? (alertDetail ? "도장 품질 상태" : "도장 품질 정상")}</span>
          </div>
          <span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusClassName(alertStatus)}`}>
            {alertStatus}
          </span>
        </div>

        {alert?.messages?.length ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {alert.messages.map((message: string, index: number) => (
              <li key={`${message}-${index}`}>- {message}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">선택한 기간 내 신규 위험 알람 없음</p>
        )}

        {paintAlertDetailRows.length > 0 && (
          <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-current/15 pt-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {paintAlertDetailRows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="truncate font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}
