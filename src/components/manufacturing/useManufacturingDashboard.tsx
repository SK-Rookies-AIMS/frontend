import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  BOTTLENECK_INITIAL_CURSOR,
  BOTTLENECK_PAGE_SIZE,
  type BottleneckRow,
  fetchBottleneckAnalysis,
} from "@/api/bottleneckApi"
import {
  DEFECT_TRANSFER_INITIAL_CURSOR,
  DEFECT_TRANSFER_PAGE_SIZE,
  type DefectTransferCauseData,
  type DefectTransferCauseRow,
  type DefectTransferPredictionRow,
  fetchDefectTransferCauses,
  fetchDefectTransferPredictions,
} from "@/api/defectTransferApi"
import {
  type PressAnomalyData,
  fetchPressAnomalyAnalysis,
} from "@/api/pressAnomalyApi"
import {
  type BodyAnomalyData,
  fetchBodyAnalysis,
} from "@/api/bodyAnalysisApi"
import {
  getAssemblyDashboard,
  getAssemblyAvailableDates,
  getEquipmentOperationRate,
  getPaintAvailableDates,
  getPaintDashboard,
} from "@/api/processDashboardApi"

"use client"

const processStages = [
  { id: "01", processCode: "PRESS", name: "프레스", rate: null, events: 22, status: "normal", color: "#22c55e" },
  { id: "02", processCode: "BODY", name: "차체", rate: null, events: 22, status: "warning", color: "#f59e0b" },
  { id: "03", processCode: "PAINT", name: "도장", rate: null, events: 22, status: "danger", color: "#ef4444", isBottleneck: true },
  { id: "04", processCode: "ASSEMBLY", name: "의장", rate: null, events: 22, status: "normal", color: "#22c55e" },
  { id: "05", name: "AI 연계 분석", rate: null, defectRate: 78, targetProcess: "도장(L3)", status: "analysis" },
]

const defectPredictionData = [
  { vinId: "VIN-001245", currentProcess: "차체", predictedProcess: "도장 (L3)", probability: 78, stepsAhead: "3단계 후" },
  { vinId: "VIN-001248", currentProcess: "프레스", predictedProcess: "차체 (S12)", probability: 72, stepsAhead: "2단계 후" },
  { vinId: "VIN-001250", currentProcess: "도장", predictedProcess: "조립 (A1)", probability: 69, stepsAhead: "3단계 후" },
  { vinId: "VIN-001253", currentProcess: "차체", predictedProcess: "도장 (L3)", probability: 61, stepsAhead: "3단계 후" },
  { vinId: "VIN-001255", currentProcess: "프레스", predictedProcess: "차체 (S12)", probability: 58, stepsAhead: "2단계 후" },
]

const aiAnalysisFactors = [
  { name: "S2 Station 압력 지연 +12초", impact: 0.38 },
  { name: "L3 온도 상승 +7°C", impact: 0.24 },
  { name: "프레스 공정 Cycle Time 증가", impact: 0.19 },
  { name: "고객 불량 신고 34건 존재", impact: 0.11 },
  { name: "로봇 통신 지연(3ms)", impact: 0.08 },
]

// 諛깆뿏???곕룞 ??press_analysis_result ?뺥깭瑜?諛섏쁺??理쒖떊 5遺?湲곗? 紐??곗씠??
const latestPressAnchorData = [
  { time: "12:30", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 11.9, cycle_time_gap_sec: -0.1, timestamp_delay_sec: 0.2, risk_score: 16, overall_risk_score: 20 },
  { time: "12:35", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.0, cycle_time_gap_sec: 0.0, timestamp_delay_sec: 0.3, risk_score: 18, overall_risk_score: 22 },
  { time: "12:40", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.2, cycle_time_gap_sec: 0.2, timestamp_delay_sec: 0.5, risk_score: 24, overall_risk_score: 26 },
  { time: "12:45", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 11.8, cycle_time_gap_sec: -0.2, timestamp_delay_sec: 0.2, risk_score: 17, overall_risk_score: 21 },
  { time: "12:50", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.3, cycle_time_gap_sec: 0.3, timestamp_delay_sec: 0.6, risk_score: 27, overall_risk_score: 29 },
  { time: "12:55", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.1, cycle_time_gap_sec: 0.1, timestamp_delay_sec: 0.4, risk_score: 22, overall_risk_score: 25 },
  { time: "13:00", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.4, cycle_time_gap_sec: 0.4, timestamp_delay_sec: 0.7, risk_score: 30, overall_risk_score: 32 },
  { time: "13:05", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.2, cycle_time_gap_sec: 0.2, timestamp_delay_sec: 0.5, risk_score: 26, overall_risk_score: 29 },
  { time: "13:10", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.6, cycle_time_gap_sec: 0.6, timestamp_delay_sec: 0.9, risk_score: 35, overall_risk_score: 36 },
  { time: "13:15", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.3, cycle_time_gap_sec: 0.3, timestamp_delay_sec: 0.6, risk_score: 28, overall_risk_score: 31 },
  { time: "13:20", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.7, cycle_time_gap_sec: 0.7, timestamp_delay_sec: 1.1, risk_score: 38, overall_risk_score: 39 },
  { time: "13:25", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.2, cycle_time_gap_sec: 0.2, timestamp_delay_sec: 0.5, risk_score: 25, overall_risk_score: 28 },
  { time: "13:30", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 11.8, cycle_time_gap_sec: -0.2, timestamp_delay_sec: 0.3, risk_score: 18, overall_risk_score: 24 },
  { time: "13:35", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.1, cycle_time_gap_sec: 0.1, timestamp_delay_sec: 0.4, risk_score: 23, overall_risk_score: 27 },
  { time: "13:40", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.4, cycle_time_gap_sec: 0.4, timestamp_delay_sec: 0.8, risk_score: 31, overall_risk_score: 33 },
  { time: "13:45", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 13.2, cycle_time_gap_sec: 1.2, timestamp_delay_sec: 1.6, risk_score: 47, overall_risk_score: 45 },
  { time: "13:50", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 14.7, cycle_time_gap_sec: 2.7, timestamp_delay_sec: 3.4, risk_score: 68, overall_risk_score: 61 },
  { time: "13:55", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 13.8, cycle_time_gap_sec: 1.8, timestamp_delay_sec: 2.1, risk_score: 59, overall_risk_score: 55 },
  { time: "14:00", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 15.6, cycle_time_gap_sec: 3.6, timestamp_delay_sec: 5.8, risk_score: 86, overall_risk_score: 79 },
  { time: "14:05", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 14.2, cycle_time_gap_sec: 2.2, timestamp_delay_sec: 4.1, risk_score: 74, overall_risk_score: 70 },
  { time: "14:10", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 12.9, cycle_time_gap_sec: 0.9, timestamp_delay_sec: 1.2, risk_score: 42, overall_risk_score: 43 },
  { time: "14:15", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 13.4, cycle_time_gap_sec: 1.4, timestamp_delay_sec: 2.7, risk_score: 57, overall_risk_score: 54 },
  { time: "14:20", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 14.8, cycle_time_gap_sec: 2.8, timestamp_delay_sec: 4.6, risk_score: 78, overall_risk_score: 74 },
  { time: "14:25", target_cycle_time_sec: 12.0, actual_cycle_time_sec: 14.6, cycle_time_gap_sec: 2.6, timestamp_delay_sec: 4.2, risk_score: 78, overall_risk_score: 74 },
]

type PressAnchor = (typeof latestPressAnchorData)[number] & {
  dateTime: string
  timestamp: number
}

const formatDateTime = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`

const formatChartTick = (dateTime: string) => dateTime.slice(11, 16)
const formatBackendTimestamp = (timestamp: string) => {
  const normalized = timestamp.replace("T", " ")
  const matched = normalized.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/)
  if (matched) return `${matched[1]} ${matched[2]}`
  // 珥덇? ?녿뒗 寃쎌슦 HH:mm源뚯?留?異붿텧
  const matchedShort = normalized.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  return matchedShort ? `${matchedShort[1]} ${matchedShort[2]}` : normalized
}

const formatDelayTime = (seconds: number): string => {
  if (seconds >= 3600) {
    const hours = seconds / 3600
    return `${Number(hours.toFixed(1))}시간`
  }
  if (seconds >= 60) {
    const minutes = seconds / 60
    return `${Number(minutes.toFixed(1))}분`
  }
  return `${Number(seconds.toFixed(1))}초`
}

// ?쒕옒洹????꾨궇 ?곗씠?곌퉴吏 議고쉶?????덈룄濡??댁쟾 24?쒓컙??5遺?湲곗?媛믪쓣 留뚮뱺??
const historicalPressAnchorData: PressAnchor[] = Array.from({ length: 288 }, (_, index) => {
  const date = new Date(2026, 5, 17, 12, 30 + index * 5)
  const wave = Math.sin(index / 12)
  const actualCycleTime = Number((12.1 + wave * 0.45 + (index % 37 === 0 ? 1.1 : 0)).toFixed(1))
  const timestampDelay = Number(Math.max(0.2, 0.6 + Math.cos(index / 9) * 0.35 + (index % 53 === 0 ? 1.5 : 0)).toFixed(1))
  const riskScore = Math.round(Math.min(69, Math.max(14, 24 + Math.abs(wave) * 20 + timestampDelay * 4)))

  return {
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
    dateTime: formatDateTime(date),
    timestamp: date.getTime(),
    target_cycle_time_sec: 12,
    actual_cycle_time_sec: actualCycleTime,
    cycle_time_gap_sec: Number((actualCycleTime - 12).toFixed(1)),
    timestamp_delay_sec: timestampDelay,
    risk_score: riskScore,
    overall_risk_score: Math.max(18, riskScore - 4),
  }
})

const datedLatestPressAnchorData: PressAnchor[] = latestPressAnchorData.map((item) => {
  const [hour, minute] = item.time.split(":").map(Number)
  const date = new Date(2026, 5, 18, hour, minute)

  return {
    ...item,
    dateTime: formatDateTime(date),
    timestamp: date.getTime(),
  }
})

const pressAnchorData = [...historicalPressAnchorData, ...datedLatestPressAnchorData]

type PressDataPoint = PressAnchor & {
  logNo?: string | null
  isAbnormal?: boolean
  severity?: string
  countIncreaseYn?: boolean
  warning_cycle_time_gap_sec?: number
  danger_cycle_time_gap_sec?: number
}

// Press mock data removed; rely on backend `pressAnalysis` when available
const pressData: PressDataPoint[] = []

const latestPressData: PressDataPoint =
  pressData.length > 0
    ? pressData[pressData.length - 1]
    : {
        time: "",
        dateTime: "",
        timestamp: 0,
        target_cycle_time_sec: 0,
        actual_cycle_time_sec: 0,
        cycle_time_gap_sec: 0,
        timestamp_delay_sec: 0,
        risk_score: 0,
        overall_risk_score: 0,
      }

const getRiskSeverity = (score: number) => {
  if (score >= 70) return { label: "위험", className: "text-destructive" }
  if (score >= 50) return { label: "경고", className: "text-warning" }
  if (score >= 30) return { label: "주의", className: "text-warning" }
  return { label: "정상", className: "text-success" }
}

const latestOverallRisk = getRiskSeverity(latestPressData.overall_risk_score)
const pressAvailableDates = Array.from(
  new Set(pressData.map((item) => item.dateTime.slice(0, 10))),
).reverse()

// No local mock body data; rely on backend `bodyAnalysis` when available
const bodyRobotData: any[] = []

const latestBodyData =
  bodyRobotData.length > 0
    ? bodyRobotData[bodyRobotData.length - 1]
    : {
        dateTime: "",
        robot_motion_status: "NORMAL",
        robot_operation_mode: "AUTO",
        robot_vibration_score: 0,
        frequency_peak_band: "LOW",
        frequency_peak_value: 0,
        band_low: 0,
        band_mid: 0,
        band_high: 0,
        risk_score: 0,
      }
const latestBodySeverity = getRiskSeverity(latestBodyData.risk_score)
const BODY_CHART_WINDOW_SIZE = 31
const PRESS_CHART_WINDOW_SIZE = 31
const bodyAvailableDates = Array.from(new Set(bodyRobotData.map((item) => item.dateTime.slice(0, 10)))).reverse()

type PaintChartDatum = {
  eventTime: string
  time: string
  dateTime: string
  timestamp: number
  defectScore: number
  defectScoreScaled: number
  surfaceQualityScore: number
  thicknessValue: number
  riskScore: number
  imagePosition?: string
  visionLabel?: string
  thermalStdTemp?: number
  severity?: string
}

type PaintStatus = "NORMAL" | "WARNING" | "DANGER"

type ThresholdDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER" | "IN_RANGE_IS_BETTER"

type SurfaceQualityThreshold = {
  label: string
  unit: string
  direction: "HIGHER_IS_BETTER"
  warningBelow?: number | null
  dangerBelow?: number | null
}

type ThicknessThreshold = {
  label: string
  unit: string
  direction: "IN_RANGE_IS_BETTER"
  target?: number | null
  normalMin?: number | null
  normalMax?: number | null
  warningMin?: number | null
  warningMax?: number | null
}

type UpperLimitThreshold = {
  label: string
  unit: string
  direction: "LOWER_IS_BETTER"
  warningAbove?: number | null
  dangerAbove?: number | null
}

type PaintDashboardThresholds = {
  surfaceQualityScore?: SurfaceQualityThreshold | null
  thicknessValue?: ThicknessThreshold | null
  defectScore?: UpperLimitThreshold | null
  thermalStdTemp?: UpperLimitThreshold | null
}

type PaintMetricPoint = {
  time: string
  value: number | null
  status: PaintStatus
  visionLabel: string | null
  imagePosition: string | null
  riskScore: number | null
  analysisResultId: number | null
}

type PaintMetricMarker = {
  time: string
  value: number | null
  label: string
  imagePosition: string | null
  status: PaintStatus
  analysisResultId: number | null
}

type PaintMetricChart = {
  title: string
  metricKey: string
  unit: string
  points: PaintMetricPoint[]
  markers: PaintMetricMarker[]
}

type PaintDashboardCharts = {
  surfaceQuality?: PaintMetricChart | null
  thickness?: PaintMetricChart | null
  defectScore?: PaintMetricChart | null
  thermalStdTemp?: PaintMetricChart | null
}

type PaintAlertDetail = {
  time?: string | null
  visionLabel?: string | null
  imagePosition?: string | null
  thicknessValue?: number | null
  surfaceQualityScore?: number | null
  defectScore?: number | null
  thermalStdTemp?: number | null
  riskScore?: number | null
  status?: PaintStatus | null
  severity?: string | null
}

type PaintDashboardData = {
  selectedDate: string | null
  from?: string | null
  to?: string | null
  chartStartAt?: string | null
  chartEndAt?: string | null
  summary: {
    analysisCount: number
    averageThicknessValue: number | null
    defectRate: number | null
    averageSurfaceQualityScore: number | null
    alertCount: number
    averageThermalStdTemp: number | null
  }
  thresholds: PaintDashboardThresholds
  charts: PaintDashboardCharts
  alert: {
    title: string
    messages: string[]
    detail?: PaintAlertDetail | null
  } | null
}

type AssemblyVehicleRow = {
  carMasterId?: number
  carDisplayId: string
  expectedSequence: string | null
  actualSequence: string | null
  sequenceErrorCount: number
  missingPartCount: number
  fasteningErrorCount: number
  riskScore: number
  severity: string
  status: string
  time?: string
}

type AssemblyFilter = "all" | "abnormal" | "sequence" | "fastening" | "missing"

type AssemblyDashboardData = {
  selectedDate: string | null
  summary: {
    vehicleCount: number
    sequenceErrorCount: number
    missingPartCount: number
    fasteningErrorCount: number
    averageRiskScore: number
  }
  vehicles: AssemblyVehicleRow[]
  alert: {
    title: string
    messages: string[]
  } | null
}

type AvailableDatesData = {
  dates: string[]
  latestDate: string | null
}

type EquipmentOperationRateItem = {
  processCode: "PRESS" | "BODY" | "PAINT" | "ASSEMBLY" | string
  processName?: string
  operationRate?: number
}

type EquipmentOperationRateData = {
  items?: EquipmentOperationRateItem[]
}

type EquipmentOperationRateStatus = "idle" | "loading" | "success" | "error"

const emptyPaintDashboard: PaintDashboardData = {
  selectedDate: null,
  summary: {
    analysisCount: 0,
    averageThicknessValue: 0,
    defectRate: 0,
    averageSurfaceQualityScore: 0,
    alertCount: 0,
    averageThermalStdTemp: 0,
  },
  thresholds: {},
  charts: {},
  alert: null,
}

const emptyAssemblyDashboard: AssemblyDashboardData = {
  selectedDate: null,
  summary: {
    vehicleCount: 0,
    sequenceErrorCount: 0,
    missingPartCount: 0,
    fasteningErrorCount: 0,
    averageRiskScore: 0,
  },
  vehicles: [],
  alert: null,
}

const ASSEMBLY_TABLE_PAGE_SIZE = 12

const formatApiTime = (value: string) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(11, 16) || value
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
}

const getBottleneckRowKey = (row: BottleneckRow) =>
  [
    row.rankNo,
    row.processCode,
    row.delayTime,
    row.affectedVehicleCount,
    row.riskScore,
  ].join("|")

export function PaintTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ payload: PaintChartDatum }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  const row = payload[0].payload

  return (
    <div className="rounded border border-border bg-card p-3 text-xs shadow">
      <p className="mb-2 font-medium">{label}</p>
      <div className="space-y-1 text-muted-foreground">
        <p>event_time: {row.eventTime}</p>
        <p>遺덈웾 ?먯닔: {row.defectScore.toFixed(2)}{row.defectScore <= 1 ? ` (?쒖떆 ${row.defectScoreScaled.toFixed(1)})` : ""}</p>
        <p>?쒕㈃ ?덉쭏 ?먯닔: {row.surfaceQualityScore.toFixed(1)}</p>
        <p>?꾩옣 ?먭퍡: {row.thicknessValue.toFixed(1)}</p>
        <p>?꾪뿕?? {row.riskScore.toFixed(1)}</p>
        {row.visionLabel && <p>vision_label: {row.visionLabel}</p>}
        {row.imagePosition && <p>image_position: {row.imagePosition}</p>}
        {row.thermalStdTemp !== undefined && <p>thermal_std_temp: {row.thermalStdTemp.toFixed(1)}</p>}
        {row.severity && <p>severity: {row.severity}</p>}
      </div>
    </div>
  )
}

function formatSequence(sequence?: string | null) {
  if (typeof sequence !== "string" || sequence.trim() === "") {
    return "-"
  }

  return sequence
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" > ")
}

function getAssemblyStatus(severity: string, isAbnormal: boolean, status?: string) {
  if (status) return status
  if (!isAbnormal) return "?뺤긽"
  if (severity === "CRITICAL") return "?꾪뿕"
  if (severity === "WARNING") return "寃쎄퀬"
  return "?댁긽"
}

function getStatusBadgeClass(severity: string, isAbnormal: boolean, status?: string, riskScore = 0) {
  if (status === "?꾪뿕" || severity === "CRITICAL" || riskScore >= 80) return "bg-destructive/20 text-destructive"
  if (status === "寃쎄퀬" || severity === "WARNING" || riskScore >= 50) return "bg-warning/20 text-warning"
  if (!isAbnormal) return "bg-success/20 text-success"
  return "bg-destructive/20 text-destructive"
}

function getRiskTextClass(riskScore: number) {
  if (riskScore >= 80) return "text-destructive"
  if (riskScore >= 50) return "text-warning"
  return "text-success"
}

function getAssemblyVehicleKey(row: AssemblyVehicleRow, index = 0) {
  const stableParts = [row.carMasterId, row.carDisplayId, row.time].filter(
    (value) => value !== undefined && value !== null && value !== "",
  )
  return stableParts.length > 0 ? stableParts.join("-") : `assembly-row-${index}`
}

function getAssemblySeverityRank(row: AssemblyVehicleRow) {
  const status = `${row.severity ?? ""} ${row.status ?? ""}`.toUpperCase()
  if (status.includes("DANGER") || status.includes("CRITICAL") || status.includes("?꾪뿕")) return 2
  if (status.includes("WARNING") || status.includes("二쇱쓽") || status.includes("寃쎄퀬")) return 1
  return 0
}

function getAssemblyErrorTotal(row: AssemblyVehicleRow) {
  return (row.sequenceErrorCount ?? 0) + (row.missingPartCount ?? 0) + (row.fasteningErrorCount ?? 0)
}

function isAssemblyAbnormal(row: AssemblyVehicleRow) {
  return getAssemblySeverityRank(row) > 0 || getAssemblyErrorTotal(row) > 0 || (row.riskScore ?? 0) > 0
}

function formatProbability(value: number) {
  const percent = value <= 1 ? value * 100 : value
  return `${percent.toFixed(2)}%`
}

function toPercentValue(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return value <= 1 ? value * 100 : value
}

function getDefectRiskTextClass(riskLevel: string, probability?: number) {
  const normalizedRisk = riskLevel.toUpperCase()
  const percent = probability === undefined ? 0 : probability <= 1 ? probability * 100 : probability

  if (normalizedRisk.includes("CRITICAL") || normalizedRisk.includes("HIGH") || percent >= 70) return "text-destructive"
  if (normalizedRisk.includes("WARNING") || normalizedRisk.includes("MEDIUM") || percent >= 50) return "text-warning"
  return "text-success"
}

function normalizeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function isWarningSeverity(severity: string | null | undefined) {
  return severity === "WARNING" || severity === "CRITICAL"
}

function severityToRiskSeverity(severity: string | null | undefined, riskScore: number) {
  if (severity === "CRITICAL") return { label: "위험", className: "text-destructive" }
  if (severity === "WARNING") return { label: "경고", className: "text-warning" }
  if (severity === "NORMAL") return { label: "정상", className: "text-success" }
  return getRiskSeverity(riskScore)
}

function toPressDataPoint(point: NonNullable<PressAnomalyData["chart"]>[number]): PressDataPoint {
  // timestamp瑜?濡쒖뺄 Date濡??뚯떛?섏? ?딄퀬 諛깆뿏??臾몄옄?댁쓣 洹몃?濡??ъ슜???쒓컙? 李⑥씠瑜?諛⑹?
  const dateTime = formatBackendTimestamp(point.timestamp)
  // dateTime??"YYYY-MM-DD HH:mm:ss" ?뺤떇?대?濡?getTime???꾪븳 Date ?뚯떛? ISO ?뺤떇 ?좎?
  const isoForParsing = point.timestamp.includes("T") ? point.timestamp : point.timestamp.replace(" ", "T")
  const date = new Date(isoForParsing)
  const epochMs = Number.isFinite(date.getTime()) ? date.getTime() : NaN

  return {
    // time ?꾨뱶: HH:mm:ss源뚯? ?쒖떆??諛깆뿏??timestamp? ?쇱튂
    time: dateTime.slice(11, 19),
    dateTime,
    timestamp: epochMs,
    target_cycle_time_sec: normalizeNumber(point.targetCycleTimeSec),
    actual_cycle_time_sec: normalizeNumber(point.actualCycleTimeSec),
    cycle_time_gap_sec: normalizeNumber(
      point.cycleTimeGapSec ?? (point.actualCycleTimeSec !== undefined && point.targetCycleTimeSec !== undefined
        ? Number(point.actualCycleTimeSec ?? 0) - Number(point.targetCycleTimeSec ?? 0)
        : 0),
    ),
    warning_cycle_time_gap_sec: normalizeNumber(point.warningCycleTimeGapSec),
    danger_cycle_time_gap_sec: normalizeNumber(point.dangerCycleTimeGapSec),
    timestamp_delay_sec: normalizeNumber(point.timestampDelaySec ?? point.cycleTimeGapSec ?? 0),
    risk_score: normalizeNumber(point.riskScore ?? 0),
    overall_risk_score: normalizeNumber(point.riskScore ?? 0),
    logNo: point.logNo ?? null,
    isAbnormal: Boolean(point.isAbnormal) || isWarningSeverity(point.severity),
    severity: point.severity ?? "NORMAL",
    countIncreaseYn: point.countIncreaseYn,
  }
}



export function useManufacturingDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState("press")
  const [selectedVehicle, setSelectedVehicle] = useState("")
  const [selectedBottleneckDate, setSelectedBottleneckDate] = useState<string | null>(null)
  const [selectedDefectPredictionDate, setSelectedDefectPredictionDate] = useState<string | null>(null)
  const [selectedDefectCauseDate, setSelectedDefectCauseDate] = useState<string | null>(null)
  const [bottleneckRows, setBottleneckRows] = useState<BottleneckRow[]>([])
  const [mostBottleneckProcess, setMostBottleneckProcess] = useState<string | null>(null)
  const [mostBottleneckRiskLevel, setMostBottleneckRiskLevel] = useState<string | null>(null)
  const [bottleneckCursor, setBottleneckCursor] = useState<number | null>(BOTTLENECK_INITIAL_CURSOR)
  const [hasNextBottleneck, setHasNextBottleneck] = useState(true)
  const [isBottleneckLoading, setIsBottleneckLoading] = useState(false)
  const [bottleneckError, setBottleneckError] = useState<string | null>(null)
  const [bottleneckDateOptions, setBottleneckDateOptions] = useState<string[]>([])
  const requestedBottleneckCursorsRef = useRef<Set<number>>(new Set())
  const hasNextBottleneckRef = useRef(true)
  const isBottleneckLoadingRef = useRef(false)
  const bottleneckRequestSeqRef = useRef(0)
  const activeBottleneckDateRef = useRef<string | null>(null)
  const bottleneckScrollRef = useRef<HTMLDivElement | null>(null)
  const [defectPredictionRows, setDefectPredictionRows] = useState<DefectTransferPredictionRow[]>([])
  const defectPredictionVehicleOptions = defectPredictionRows.filter(
    (row, index, rows) => rows.findIndex((item) => item.vehicleId === row.vehicleId) === index,
  )
  const [defectPredictionCursor, setDefectPredictionCursor] = useState<number | null>(DEFECT_TRANSFER_INITIAL_CURSOR)
  const [hasNextDefectPrediction, setHasNextDefectPrediction] = useState(true)
  const [isDefectPredictionLoading, setIsDefectPredictionLoading] = useState(false)
  const [defectPredictionError, setDefectPredictionError] = useState<string | null>(null)
  const [defectPredictionDateOptions, setDefectPredictionDateOptions] = useState<string[]>([])
  const requestedDefectPredictionCursorsRef = useRef<Set<number>>(new Set())
  const hasNextDefectPredictionRef = useRef(true)
  const isDefectPredictionLoadingRef = useRef(false)
  const defectPredictionRequestSeqRef = useRef(0)
  const activeDefectPredictionDateRef = useRef<string | null>(null)
  const defectPredictionScrollRef = useRef<HTMLDivElement | null>(null)
  const [defectCauseSummary, setDefectCauseSummary] = useState<DefectTransferCauseData | null>(null)
  const [defectCauseRows, setDefectCauseRows] = useState<DefectTransferCauseRow[]>([])
  const [defectCauseCursor, setDefectCauseCursor] = useState<number | null>(DEFECT_TRANSFER_INITIAL_CURSOR)
  const [hasNextDefectCause, setHasNextDefectCause] = useState(true)
  const [isDefectCauseLoading, setIsDefectCauseLoading] = useState(false)
  const [defectCauseError, setDefectCauseError] = useState<string | null>(null)
  const [defectCauseDateOptions, setDefectCauseDateOptions] = useState<string[]>([])
  const requestedDefectCauseCursorsRef = useRef<Set<number>>(new Set())
  const hasNextDefectCauseRef = useRef(true)
  const isDefectCauseLoadingRef = useRef(false)
  const defectCauseRequestSeqRef = useRef(0)
  const activeDefectCauseRequestKeyRef = useRef<string>("__default__::__latest__")
  const defectCauseScrollRef = useRef<HTMLDivElement | null>(null)
  const initializedDefectCauseVehicleRef = useRef<string | null>(null)
  const [isPressChartHovered, setIsPressChartHovered] = useState(false)
  const [pressChartStartIndex, setPressChartStartIndex] = useState(0)
  const [isPressChartDragging, setIsPressChartDragging] = useState(false)
  const pressChartDragRef = useRef<{
    pointerId: number
    startX: number
    startIndex: number
    width: number
  } | null>(null)
  const [bodyRobotChartStartIndex, setBodyRobotChartStartIndex] = useState(0)
  const [bodyFrequencyChartStartIndex, setBodyFrequencyChartStartIndex] = useState(0)
  const [isBodyRobotChartDragging, setIsBodyRobotChartDragging] = useState(false)
  const [isBodyFrequencyChartDragging, setIsBodyFrequencyChartDragging] = useState(false)
  const [isBodyChartHovered, setIsBodyChartHovered] = useState(false)
  const bodyRobotChartDragRef = useRef<{
    pointerId: number
    startX: number
    startIndex: number
    width: number
  } | null>(null)
  const bodyFrequencyChartDragRef = useRef<{
    pointerId: number
    startX: number
    startIndex: number
    width: number
  } | null>(null)
  const [selectedPaintDate, setSelectedPaintDate] = useState("")
  const [selectedAssemblyDate, setSelectedAssemblyDate] = useState("")
  const [selectedAssemblyVehicleKey, setSelectedAssemblyVehicleKey] = useState<string | null>(null)
  const [assemblyFilter, setAssemblyFilterState] = useState<AssemblyFilter>("all")
  const [paintAvailableDates, setPaintAvailableDates] = useState<string[]>([])
  const [assemblyAvailableDates, setAssemblyAvailableDates] = useState<string[]>([])
  const [assemblyPage, setAssemblyPage] = useState(1)
  const [paintDashboard, setPaintDashboard] = useState<PaintDashboardData>(emptyPaintDashboard)
  const [assemblyDashboard, setAssemblyDashboard] = useState<AssemblyDashboardData>(emptyAssemblyDashboard)
  const [isPaintDashboardLoading, setIsPaintDashboardLoading] = useState(false)
  const [isAssemblyDashboardLoading, setIsAssemblyDashboardLoading] = useState(false)
  const [isPaintDatesLoading, setIsPaintDatesLoading] = useState(false)
  const [isAssemblyDatesLoading, setIsAssemblyDatesLoading] = useState(false)
  const [paintDashboardError, setPaintDashboardError] = useState<string | null>(null)
  const [assemblyDashboardError, setAssemblyDashboardError] = useState<string | null>(null)
  const [paintDatesError, setPaintDatesError] = useState<string | null>(null)
  const [assemblyDatesError, setAssemblyDatesError] = useState<string | null>(null)
  const [operationRateByProcess, setOperationRateByProcess] = useState<Record<string, EquipmentOperationRateItem>>({})
  const [operationRateStatus, setOperationRateStatus] = useState<EquipmentOperationRateStatus>("idle")

  const getLatestChartStartIndex = (length: number, windowSize: number) => Math.max(0, length - windowSize)

  const [pressAnalysis, setPressAnalysis] = useState<PressAnomalyData | null>(null)
  const [selectedPressAnalysisDate, setSelectedPressAnalysisDate] = useState<string | null>(null)
  const [isPressAnalysisLoading, setIsPressAnalysisLoading] = useState(false)
  const [pressAnalysisError, setPressAnalysisError] = useState<string | null>(null)

  const apiPressData = (pressAnalysis?.charts?.cycleTime?.points ?? pressAnalysis?.chart ?? [])
    .map(toPressDataPoint)
    .filter((point) => Number.isFinite(point.timestamp)) ?? []
  const rawPressDisplayData = pressAnalysis ? apiPressData : pressData

  type PressRiskTrendRow = {
    eventId?: string
    analysisId?: string
    logNo?: string | null
    time: string
    dateTime: string
    timestamp: number
    value: number
    markerLevel: number
    severity: string
    countNormalValue: number
    countIncreaseYn: boolean
    isAbnormal: boolean
  }

  const pressRiskTrendData = useMemo<PressRiskTrendRow[]>(() => {
    const points = pressAnalysis?.charts?.cycleTime?.points ?? pressAnalysis?.chart ?? []
    return points.map((point: any) => {
      const dateTime = formatBackendTimestamp(point.timestamp)
      const isoForParsing = point.timestamp.includes("T") ? point.timestamp : point.timestamp.replace(" ", "T")
      const date = new Date(isoForParsing)
      const epochMs = Number.isFinite(date.getTime()) ? date.getTime() : NaN

      return {
        eventId: point.eventId,
        analysisId: point.analysisId,
        logNo: point.logNo ?? null,
        time: dateTime.slice(11, 19),
        dateTime,
        timestamp: epochMs,
        value: 1,
        markerLevel: isWarningSeverity(point.severity) ? 2 : 1,
        severity: point.severity ?? "NORMAL",
        countNormalValue: point.countIncreaseYn ? 100 : 0,
        countIncreaseYn: Boolean(point.countIncreaseYn),
        isAbnormal: Boolean(point.isAbnormal) || isWarningSeverity(point.severity) || !point.countIncreaseYn,
      }
    })
  }, [pressAnalysis])

  const latestPressDisplayData = pressAnalysis?.metrics
    ? {
        ...latestPressData,
        target_cycle_time_sec: normalizeNumber(pressAnalysis.metrics.targetCycleTimeSec),
        actual_cycle_time_sec: normalizeNumber(pressAnalysis.metrics.actualCycleTimeSec),
        cycle_time_gap_sec: normalizeNumber(pressAnalysis.metrics.cycleTimeGapSec),
        warning_cycle_time_gap_sec: normalizeNumber(pressAnalysis.metrics.warningCycleTimeGapSec),
        danger_cycle_time_gap_sec: normalizeNumber(pressAnalysis.metrics.dangerCycleTimeGapSec),
        timestamp_delay_sec: normalizeNumber(pressAnalysis.metrics.timestampDelaySec),
        risk_score: normalizeNumber(pressAnalysis.metrics.riskScore),
        overall_risk_score: normalizeNumber(pressAnalysis.metrics.riskScore),
      }
    : latestPressData

  const latestPressDisplayRisk = severityToRiskSeverity(
    pressAnalysis?.metrics?.severity,
    latestPressDisplayData.overall_risk_score,
  )

  const pressDisplayAvailableDates = (() => {
    const dates = pressAnalysis?.dateOptions?.length
      ? pressAnalysis.dateOptions.map((opt) => opt.date)
      : Array.from(
          new Set(rawPressDisplayData.map((item) => item.dateTime.slice(0, 10))),
        ).reverse()
    if (pressAnalysis?.date && !dates.includes(pressAnalysis.date)) {
      return [pressAnalysis.date, ...dates]
    }
    return dates
  })()

  const selectedPressDate =
    selectedPressAnalysisDate ??
    pressAnalysis?.date ??
    rawPressDisplayData[Math.floor(rawPressDisplayData.length / 2)]?.dateTime.slice(0, 10) ??
    pressDisplayAvailableDates[0]

  const pressDisplayData = rawPressDisplayData
  const visiblePressRiskData = pressRiskTrendData.slice(
    pressChartStartIndex,
    pressChartStartIndex + PRESS_CHART_WINDOW_SIZE,
  )

  const visiblePressData = pressDisplayData.slice(
    pressChartStartIndex,
    pressChartStartIndex + PRESS_CHART_WINDOW_SIZE,
  )

  const handlePressDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPressAnalysisDate(event.target.value)
    setPressChartStartIndex(getLatestChartStartIndex(pressDisplayData.length, PRESS_CHART_WINDOW_SIZE))
  }

  const handlePressChartPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pressDisplayData.length <= PRESS_CHART_WINDOW_SIZE) return

    event.preventDefault()
    pressChartDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startIndex: pressChartStartIndex,
      width: event.currentTarget.getBoundingClientRect().width,
    }
    setIsPressChartDragging(true)
  }

  const isFetchingRef = useRef(false)
  const fetchPressAnalysis = useCallback(async (date?: string | null) => {
    isFetchingRef.current = true
    setIsPressAnalysisLoading(true)
    setPressAnalysisError(null)

    try {
      const result = await fetchPressAnomalyAnalysis({
        date,
      })
      setPressAnalysis(result)
      setPressChartStartIndex(getLatestChartStartIndex(result.chart?.length ?? 0, PRESS_CHART_WINDOW_SIZE))
    } catch (error) {
      setPressAnalysisError(error instanceof Error ? error.message : "?꾨젅???댁긽 ?먯? ?곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??")
    } finally {
      setIsPressAnalysisLoading(false)
      isFetchingRef.current = false
    }
  }, [])
  // Body analysis (remote) state and mapping
  const [bodyAnalysis, setBodyAnalysis] = useState<BodyAnomalyData | null>(null)
  const [selectedBodyAnalysisDate, setSelectedBodyAnalysisDate] = useState<string | null>(null)
  const [isBodyAnalysisLoading, setIsBodyAnalysisLoading] = useState(false)
  const [bodyAnalysisError, setBodyAnalysisError] = useState<string | null>(null)

  type BodyTrendRow = {
    logNo?: string | null
    time: string
    dateTime: string
    timestamp: number
    value: number
    secondaryValue?: number
    warning_line: number
    danger_line: number
    risk_score: number
    isAbnormal: boolean
    severity: string
  }

  const bodyRobotTrendData = useMemo<BodyTrendRow[]>(() => {
    const points = bodyAnalysis?.charts?.robotVibration?.points ?? bodyAnalysis?.chart ?? []
    return points.map((point: any) => {
      const dateTime = formatBackendTimestamp(point.timestamp)
      const isoForParsing = point.timestamp.includes("T") ? point.timestamp : point.timestamp.replace(" ", "T")
      const date = new Date(isoForParsing)
      const epochMs = Number.isFinite(date.getTime()) ? date.getTime() : NaN

      return {
        time: dateTime.slice(11, 19),
        dateTime,
        timestamp: epochMs,
        logNo: point.logNo ?? null,
        value: normalizeNumber(point.value ?? point.robotVibrationScore ?? bodyAnalysis?.metrics?.robotVibrationScore ?? point.vibrationScore),
        warning_line: normalizeNumber(point.warningLine ?? bodyAnalysis?.metrics?.vibrationWarningLine),
        danger_line: normalizeNumber(point.dangerLine ?? bodyAnalysis?.metrics?.vibrationDangerLine),
        risk_score: normalizeNumber(point.riskScore),
        isAbnormal: Boolean(point.isAbnormal) || isWarningSeverity(point.severity ?? bodyAnalysis?.metrics?.severity),
        severity: point.severity ?? bodyAnalysis?.metrics?.severity ?? "NORMAL",
      }
    })
  }, [bodyAnalysis])

  const bodyPeakTrendData = useMemo<BodyTrendRow[]>(() => {
    const points = bodyAnalysis?.charts?.frequencyPeak?.points ?? bodyAnalysis?.chart ?? []
    return points.map((point: any) => {
      const dateTime = formatBackendTimestamp(point.timestamp)
      const isoForParsing = point.timestamp.includes("T") ? point.timestamp : point.timestamp.replace(" ", "T")
      const date = new Date(isoForParsing)
      const epochMs = Number.isFinite(date.getTime()) ? date.getTime() : NaN

      return {
        time: dateTime.slice(11, 19),
        dateTime,
        timestamp: epochMs,
        logNo: point.logNo ?? null,
        value: normalizeNumber(point.value ?? point.vibrationPeak ?? point.frequencyPeakValue),
        secondaryValue: normalizeNumber(point.secondaryValue ?? point.vibrationRms ?? bodyAnalysis?.metrics?.vibrationRms),
        warning_line: normalizeNumber(point.warningLine ?? bodyAnalysis?.metrics?.peakWarningLine),
        danger_line: normalizeNumber(point.dangerLine ?? bodyAnalysis?.metrics?.peakDangerLine),
        risk_score: normalizeNumber(point.riskScore),
        isAbnormal: Boolean(point.isAbnormal) || isWarningSeverity(point.severity ?? bodyAnalysis?.metrics?.severity),
        severity: point.severity ?? bodyAnalysis?.metrics?.severity ?? "NORMAL",
      }
    })
  }, [bodyAnalysis])

  const fetchBodyAnalysisData = useCallback(async (date?: string | null) => {
    setIsBodyAnalysisLoading(true)
    setBodyAnalysisError(null)
    try {
      // Body charts need more history than the visible window so dragging can move.
      const result = await fetchBodyAnalysis({ date, limit: 60 })
      setBodyAnalysis(result)
    } catch (error) {
      console.error("fetchBodyAnalysis error:", error)
      setBodyAnalysisError(error instanceof Error ? error.message : "李⑥껜 ?댁긽 ?먯? ?곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??")
    } finally {
      setIsBodyAnalysisLoading(false)
    }
  }, [])

  const sourceBodyData = bodyAnalysis ? bodyRobotTrendData : bodyRobotData
  const sourceBodyFrequencyData = bodyAnalysis ? bodyPeakTrendData : bodyRobotData

  const bodyRobotTrendDomainMax = 1.5
  const bodyFrequencyTrendDomainMax = 0.035

  const visibleBodyRobotData = useMemo(
    () => sourceBodyData.slice(
      bodyRobotChartStartIndex,
      bodyRobotChartStartIndex + BODY_CHART_WINDOW_SIZE,
    ),
    [sourceBodyData, bodyRobotChartStartIndex],
  )
  const visibleBodyFrequencyData = useMemo(
    () => sourceBodyFrequencyData.slice(
      bodyFrequencyChartStartIndex,
      bodyFrequencyChartStartIndex + BODY_CHART_WINDOW_SIZE,
    ),
    [sourceBodyFrequencyData, bodyFrequencyChartStartIndex],
  )

  const bodyAvailableDatesLocal = Array.from(new Set(sourceBodyData.map((item) => item.dateTime.slice(0, 10)))).reverse()

  const bodyDateOptions =
    Array.isArray(bodyAnalysis?.dateOptions) && bodyAnalysis!.dateOptions.length > 0
      ? bodyAnalysis!.dateOptions.map((opt) => opt.date)
      : bodyAvailableDatesLocal

  const selectedBodyDate =
    selectedBodyAnalysisDate ??
    bodyAnalysis?.date ??
    sourceBodyData[Math.floor(sourceBodyData.length / 2)]?.dateTime.slice(0, 10) ??
    bodyDateOptions[0] ??
    ""

  const handleBodyDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDate = event.target.value
    setSelectedBodyAnalysisDate(selectedDate)
    // show the latest window first; older data is revealed by dragging left
    setBodyRobotChartStartIndex(getLatestChartStartIndex(sourceBodyData.length, BODY_CHART_WINDOW_SIZE))
    setBodyFrequencyChartStartIndex(getLatestChartStartIndex(sourceBodyFrequencyData.length, BODY_CHART_WINDOW_SIZE))
  }

  useEffect(() => {
    void fetchBodyAnalysisData(selectedBodyAnalysisDate)
  }, [fetchBodyAnalysisData, selectedBodyAnalysisDate])

  useEffect(() => {
    setPressChartStartIndex(getLatestChartStartIndex(pressDisplayData.length, PRESS_CHART_WINDOW_SIZE))
  }, [pressDisplayData.length])

  useEffect(() => {
    setBodyRobotChartStartIndex(getLatestChartStartIndex(sourceBodyData.length, BODY_CHART_WINDOW_SIZE))
  }, [sourceBodyData.length])

  useEffect(() => {
    setBodyFrequencyChartStartIndex(getLatestChartStartIndex(sourceBodyFrequencyData.length, BODY_CHART_WINDOW_SIZE))
  }, [sourceBodyFrequencyData.length])

  const lastChartPoint = sourceBodyData.length > 0
    ? sourceBodyData[sourceBodyData.length - 1]
    : bodyRobotData.length > 0
      ? bodyRobotData[bodyRobotData.length - 1]
      : {
          dateTime: "",
          robot_motion_status: "NORMAL",
          robot_operation_mode: "AUTO",
          robot_vibration_score: 0,
          frequency_peak_band: "LOW",
          frequency_peak_value: 0,
          risk_score: 0,
          vibration_peak: 0,
          vibration_rms: 0,
        }

  const latestBodyData = bodyAnalysis?.metrics ? {
    ...lastChartPoint,
    robot_motion_status: bodyAnalysis.metrics.robotMotionStatus ?? lastChartPoint.robot_motion_status,
    robot_operation_mode: bodyAnalysis.metrics.robotOperationMode ?? lastChartPoint.robot_operation_mode,
    robot_vibration_score:
      bodyAnalysis.metrics.avgRobotVibrationScore ??
      bodyAnalysis.metrics.robotVibrationScore ??
      bodyAnalysis.metrics.vibrationScore ??
      lastChartPoint.robot_vibration_score,
    frequency_peak_band: bodyAnalysis.metrics.frequencyPeakBand ?? lastChartPoint.frequency_peak_band,
    frequency_peak_value:
      bodyAnalysis.metrics.avgFrequencyPeakValue ??
      bodyAnalysis.metrics.frequencyPeakValue ??
      bodyAnalysis.metrics.vibrationPeak ??
      lastChartPoint.frequency_peak_value,
    vibration_peak: bodyAnalysis.metrics.avgVibrationPeak ?? bodyAnalysis.metrics.vibrationPeak ?? lastChartPoint.vibration_peak,
    vibration_rms: bodyAnalysis.metrics.avgVibrationRms ?? bodyAnalysis.metrics.vibrationRms ?? lastChartPoint.vibration_rms,
    risk_score: bodyAnalysis.metrics.riskScore ?? lastChartPoint.risk_score,
    vibration_warning_line: bodyAnalysis.metrics.vibrationWarningLine ?? 0.75,
    vibration_danger_line: bodyAnalysis.metrics.vibrationDangerLine ?? 1.25,
    peak_warning_line: bodyAnalysis.metrics.peakWarningLine ?? 0.015,
    peak_danger_line: bodyAnalysis.metrics.peakDangerLine ?? 0.03,
  } : lastChartPoint;

  const latestBodySeverity = severityToRiskSeverity(
    bodyAnalysis?.metrics?.severity,
    Number(latestBodyData.risk_score ?? 0)
  )


  const handleBodyRobotChartPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Some browsers can reject pointer capture for synthetic / already-captured pointers.
    }
    bodyRobotChartDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startIndex: bodyRobotChartStartIndex,
      width: event.currentTarget.getBoundingClientRect().width,
    }
    setIsBodyRobotChartDragging(true)
  }

  const handleBodyFrequencyChartPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Some browsers can reject pointer capture for synthetic / already-captured pointers.
    }
    bodyFrequencyChartDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startIndex: bodyFrequencyChartStartIndex,
      width: event.currentTarget.getBoundingClientRect().width,
    }
    setIsBodyFrequencyChartDragging(true)
  }

  const paintKpis = {
    analysisCount: paintDashboard.summary?.analysisCount ?? 0,
    averageThickness: paintDashboard.summary?.averageThicknessValue ?? null,
    defectRate: paintDashboard.summary?.defectRate ?? null,
    averageQuality: paintDashboard.summary?.averageSurfaceQualityScore ?? null,
    riskAlarmCount: paintDashboard.summary?.alertCount ?? 0,
    averageThermalStdTemp: paintDashboard.summary?.averageThermalStdTemp ?? null,
  }
  const assemblyData = assemblyDashboard.vehicles ?? []
  const sortedAssemblyData = assemblyData
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const severityDiff = getAssemblySeverityRank(right.row) - getAssemblySeverityRank(left.row)
      if (severityDiff !== 0) return severityDiff

      const riskDiff = (right.row.riskScore ?? 0) - (left.row.riskScore ?? 0)
      if (riskDiff !== 0) return riskDiff

      const errorDiff = getAssemblyErrorTotal(right.row) - getAssemblyErrorTotal(left.row)
      if (errorDiff !== 0) return errorDiff

      return left.index - right.index
    })
    .map(({ row }) => row)
  const filteredAssemblyData = sortedAssemblyData.filter((row) => {
    if (assemblyFilter === "abnormal") return isAssemblyAbnormal(row)
    if (assemblyFilter === "sequence") return (row.sequenceErrorCount ?? 0) > 0
    if (assemblyFilter === "fastening") return (row.fasteningErrorCount ?? 0) > 0
    if (assemblyFilter === "missing") return (row.missingPartCount ?? 0) > 0
    return true
  })
  const selectedAssemblyVehicle =
    filteredAssemblyData.find((row, index) => getAssemblyVehicleKey(row, index) === selectedAssemblyVehicleKey) ??
    filteredAssemblyData[0] ??
    sortedAssemblyData[0] ??
    null
  const assemblyKpis = {
    carCount: assemblyDashboard.summary?.vehicleCount ?? 0,
    sequenceErrors: assemblyDashboard.summary?.sequenceErrorCount ?? 0,
    missingParts: assemblyDashboard.summary?.missingPartCount ?? 0,
    fasteningErrors: assemblyDashboard.summary?.fasteningErrorCount ?? 0,
    averageRisk: assemblyDashboard.summary?.averageRiskScore ?? 0,
  }
  const paintAbnormalEventCount = paintDashboard.summary?.alertCount ?? 0
  const assemblyAbnormalEventCount =
    (assemblyDashboard.summary?.sequenceErrorCount ?? 0) +
    (assemblyDashboard.summary?.missingPartCount ?? 0) +
    (assemblyDashboard.summary?.fasteningErrorCount ?? 0)
  const topProcessStages = processStages.map((stage) => {
    if (stage.id === "05") {
      const latestTransferRate = toPercentValue(defectCauseSummary?.transferProbability)
      const latestCurrentProcess = defectCauseSummary?.currentProcess ?? defectPredictionRows[0]?.currentProcess ?? stage.currentProcess
      const latestPredictedProcess =
        defectCauseSummary?.predictedDefectProcess ??
        defectPredictionRows[0]?.predictedDefectProcess ??
        bottleneckRows[0]?.processCode ??
        stage.targetProcess
      return {
        ...stage,
        defectRate: latestTransferRate ?? stage.defectRate,
        currentProcess: latestCurrentProcess,
        targetProcess: latestPredictedProcess,
        bottleneckProcess: bottleneckRows[0]?.processCode ?? stage.bottleneckProcess,
      }
    }

    const operationRate = stage.processCode
      ? operationRateByProcess[stage.processCode]?.operationRate
      : undefined
    const hasOperationRate = Number.isFinite(operationRate)
    const events =
      stage.processCode === "PRESS"
        ? (pressAnalysis?.chart?.filter(p => p.isAbnormal).length ?? 0)
        : stage.processCode === "BODY"
          ? ((bodyAnalysis?.charts?.robotVibration?.points ?? bodyAnalysis?.chart ?? []).filter((p: any) => p.isAbnormal).length ?? 0)
          : stage.processCode === "PAINT"
            ? paintAbnormalEventCount
            : stage.processCode === "ASSEMBLY"
              ? assemblyAbnormalEventCount
              : stage.events

    return {
      ...stage,
      rate: hasOperationRate ? Math.round(operationRate as number) : null,
      rateLabel: hasOperationRate
        ? undefined
        : operationRateStatus === "error"
          ? "조회 실패"
          : "-",
      events,
      isBottleneck: mostBottleneckProcess ? stage.name === mostBottleneckProcess : stage.isBottleneck,
      bottleneckRiskLevel: mostBottleneckProcess ? mostBottleneckRiskLevel : "?꾪뿕",
    }
  })
  const assemblyStartIndex = (assemblyPage - 1) * ASSEMBLY_TABLE_PAGE_SIZE
  const assemblyTotalPages = Math.max(1, Math.ceil(filteredAssemblyData.length / ASSEMBLY_TABLE_PAGE_SIZE))
  const pagedAssemblyData = filteredAssemblyData.slice(
    assemblyStartIndex,
    assemblyStartIndex + ASSEMBLY_TABLE_PAGE_SIZE,
  )
  const setAssemblyFilter = (filter: AssemblyFilter) => {
    setAssemblyFilterState(filter)
    setAssemblyPage(1)
    setSelectedAssemblyVehicleKey(null)
  }
  const paintDateOptions =
    selectedPaintDate && !paintAvailableDates.includes(selectedPaintDate)
      ? [selectedPaintDate, ...paintAvailableDates]
      : paintAvailableDates
  const assemblyDateOptions =
    selectedAssemblyDate && !assemblyAvailableDates.includes(selectedAssemblyDate)
      ? [selectedAssemblyDate, ...assemblyAvailableDates]
      : assemblyAvailableDates

  const resetBottleneckAnalysis = useCallback(() => {
    bottleneckRequestSeqRef.current += 1
    requestedBottleneckCursorsRef.current.clear()
    hasNextBottleneckRef.current = true
    isBottleneckLoadingRef.current = false
    activeBottleneckDateRef.current = null
    setBottleneckRows([])
    setBottleneckCursor(BOTTLENECK_INITIAL_CURSOR)
    setHasNextBottleneck(true)
    setIsBottleneckLoading(false)
    setBottleneckError(null)
    setMostBottleneckProcess(null)
    setMostBottleneckRiskLevel(null)
    setBottleneckDateOptions([])
  }, [])

  const resetDefectPredictionAnalysis = useCallback(() => {
    defectPredictionRequestSeqRef.current += 1
    requestedDefectPredictionCursorsRef.current.clear()
    hasNextDefectPredictionRef.current = true
    isDefectPredictionLoadingRef.current = false
    activeDefectPredictionDateRef.current = null
    setDefectPredictionRows([])
    setDefectPredictionCursor(DEFECT_TRANSFER_INITIAL_CURSOR)
    setHasNextDefectPrediction(true)
    setIsDefectPredictionLoading(false)
    setDefectPredictionError(null)
    setDefectPredictionDateOptions([])
    setSelectedVehicle("")
  }, [])

  const resetDefectCauseAnalysis = useCallback(() => {
    defectCauseRequestSeqRef.current += 1
    requestedDefectCauseCursorsRef.current.clear()
    hasNextDefectCauseRef.current = true
    isDefectCauseLoadingRef.current = false
    activeDefectCauseRequestKeyRef.current = "__default__::__latest__"
    setDefectCauseRows([])
    setDefectCauseCursor(DEFECT_TRANSFER_INITIAL_CURSOR)
    setHasNextDefectCause(true)
    setIsDefectCauseLoading(false)
    setDefectCauseError(null)
    setDefectCauseSummary(null)
    setDefectCauseDateOptions([])
  }, [])

  const fetchBottleneckRows = useCallback(async (cursor: number | null, date?: string | null) => {
    if (cursor === null) return
    if (requestedBottleneckCursorsRef.current.has(cursor)) return
    if (!hasNextBottleneckRef.current && cursor !== BOTTLENECK_INITIAL_CURSOR) return

    const requestDate = date ?? null
    const requestSeq = bottleneckRequestSeqRef.current
    activeBottleneckDateRef.current = requestDate

    requestedBottleneckCursorsRef.current.add(cursor)
    isBottleneckLoadingRef.current = true
    setIsBottleneckLoading(true)
    setBottleneckError(null)

    try {
      const result = await fetchBottleneckAnalysis({
        date: requestDate,
        size: BOTTLENECK_PAGE_SIZE,
        cursor,
      })

      if (requestSeq !== bottleneckRequestSeqRef.current) return
      if (activeBottleneckDateRef.current !== requestDate) return

      setBottleneckRows((prevRows) => {
        const seenKeys = new Set(prevRows.map(getBottleneckRowKey))
        const nextRows = result.content.filter((row) => {
          const key = getBottleneckRowKey(row)
          if (seenKeys.has(key)) return false
          seenKeys.add(key)
          return true
        })

        return [...prevRows, ...nextRows]
      })
      if (cursor === BOTTLENECK_INITIAL_CURSOR) {
        const latestDate = result.dateOptions.map((option) => option.date).sort((a, b) => b.localeCompare(a))[0] ?? requestDate
        setMostBottleneckProcess(result.mostBottleneckProcess)
        setMostBottleneckRiskLevel(result.mostBottleneckRiskLevel)
        setBottleneckDateOptions(
          result.dateOptions.length > 0
            ? result.dateOptions.map((option) => option.date)
            : requestDate
              ? [requestDate]
              : [],
        )
        if (!requestDate && latestDate) {
          setSelectedBottleneckDate(latestDate)
        }
      }
      hasNextBottleneckRef.current = result.hasNext
      setHasNextBottleneck(result.hasNext)
      setBottleneckCursor(result.hasNext ? result.nextCursor : null)
    } catch (error) {
      if (requestSeq !== bottleneckRequestSeqRef.current) return
      if (activeBottleneckDateRef.current !== requestDate) return
      requestedBottleneckCursorsRef.current.delete(cursor)
      setBottleneckError(error instanceof Error ? error.message : "蹂묐ぉ 遺꾩꽍 ?곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??")
    } finally {
      if (requestSeq !== bottleneckRequestSeqRef.current) return
      if (activeBottleneckDateRef.current === requestDate) {
        isBottleneckLoadingRef.current = false
        setIsBottleneckLoading(false)
      }
    }
  }, [])

  const handleBottleneckScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24

    if (isNearBottom && hasNextBottleneckRef.current && !isBottleneckLoadingRef.current) {
      void fetchBottleneckRows(bottleneckCursor, selectedBottleneckDate)
    }
  }

  const fetchDefectPredictionRows = useCallback(async (cursor: number | null, date?: string | null) => {
    if (cursor === null) return
    if (requestedDefectPredictionCursorsRef.current.has(cursor)) return
    if (!hasNextDefectPredictionRef.current && cursor !== DEFECT_TRANSFER_INITIAL_CURSOR) return

    const requestDate = date ?? null
    const requestSeq = defectPredictionRequestSeqRef.current
    activeDefectPredictionDateRef.current = requestDate

    requestedDefectPredictionCursorsRef.current.add(cursor)
    isDefectPredictionLoadingRef.current = true
    setIsDefectPredictionLoading(true)
    setDefectPredictionError(null)

    try {
      const result = await fetchDefectTransferPredictions({
        date: requestDate,
        size: DEFECT_TRANSFER_PAGE_SIZE,
        cursor,
      })

      if (requestSeq !== defectPredictionRequestSeqRef.current) return
      if (activeDefectPredictionDateRef.current !== requestDate) return

      setDefectPredictionRows((prevRows) => {
        const existingVehicleIds = new Set(prevRows.map((row) => row.vehicleId))
        const nextRows = result.content.filter((row) => !existingVehicleIds.has(row.vehicleId))
        return [...prevRows, ...nextRows]
      })
      if (cursor === DEFECT_TRANSFER_INITIAL_CURSOR) {
        const latestDate = result.dateOptions.map((option) => option.date).sort((a, b) => b.localeCompare(a))[0] ?? requestDate
        setDefectPredictionDateOptions(
          result.dateOptions.length > 0
            ? result.dateOptions.map((option) => option.date)
            : requestDate
              ? [requestDate]
              : [],
        )
        if (!requestDate && latestDate) {
          setSelectedDefectPredictionDate(latestDate)
        }
      }
      hasNextDefectPredictionRef.current = result.hasNext
      setHasNextDefectPrediction(result.hasNext)
      setDefectPredictionCursor(result.hasNext ? result.nextCursor : null)
    } catch (error) {
      if (requestSeq !== defectPredictionRequestSeqRef.current) return
      if (activeDefectPredictionDateRef.current !== requestDate) return
      requestedDefectPredictionCursorsRef.current.delete(cursor)
      setDefectPredictionError(error instanceof Error ? error.message : "遺덈웾 ?꾩씠 ?덉륫 ?곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??")
    } finally {
      if (requestSeq !== defectPredictionRequestSeqRef.current) return
      if (activeDefectPredictionDateRef.current === requestDate) {
        isDefectPredictionLoadingRef.current = false
        setIsDefectPredictionLoading(false)
      }
    }
  }, [])

  const handleDefectPredictionScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24

    if (isNearBottom && hasNextDefectPredictionRef.current && !isDefectPredictionLoadingRef.current) {
      void fetchDefectPredictionRows(defectPredictionCursor, selectedDefectPredictionDate)
    }
  }

  const fetchDefectCauseRows = useCallback(async (
    cursor: number | null,
    vehicleId: string | null,
    date?: string | null,
  ) => {
    if (cursor === null) return
    const requestSeq = defectCauseRequestSeqRef.current
    const requestKey = `${vehicleId || "__default__"}::${date ?? "__latest__"}`
    activeDefectCauseRequestKeyRef.current = requestKey
    if (cursor === DEFECT_TRANSFER_INITIAL_CURSOR) {
      initializedDefectCauseVehicleRef.current = requestKey
    }
    if (requestedDefectCauseCursorsRef.current.has(cursor)) return
    if (!hasNextDefectCauseRef.current && cursor !== DEFECT_TRANSFER_INITIAL_CURSOR) return

    requestedDefectCauseCursorsRef.current.add(cursor)
    isDefectCauseLoadingRef.current = true
    setIsDefectCauseLoading(true)
    setDefectCauseError(null)

    try {
      const result = await fetchDefectTransferCauses({
        vehicleId,
        date,
        size: DEFECT_TRANSFER_PAGE_SIZE,
        cursor,
      })

      if (requestSeq !== defectCauseRequestSeqRef.current) return
      if (activeDefectCauseRequestKeyRef.current !== requestKey) return

      setDefectCauseSummary(result)
      setDefectCauseRows((prevRows) => {
        const incomingRows = [
          ...(result.representativeCause ? [result.representativeCause] : []),
          ...(Array.isArray(result.detailCauses) ? result.detailCauses : []),
          ...result.content,
        ]
        const existingKeys = new Set(prevRows.map((row) => `${row.rank}-${row.feature}-${row.message}`))
        const nextRows = incomingRows.filter((row) => {
          const key = `${row.rank}-${row.feature}-${row.message}`
          if (existingKeys.has(key)) return false
          existingKeys.add(key)
          return true
        })
        return [...prevRows, ...nextRows]
      })
      if (cursor === DEFECT_TRANSFER_INITIAL_CURSOR) {
        const latestDate = result.dateOptions.map((option) => option.date).sort((a, b) => b.localeCompare(a))[0] ?? date ?? null
        setDefectCauseDateOptions(
          result.dateOptions.length > 0
            ? result.dateOptions.map((option) => option.date)
            : date
              ? [date]
              : [],
        )
        if (!date && latestDate) {
          setSelectedDefectCauseDate(latestDate)
        }
      }
      hasNextDefectCauseRef.current = result.hasNext
      setHasNextDefectCause(result.hasNext)
      setDefectCauseCursor(result.hasNext ? result.nextCursor : null)
    } catch (error) {
      if (requestSeq !== defectCauseRequestSeqRef.current) return
      if (activeDefectCauseRequestKeyRef.current !== requestKey) return
      requestedDefectCauseCursorsRef.current.delete(cursor)
      setDefectCauseError(error instanceof Error ? error.message : "SHAP ?먯씤 遺꾩꽍 ?곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??")
    } finally {
      if (requestSeq !== defectCauseRequestSeqRef.current) return
      if (activeDefectCauseRequestKeyRef.current === requestKey) {
        isDefectCauseLoadingRef.current = false
        setIsDefectCauseLoading(false)
      }
    }
  }, [])

  const handleDefectCauseScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24

    if (isNearBottom && hasNextDefectCauseRef.current && !isDefectCauseLoadingRef.current) {
      void fetchDefectCauseRows(defectCauseCursor, selectedVehicle || null, selectedDefectCauseDate)
    }
  }

  useEffect(() => {
    resetBottleneckAnalysis()
    void fetchBottleneckRows(BOTTLENECK_INITIAL_CURSOR, null)
  }, [fetchBottleneckRows, resetBottleneckAnalysis])

  useEffect(() => {
    resetDefectPredictionAnalysis()
    void fetchDefectPredictionRows(DEFECT_TRANSFER_INITIAL_CURSOR, null)
  }, [fetchDefectPredictionRows, resetDefectPredictionAnalysis])

  useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date())
  }, 1000)

  return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    void fetchPressAnalysis(selectedPressAnalysisDate)
  }, [fetchPressAnalysis, selectedPressAnalysisDate])

  useEffect(() => {
    let ignore = false

    const fetchEquipmentOperationRate = async () => {
      setOperationRateStatus("loading")
      try {
        const result: EquipmentOperationRateData = await getEquipmentOperationRate()
        const items = Array.isArray(result?.items) ? result.items : []

        const nextOperationRateByProcess = items.reduce<
          Record<string, EquipmentOperationRateItem>
        >((acc, item) => {
          if (item?.processCode) {
            acc[item.processCode] = item
          }
          return acc
        }, {})

        if (!ignore) {
          setOperationRateByProcess(nextOperationRateByProcess)
          setOperationRateStatus("success")
        }
      } catch (error) {
        console.error("Failed to load equipment operation rate", error)

        if (!ignore) {
          setOperationRateByProcess({})
          setOperationRateStatus("error")
        }
      }
    }

    void fetchEquipmentOperationRate()

    return () => {
      ignore = true
    }
  }, [])

  const applyPaintDashboard = (
    result: Partial<PaintDashboardData> | null | undefined,
  ) => {
    const normalizeMetricChart = (chart: PaintMetricChart | null | undefined): PaintMetricChart | null => {
      if (!chart) return null
      return {
        ...chart,
        points: Array.isArray(chart.points) ? chart.points : [],
        markers: Array.isArray(chart.markers) ? chart.markers : [],
      }
    }

    setPaintDashboard({
      ...emptyPaintDashboard,
      ...result,
      summary: {
        ...emptyPaintDashboard.summary,
        ...result?.summary,
      },
      thresholds: {
        ...emptyPaintDashboard.thresholds,
        ...result?.thresholds,
      },
      charts: {
        surfaceQuality: normalizeMetricChart(result?.charts?.surfaceQuality),
        thickness: normalizeMetricChart(result?.charts?.thickness),
        defectScore: normalizeMetricChart(result?.charts?.defectScore),
        thermalStdTemp: normalizeMetricChart(result?.charts?.thermalStdTemp),
      },
      alert: result?.alert ?? null,
      selectedDate: result?.selectedDate ?? null,
    })

    setSelectedPaintDate(result?.selectedDate ?? "")
  }

  const applyAssemblyDashboard = (
    result: Partial<AssemblyDashboardData> | null | undefined,
  ) => {
    setAssemblyDashboard({
      ...emptyAssemblyDashboard,
      ...result,
      summary: {
        ...emptyAssemblyDashboard.summary,
        ...result?.summary,
      },
      vehicles: Array.isArray(result?.vehicles) ? result.vehicles : [],
      alert: result?.alert ?? null,
      selectedDate: result?.selectedDate ?? null,
    })

    setSelectedAssemblyDate(result?.selectedDate ?? "")
    setAssemblyPage(1)
  }

  const fetchPaintDashboardData = useCallback(async (date?: string) => {
    setIsPaintDashboardLoading(true)
    setPaintDashboardError(null)

    try {
      const result = await getPaintDashboard(
        date ? { date, limit: 30 } : { limit: 30 },
      )
      applyPaintDashboard(result)
    } catch (error) {
      console.error("Failed to load paint dashboard", error)
      setPaintDashboard(emptyPaintDashboard)
      setPaintDashboardError("?꾩옣 ??쒕낫???곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??")
    } finally {
      setIsPaintDashboardLoading(false)
    }
  }, [])

  const fetchAssemblyDashboardData = useCallback(async (date?: string) => {
    setIsAssemblyDashboardLoading(true)
    setAssemblyDashboardError(null)

    try {
      const result = await getAssemblyDashboard(
        date ? { date, limit: 30 } : { limit: 30 },
      )
      applyAssemblyDashboard(result)
    } catch (error) {
      console.error("Failed to load assembly dashboard", error)
      setAssemblyDashboard(emptyAssemblyDashboard)
      setAssemblyDashboardError("議곕┰ ??쒕낫???곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??")
    } finally {
      setIsAssemblyDashboardLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false

    const fetchPaintDates = async () => {
      setIsPaintDatesLoading(true)
      setPaintDatesError(null)

      try {
        const result: AvailableDatesData = await getPaintAvailableDates()
        if (!ignore) {
          setPaintAvailableDates(Array.isArray(result?.dates) ? result.dates : [])
          if (!selectedPaintDate && result?.latestDate) {
            setSelectedPaintDate(result.latestDate)
          }
        }
      } catch (error) {
        console.error("Failed to load paint available dates", error)
        if (!ignore) {
          setPaintAvailableDates([])
          setPaintDatesError("?꾩옣 ?곗씠???좎쭨 紐⑸줉??遺덈윭?ㅼ? 紐삵뻽?듬땲??")
        }
      } finally {
        if (!ignore) {
          setIsPaintDatesLoading(false)
        }
      }
    }

    void fetchPaintDates()
    void fetchPaintDashboardData()

    return () => {
      ignore = true
    }
  }, [fetchPaintDashboardData])

  useEffect(() => {
    let ignore = false

    const fetchAssemblyDates = async () => {
      setIsAssemblyDatesLoading(true)
      setAssemblyDatesError(null)

      try {
        const result: AvailableDatesData = await getAssemblyAvailableDates()
        if (!ignore) {
          setAssemblyAvailableDates(Array.isArray(result?.dates) ? result.dates : [])
          if (!selectedAssemblyDate && result?.latestDate) {
            setSelectedAssemblyDate(result.latestDate)
          }
        }
      } catch (error) {
        console.error("Failed to load assembly available dates", error)
        if (!ignore) {
          setAssemblyAvailableDates([])
          setAssemblyDatesError("議곕┰ ?곗씠???좎쭨 紐⑸줉??遺덈윭?ㅼ? 紐삵뻽?듬땲??")
        }
      } finally {
        if (!ignore) {
          setIsAssemblyDatesLoading(false)
        }
      }
    }

    void fetchAssemblyDates()
    void fetchAssemblyDashboardData()

    return () => {
      ignore = true
    }
  }, [fetchAssemblyDashboardData])

  useEffect(() => {
    const scrollElement = bottleneckScrollRef.current
    if (!scrollElement || !hasNextBottleneck || isBottleneckLoading || bottleneckCursor === null) return

    const hasScrollableContent = scrollElement.scrollHeight > scrollElement.clientHeight + 1
    if (!hasScrollableContent) {
      void fetchBottleneckRows(bottleneckCursor, selectedBottleneckDate)
    }
  }, [bottleneckRows.length, bottleneckCursor, fetchBottleneckRows, hasNextBottleneck, isBottleneckLoading, selectedBottleneckDate])

  useEffect(() => {
    if (!selectedVehicle && defectPredictionVehicleOptions.length > 0) {
      setSelectedVehicle(defectPredictionVehicleOptions[0].vehicleId)
    }
  }, [selectedVehicle, defectPredictionVehicleOptions])

  useEffect(() => {
    if (!selectedVehicle) {
      resetDefectCauseAnalysis()
      return
    }

    const requestKey = `${selectedVehicle}::${selectedDefectCauseDate ?? "__latest__"}`
    if (initializedDefectCauseVehicleRef.current === requestKey) return

    resetDefectCauseAnalysis()
    void fetchDefectCauseRows(DEFECT_TRANSFER_INITIAL_CURSOR, selectedVehicle, selectedDefectCauseDate)
  }, [fetchDefectCauseRows, resetDefectCauseAnalysis, selectedVehicle])

  useEffect(() => {
    const scrollElement = defectPredictionScrollRef.current
    if (!scrollElement || !hasNextDefectPrediction || isDefectPredictionLoading || defectPredictionCursor === null) return

    const hasScrollableContent = scrollElement.scrollHeight > scrollElement.clientHeight + 1
    if (!hasScrollableContent) {
      void fetchDefectPredictionRows(defectPredictionCursor, selectedDefectPredictionDate)
    }
  }, [defectPredictionRows.length, defectPredictionCursor, fetchDefectPredictionRows, hasNextDefectPrediction, isDefectPredictionLoading, selectedDefectPredictionDate])

  useEffect(() => {
    const scrollElement = defectCauseScrollRef.current
    if (!scrollElement || !hasNextDefectCause || isDefectCauseLoading || defectCauseCursor === null) return

    const hasScrollableContent = scrollElement.scrollHeight > scrollElement.clientHeight + 1
    if (!hasScrollableContent) {
      void fetchDefectCauseRows(defectCauseCursor, selectedVehicle || null, selectedDefectCauseDate)
    }
  }, [defectCauseRows.length, defectCauseCursor, fetchDefectCauseRows, hasNextDefectCause, isDefectCauseLoading, selectedDefectCauseDate, selectedVehicle])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = bodyRobotChartDragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return

      event.preventDefault()
      const pixelsPerPoint = Math.max(5, drag.width / (BODY_CHART_WINDOW_SIZE - 1))
      const movedPoints = Math.round((event.clientX - drag.startX) / pixelsPerPoint)
      const maxStartIndex = Math.max(0, sourceBodyData.length - BODY_CHART_WINDOW_SIZE)

      setBodyRobotChartStartIndex(
        Math.min(maxStartIndex, Math.max(0, drag.startIndex - movedPoints)),
      )
    }

    const handlePointerEnd = (event: PointerEvent) => {
      if (bodyRobotChartDragRef.current?.pointerId !== event.pointerId) return
      bodyRobotChartDragRef.current = null
      setIsBodyRobotChartDragging(false)
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false })
    window.addEventListener("pointerup", handlePointerEnd)
    window.addEventListener("pointercancel", handlePointerEnd)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerEnd)
      window.removeEventListener("pointercancel", handlePointerEnd)
    }
  }, [sourceBodyData.length])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = bodyFrequencyChartDragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return

      event.preventDefault()
      const pixelsPerPoint = Math.max(5, drag.width / (BODY_CHART_WINDOW_SIZE - 1))
      const movedPoints = Math.round((event.clientX - drag.startX) / pixelsPerPoint)
      const maxStartIndex = Math.max(0, sourceBodyFrequencyData.length - BODY_CHART_WINDOW_SIZE)

      setBodyFrequencyChartStartIndex(
        Math.min(maxStartIndex, Math.max(0, drag.startIndex - movedPoints)),
      )
    }

    const handlePointerEnd = (event: PointerEvent) => {
      if (bodyFrequencyChartDragRef.current?.pointerId !== event.pointerId) return
      bodyFrequencyChartDragRef.current = null
      setIsBodyFrequencyChartDragging(false)
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false })
    window.addEventListener("pointerup", handlePointerEnd)
    window.addEventListener("pointercancel", handlePointerEnd)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerEnd)
      window.removeEventListener("pointercancel", handlePointerEnd)
    }
  }, [sourceBodyFrequencyData.length])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = pressChartDragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return

      event.preventDefault()
      const pixelsPerPoint = Math.max(5, drag.width / (PRESS_CHART_WINDOW_SIZE - 1))
      const movedPoints = Math.round((event.clientX - drag.startX) / pixelsPerPoint)
      const maxStartIndex = Math.max(0, pressDisplayData.length - PRESS_CHART_WINDOW_SIZE)

      setPressChartStartIndex(
        Math.min(maxStartIndex, Math.max(0, drag.startIndex - movedPoints)),
      )
    }

    const handlePointerEnd = (event: PointerEvent) => {
      if (pressChartDragRef.current?.pointerId !== event.pointerId) return
      pressChartDragRef.current = null
      setIsPressChartDragging(false)
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false })
    window.addEventListener("pointerup", handlePointerEnd)
    window.addEventListener("pointercancel", handlePointerEnd)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerEnd)
      window.removeEventListener("pointercancel", handlePointerEnd)
    }
  }, [pressDisplayData.length])

  const handleBottleneckDateChange = (nextDate: string) => {
    setSelectedBottleneckDate(nextDate)
    resetBottleneckAnalysis()
    void fetchBottleneckRows(BOTTLENECK_INITIAL_CURSOR, nextDate)
  }

  const handleDefectPredictionDateChange = (nextDate: string) => {
    setSelectedDefectPredictionDate(nextDate)
    setSelectedDefectCauseDate(nextDate)
    resetDefectPredictionAnalysis()
    resetDefectCauseAnalysis()
    void fetchDefectPredictionRows(DEFECT_TRANSFER_INITIAL_CURSOR, nextDate)
    if (selectedVehicle) {
      void fetchDefectCauseRows(DEFECT_TRANSFER_INITIAL_CURSOR, selectedVehicle, nextDate)
    }
  }

  const handleDefectCauseDateChange = (nextDate: string) => {
    setSelectedDefectCauseDate(nextDate)
    if (!selectedVehicle) return
    resetDefectCauseAnalysis()
    void fetchDefectCauseRows(DEFECT_TRANSFER_INITIAL_CURSOR, selectedVehicle, nextDate)
  }

  return {
    currentTime,
    activeTab,
    setActiveTab,
    topProcessStages,
    mostBottleneckProcess,
    mostBottleneckRiskLevel,
    processStageCount: processStages.length,
    bottleneckRows,
    isBottleneckLoading,
    bottleneckError,
    selectedBottleneckDate,
    bottleneckDateOptions,
    handleBottleneckDateChange,
    bottleneckScrollRef,
    handleBottleneckScroll,
    defectPredictionRows,
    selectedVehicle,
    defectCauseSummary,
    isDefectPredictionLoading,
    defectPredictionError,
    selectedDefectPredictionDate,
    defectPredictionDateOptions,
    handleDefectPredictionDateChange,
    defectPredictionScrollRef,
    handleDefectPredictionScroll,
    setSelectedVehicle,
    defectPredictionVehicleOptions,
    defectCauseRows,
    isDefectCauseLoading,
    defectCauseError,
    selectedDefectCauseDate,
    defectCauseDateOptions,
    handleDefectCauseDateChange,
    defectCauseScrollRef,
    handleDefectCauseScroll,
    latestPressDisplayData,
    latestPressDisplayRisk,
    selectedPressDate,
    pressDisplayAvailableDates,
    handlePressDateChange,
    pressDisplayData,
    pressRiskTrendData,
    visiblePressRiskData,
    isPressAnalysisLoading,
    pressAnalysisError,
    isPressChartHovered,
    isPressChartDragging,
    handlePressChartPointerDown,
    setIsPressChartHovered,
    visiblePressData,
    pressAnalysis,
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
    filteredAssemblyData,
    pagedAssemblyData,
    assemblyStartIndex,
    assemblyPage,
    assemblyTotalPages,
    setAssemblyPage,
    assemblyFilter,
    setAssemblyFilter,
    selectedAssemblyVehicle,
    selectedAssemblyVehicleKey,
    setSelectedAssemblyVehicleKey,
    getAssemblyVehicleKey,
    assemblyDashboard,
    formatChartTick,
    formatDelayTime,
    formatProbability,
    getDefectRiskTextClass,
    formatSequence,
    getRiskTextClass,
    getStatusBadgeClass,
    getAssemblyStatus,
    pressChartWindowSize: PRESS_CHART_WINDOW_SIZE,
  }
}

