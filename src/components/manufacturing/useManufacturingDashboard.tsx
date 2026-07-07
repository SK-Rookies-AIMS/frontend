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
  { id: "01", processCode: "PRESS", name: "프레스", rate: 92, events: 22, status: "normal", color: "#22c55e" },
  { id: "02", processCode: "BODY", name: "차체", rate: 89, events: 22, status: "warning", color: "#f59e0b" },
  { id: "03", processCode: "PAINT", name: "도장", rate: 87, events: 22, status: "danger", color: "#ef4444", isBottleneck: true },
  { id: "04", processCode: "ASSEMBLY", name: "의장", rate: 91, events: 22, status: "normal", color: "#22c55e" },
  { id: "05", name: "연계 분석", rate: null, defectRate: 78, targetProcess: "도장(L3)", status: "analysis" },
]

const defectPredictionData = [
  { vinId: "VIN-001245", currentProcess: "차체", predictedProcess: "도장 (L3)", probability: 78, stepsAhead: "3단계 후" },
  { vinId: "VIN-001248", currentProcess: "프레스", predictedProcess: "차체 (S12)", probability: 72, stepsAhead: "2단계 후" },
  { vinId: "VIN-001250", currentProcess: "도장", predictedProcess: "의장 (A1)", probability: 69, stepsAhead: "3단계 후" },
  { vinId: "VIN-001253", currentProcess: "차체", predictedProcess: "도장 (L3)", probability: 61, stepsAhead: "3단계 후" },
  { vinId: "VIN-001255", currentProcess: "프레스", predictedProcess: "차체 (S12)", probability: 58, stepsAhead: "2단계 후" },
]

const aiAnalysisFactors = [
  { name: "S2 Station 통과 지연 +12초", impact: 0.38 },
  { name: "L3 온도 편차 +7°C", impact: 0.24 },
  { name: "프레스 공정 Cycle Time 증가", impact: 0.19 },
  { name: "과거 유사 불량 사례 34건 존재", impact: 0.11 },
  { name: "센서 통신 지연 (3ms)", impact: 0.08 },
]

// 백엔드 연동 전 press_analysis_result 형태를 반영한 최신 5분 기준 목 데이터
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
  // 초가 없는 경우 HH:mm까지만 추출
  const matchedShort = normalized.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  return matchedShort ? `${matchedShort[1]} ${matchedShort[2]}` : normalized
}

const formatDelayTime = (seconds: number): string => {
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    return `${Number(hours.toFixed(1))}시간`;
  }
  if (seconds >= 60) {
    const minutes = seconds / 60;
    return `${Number(minutes.toFixed(1))}분`;
  }
  return `${Number(seconds.toFixed(1))}초`;
}

// 드래그 시 전날 데이터까지 조회할 수 있도록 이전 24시간의 5분 기준값을 만든다.
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
  isAbnormal?: boolean
  severity?: string
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
  if (score >= 70) return { label: "심각", className: "text-destructive" }
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

type PaintDashboardData = {
  selectedDate: string | null
  summary: {
    analysisCount: number
    defectRate: number
    averageSurfaceQualityScore: number
    alertCount: number
  }
  chart: Array<{
    time: string
    defectScore: number
    surfaceQualityScore: number
    thicknessValue: number
    riskScore: number
    imagePosition?: string
    visionLabel?: string
    thermalStdTemp?: number
    severity?: string
  }>
  alert: {
    title: string
    messages: string[]
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

const emptyPaintDashboard: PaintDashboardData = {
  selectedDate: null,
  summary: {
    analysisCount: 0,
    defectRate: 0,
    averageSurfaceQualityScore: 0,
    alertCount: 0,
  },
  chart: [],
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

const ASSEMBLY_PAGE_SIZE = 5

const formatApiTime = (value: string) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(11, 16) || value
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
}

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
        <p>불량 점수: {row.defectScore.toFixed(2)}{row.defectScore <= 1 ? ` (표시 ${row.defectScoreScaled.toFixed(1)})` : ""}</p>
        <p>표면 품질 점수: {row.surfaceQualityScore.toFixed(1)}</p>
        <p>도장 두께: {row.thicknessValue.toFixed(1)}</p>
        <p>위험도: {row.riskScore.toFixed(1)}</p>
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
  if (!isAbnormal) return "정상"
  if (severity === "CRITICAL") return "위험"
  if (severity === "WARNING") return "경고"
  return "이상"
}

function getStatusBadgeClass(severity: string, isAbnormal: boolean, status?: string, riskScore = 0) {
  if (status === "위험" || severity === "CRITICAL" || riskScore >= 80) return "bg-destructive/20 text-destructive"
  if (status === "경고" || severity === "WARNING" || riskScore >= 50) return "bg-warning/20 text-warning"
  if (!isAbnormal) return "bg-success/20 text-success"
  return "bg-destructive/20 text-destructive"
}

function getRiskTextClass(riskScore: number) {
  if (riskScore >= 80) return "text-destructive"
  if (riskScore >= 50) return "text-warning"
  return "text-success"
}

function formatProbability(value: number) {
  const percent = value <= 1 ? value * 100 : value
  return `${Math.round(percent)}%`
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

function severityToRiskSeverity(severity: string | null | undefined, riskScore: number) {
  if (severity === "CRITICAL") return { label: "심각", className: "text-destructive" }
  if (severity === "WARNING") return { label: "경고", className: "text-warning" }
  if (severity === "NORMAL") return { label: "정상", className: "text-success" }
  return getRiskSeverity(riskScore)
}

function toPressDataPoint(point: NonNullable<PressAnomalyData["chart"]>[number]): PressDataPoint {
  // timestamp를 로컬 Date로 파싱하지 않고 백엔드 문자열을 그대로 사용해 시간대 차이를 방지
  const dateTime = formatBackendTimestamp(point.timestamp)
  // dateTime이 "YYYY-MM-DD HH:mm:ss" 형식이므로 getTime을 위한 Date 파싱은 ISO 형식 유지
  const isoForParsing = point.timestamp.includes("T") ? point.timestamp : point.timestamp.replace(" ", "T")
  const date = new Date(isoForParsing)
  const epochMs = Number.isFinite(date.getTime()) ? date.getTime() : NaN

  return {
    // time 필드: HH:mm:ss까지 표시해 백엔드 timestamp와 일치
    time: dateTime.slice(11, 19),
    dateTime,
    timestamp: epochMs,
    target_cycle_time_sec: normalizeNumber(point.targetCycleTimeSec),
    actual_cycle_time_sec: normalizeNumber(point.actualCycleTimeSec),
    cycle_time_gap_sec: normalizeNumber(point.cycleTimeGapSec),
    timestamp_delay_sec: normalizeNumber(point.timestampDelaySec),
    risk_score: normalizeNumber(point.riskScore),
    overall_risk_score: normalizeNumber(point.riskScore),
    isAbnormal: point.isAbnormal ?? false,
    severity: point.severity ?? "NORMAL",
  }
}



export function useManufacturingDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState("press")
  const [selectedVehicle, setSelectedVehicle] = useState("")
  const [bottleneckRows, setBottleneckRows] = useState<BottleneckRow[]>([])
  const [mostBottleneckProcess, setMostBottleneckProcess] = useState<string | null>(null)
  const [mostBottleneckRiskLevel, setMostBottleneckRiskLevel] = useState<string | null>(null)
  const [bottleneckCursor, setBottleneckCursor] = useState<number | null>(BOTTLENECK_INITIAL_CURSOR)
  const [hasNextBottleneck, setHasNextBottleneck] = useState(true)
  const [isBottleneckLoading, setIsBottleneckLoading] = useState(false)
  const [bottleneckError, setBottleneckError] = useState<string | null>(null)
  const requestedBottleneckCursorsRef = useRef<Set<number>>(new Set())
  const hasNextBottleneckRef = useRef(true)
  const isBottleneckLoadingRef = useRef(false)
  const bottleneckScrollRef = useRef<HTMLDivElement | null>(null)
  const [defectPredictionRows, setDefectPredictionRows] = useState<DefectTransferPredictionRow[]>([])
  const defectPredictionVehicleOptions = defectPredictionRows.filter(
    (row, index, rows) => rows.findIndex((item) => item.vehicleId === row.vehicleId) === index,
  )
  const [defectPredictionCursor, setDefectPredictionCursor] = useState<number | null>(DEFECT_TRANSFER_INITIAL_CURSOR)
  const [hasNextDefectPrediction, setHasNextDefectPrediction] = useState(true)
  const [isDefectPredictionLoading, setIsDefectPredictionLoading] = useState(false)
  const [defectPredictionError, setDefectPredictionError] = useState<string | null>(null)
  const requestedDefectPredictionCursorsRef = useRef<Set<number>>(new Set())
  const hasNextDefectPredictionRef = useRef(true)
  const isDefectPredictionLoadingRef = useRef(false)
  const defectPredictionScrollRef = useRef<HTMLDivElement | null>(null)
  const [defectCauseSummary, setDefectCauseSummary] = useState<DefectTransferCauseData | null>(null)
  const [defectCauseRows, setDefectCauseRows] = useState<DefectTransferCauseRow[]>([])
  const [defectCauseCursor, setDefectCauseCursor] = useState<number | null>(DEFECT_TRANSFER_INITIAL_CURSOR)
  const [hasNextDefectCause, setHasNextDefectCause] = useState(true)
  const [isDefectCauseLoading, setIsDefectCauseLoading] = useState(false)
  const [defectCauseError, setDefectCauseError] = useState<string | null>(null)
  const requestedDefectCauseCursorsRef = useRef<Set<number>>(new Set())
  const hasNextDefectCauseRef = useRef(true)
  const isDefectCauseLoadingRef = useRef(false)
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
  const [bodyChartStartIndex, setBodyChartStartIndex] = useState(
    Math.max(0, bodyRobotData.length - BODY_CHART_WINDOW_SIZE),
  )
  const [isBodyChartDragging, setIsBodyChartDragging] = useState(false)
  const [isBodyChartHovered, setIsBodyChartHovered] = useState(false)
  const bodyChartDragRef = useRef<{
    pointerId: number
    startX: number
    startIndex: number
    width: number
  } | null>(null)
  const [selectedPaintDate, setSelectedPaintDate] = useState("")
  const [selectedAssemblyDate, setSelectedAssemblyDate] = useState("")
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

  const [pressAnalysis, setPressAnalysis] = useState<PressAnomalyData | null>(null)
  const [selectedPressAnalysisDate, setSelectedPressAnalysisDate] = useState<string | null>(null)
  const [isPressAnalysisLoading, setIsPressAnalysisLoading] = useState(false)
  const [pressAnalysisError, setPressAnalysisError] = useState<string | null>(null)

  const apiPressData = pressAnalysis?.chart
    .map(toPressDataPoint)
    .filter((point) => Number.isFinite(point.timestamp)) ?? []
  const rawPressDisplayData = pressAnalysis ? apiPressData : pressData

  const latestPressDisplayData = pressAnalysis?.metrics
    ? {
        ...latestPressData,
        target_cycle_time_sec: normalizeNumber(pressAnalysis.metrics.targetCycleTimeSec),
        actual_cycle_time_sec: normalizeNumber(pressAnalysis.metrics.actualCycleTimeSec),
        cycle_time_gap_sec: normalizeNumber(pressAnalysis.metrics.cycleTimeGapSec),
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

  const visiblePressData = pressDisplayData.slice(
    pressChartStartIndex,
    pressChartStartIndex + PRESS_CHART_WINDOW_SIZE,
  )

  const handlePressDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPressAnalysisDate(event.target.value)
    setPressChartStartIndex(0)
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
      setPressChartStartIndex(0)
    } catch (error) {
      setPressAnalysisError(error instanceof Error ? error.message : "프레스 이상 탐지 데이터를 불러오지 못했습니다.")
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

  const apiBodyData = useMemo(() => {
    return (bodyAnalysis?.chart ?? []).map((point: any) => {
      const dateTime = formatBackendTimestamp(point.timestamp)
      const isoForParsing = point.timestamp.includes("T") ? point.timestamp : point.timestamp.replace(" ", "T")
      const date = new Date(isoForParsing)
      const epochMs = Number.isFinite(date.getTime()) ? date.getTime() : NaN

      const vibrationPeak = normalizeNumber(point.vibrationPeak)
      const rawVibe = normalizeNumber(point.vibrationScore)
      const robotVibrationScore = rawVibe
      const riskScore = normalizeNumber(point.riskScore)

      const frequencyPeakBand = bodyAnalysis?.metrics?.frequencyPeakBand ?? "LOW"

      const rawTargetVibe = normalizeNumber(point.targetVibrationScore)
      const targetVibrationScore = rawTargetVibe
      const targetVibrationPeak = normalizeNumber(point.targetVibrationPeak ?? bodyAnalysis?.metrics?.targetVibrationPeak)

      return {
        time: dateTime.slice(11, 19),
        dateTime,
        timestamp: epochMs,
        target_cycle_time_sec: 0,
        actual_cycle_time_sec: 0,
        cycle_time_gap_sec: 0,
        timestamp_delay_sec: 0,
        risk_score: riskScore,
        overall_risk_score: riskScore,
        robot_motion_status: bodyAnalysis?.metrics?.robotMotionStatus ?? (point.isAbnormal ? "WARNING" : "NORMAL"),
        robot_operation_mode: bodyAnalysis?.metrics?.robotOperationMode ?? "AUTO",
        robot_vibration_score: robotVibrationScore,
        target_vibration_score: targetVibrationScore,
        target_frequency_peak_value: targetVibrationPeak,
        frequency_peak_band: frequencyPeakBand,
        frequency_peak_value: vibrationPeak,
        vibration_peak: vibrationPeak,
        target_vibration_peak: targetVibrationPeak,
        vibration_rms: normalizeNumber(point.vibrationRms),
        band_low: 0,
        band_mid: 0,
        band_high: 0,
      }
    })
  }, [bodyAnalysis]);

  const fetchBodyAnalysisData = useCallback(async (date?: string | null) => {
    setIsBodyAnalysisLoading(true)
    setBodyAnalysisError(null)
    try {
      const result = await fetchBodyAnalysis({ date })
      console.debug("fetchBodyAnalysis result:", result)
      setBodyAnalysis(result)
    } catch (error) {
      console.error("fetchBodyAnalysis error:", error)
      setBodyAnalysisError(error instanceof Error ? error.message : "차체 이상 탐지 데이터를 불러오지 못했습니다.")
    } finally {
      setIsBodyAnalysisLoading(false)
    }
  }, [])

  const sourceBodyData = bodyAnalysis ? apiBodyData : bodyRobotData

  const visibleBodyData = sourceBodyData.slice(
    bodyChartStartIndex,
    bodyChartStartIndex + BODY_CHART_WINDOW_SIZE,
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
    bodyDateOptions[0]

  const handleBodyDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDate = event.target.value
    setSelectedBodyAnalysisDate(selectedDate)
    // reset chart window to start of selected date; fetch will be triggered by effect
    setBodyChartStartIndex(0)
  }

  useEffect(() => {
    void fetchBodyAnalysisData(selectedBodyAnalysisDate)
  }, [fetchBodyAnalysisData, selectedBodyAnalysisDate])

  const lastChartPoint = sourceBodyData.length > 0
    ? sourceBodyData[sourceBodyData.length - 1]
    : bodyRobotData.length > 0
      ? bodyRobotData[bodyRobotData.length - 1]
      : {
          dateTime: "",
          robot_motion_status: "NORMAL",
          robot_operation_mode: "AUTO",
          robot_vibration_score: 0,
          target_vibration_score: 0.75,
          target_frequency_peak_value: 30,
          frequency_peak_band: "LOW",
          frequency_peak_value: 0,
          band_low: 0,
          band_mid: 0,
          band_high: 0,
          risk_score: 0,
        }

  const latestBodyData = bodyAnalysis?.metrics ? {
    ...lastChartPoint,
    robot_motion_status: bodyAnalysis.metrics.robotMotionStatus ?? lastChartPoint.robot_motion_status,
    robot_operation_mode: bodyAnalysis.metrics.robotOperationMode ?? lastChartPoint.robot_operation_mode,
    robot_vibration_score: bodyAnalysis.metrics.vibrationScore ?? lastChartPoint.robot_vibration_score,
    frequency_peak_band: bodyAnalysis.metrics.frequencyPeakBand ?? lastChartPoint.frequency_peak_band,
    frequency_peak_value: bodyAnalysis.metrics.frequencyPeakValue ?? bodyAnalysis.metrics.vibrationPeak ?? lastChartPoint.frequency_peak_value,
    vibration_peak: bodyAnalysis.metrics.vibrationPeak ?? lastChartPoint.vibration_peak,
    risk_score: bodyAnalysis.metrics.riskScore ?? lastChartPoint.risk_score,
  } : lastChartPoint;

  const latestBodySeverity = severityToRiskSeverity(
    bodyAnalysis?.metrics?.severity,
    Number(latestBodyData.risk_score ?? 0)
  )


  const handleBodyChartPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    bodyChartDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startIndex: bodyChartStartIndex,
      width: event.currentTarget.getBoundingClientRect().width,
    }
    setIsBodyChartDragging(true)
  }

  const paintKpis = {
    analysisCount: paintDashboard.summary?.analysisCount ?? 0,
    defectRate: paintDashboard.summary?.defectRate ?? 0,
    averageQuality: paintDashboard.summary?.averageSurfaceQualityScore ?? 0,
    riskAlarmCount: paintDashboard.summary?.alertCount ?? 0,
  }
  const paintChartData: PaintChartDatum[] = (paintDashboard.chart ?? []).map((row) => ({
    eventTime: row.time,
    time: formatApiTime(row.time),
    defectScore: row.defectScore ?? 0,
    defectScoreScaled: (row.defectScore ?? 0) <= 1 ? (row.defectScore ?? 0) * 100 : (row.defectScore ?? 0),
    surfaceQualityScore: row.surfaceQualityScore ?? 0,
    thicknessValue: row.thicknessValue ?? 0,
    riskScore: row.riskScore ?? 0,
    imagePosition: row.imagePosition,
    visionLabel: row.visionLabel,
    thermalStdTemp: row.thermalStdTemp,
    severity: row.severity,
  }))
  const assemblyData = assemblyDashboard.vehicles ?? []
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
      return {
        ...stage,
        defectRate: defectPredictionRows[0]?.defectProbability ?? stage.defectRate,
        targetProcess: bottleneckRows[0]?.processCode ?? stage.targetProcess,
      }
    }

    if (stage.rate === null) return stage

    const operationRate = stage.processCode
      ? operationRateByProcess[stage.processCode]?.operationRate
      : undefined
    const events =
      stage.processCode === "PRESS"
        ? (pressAnalysis?.chart?.filter(p => p.isAbnormal).length ?? 0)
        : stage.processCode === "BODY"
          ? (bodyAnalysis?.chart?.filter(p => p.isAbnormal).length ?? 0)
          : stage.processCode === "PAINT"
            ? paintAbnormalEventCount
            : stage.processCode === "ASSEMBLY"
              ? assemblyAbnormalEventCount
              : stage.events

    return {
      ...stage,
      rate: Number.isFinite(operationRate) ? Math.round(operationRate as number) : stage.rate,
      events,
      isBottleneck: mostBottleneckProcess ? stage.name === mostBottleneckProcess : stage.isBottleneck,
      bottleneckRiskLevel: mostBottleneckProcess ? mostBottleneckRiskLevel : "위험",
    }
  })
  const assemblyStartIndex = (assemblyPage - 1) * ASSEMBLY_PAGE_SIZE
  const assemblyTotalPages = Math.max(1, Math.ceil(assemblyData.length / ASSEMBLY_PAGE_SIZE))
  const pagedAssemblyData = assemblyData.slice(
    assemblyStartIndex,
    assemblyStartIndex + ASSEMBLY_PAGE_SIZE,
  )
  const paintDateOptions =
    selectedPaintDate && !paintAvailableDates.includes(selectedPaintDate)
      ? [selectedPaintDate, ...paintAvailableDates]
      : paintAvailableDates
  const assemblyDateOptions =
    selectedAssemblyDate && !assemblyAvailableDates.includes(selectedAssemblyDate)
      ? [selectedAssemblyDate, ...assemblyAvailableDates]
      : assemblyAvailableDates

  const fetchBottleneckRows = useCallback(async (cursor: number | null) => {
    if (cursor === null) return
    if (requestedBottleneckCursorsRef.current.has(cursor)) return
    if (!hasNextBottleneckRef.current && cursor !== BOTTLENECK_INITIAL_CURSOR) return

    requestedBottleneckCursorsRef.current.add(cursor)
    isBottleneckLoadingRef.current = true
    setIsBottleneckLoading(true)
    setBottleneckError(null)

    try {
      const result = await fetchBottleneckAnalysis({
        size: BOTTLENECK_PAGE_SIZE,
        cursor,
      })

      setBottleneckRows((prevRows) => [...prevRows, ...result.content])
      if (cursor === BOTTLENECK_INITIAL_CURSOR) {
        setMostBottleneckProcess(result.mostBottleneckProcess)
        setMostBottleneckRiskLevel(result.mostBottleneckRiskLevel)
      }
      hasNextBottleneckRef.current = result.hasNext
      setHasNextBottleneck(result.hasNext)
      setBottleneckCursor(result.hasNext ? result.nextCursor : null)
    } catch (error) {
      requestedBottleneckCursorsRef.current.delete(cursor)
      setBottleneckError(error instanceof Error ? error.message : "병목 분석 데이터를 불러오지 못했습니다.")
    } finally {
      isBottleneckLoadingRef.current = false
      setIsBottleneckLoading(false)
    }
  }, [])

  const handleBottleneckScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24

    if (isNearBottom && hasNextBottleneckRef.current && !isBottleneckLoadingRef.current) {
      void fetchBottleneckRows(bottleneckCursor)
    }
  }

  const fetchDefectPredictionRows = useCallback(async (cursor: number | null) => {
    if (cursor === null) return
    if (requestedDefectPredictionCursorsRef.current.has(cursor)) return
    if (!hasNextDefectPredictionRef.current && cursor !== DEFECT_TRANSFER_INITIAL_CURSOR) return

    requestedDefectPredictionCursorsRef.current.add(cursor)
    isDefectPredictionLoadingRef.current = true
    setIsDefectPredictionLoading(true)
    setDefectPredictionError(null)

    try {
      const result = await fetchDefectTransferPredictions({
        size: DEFECT_TRANSFER_PAGE_SIZE,
        cursor,
      })

      setDefectPredictionRows((prevRows) => {
        const existingVehicleIds = new Set(prevRows.map((row) => row.vehicleId))
        const nextRows = result.content.filter((row) => !existingVehicleIds.has(row.vehicleId))
        return [...prevRows, ...nextRows]
      })
      hasNextDefectPredictionRef.current = result.hasNext
      setHasNextDefectPrediction(result.hasNext)
      setDefectPredictionCursor(result.hasNext ? result.nextCursor : null)
    } catch (error) {
      requestedDefectPredictionCursorsRef.current.delete(cursor)
      setDefectPredictionError(error instanceof Error ? error.message : "불량 전이 예측 데이터를 불러오지 못했습니다.")
    } finally {
      isDefectPredictionLoadingRef.current = false
      setIsDefectPredictionLoading(false)
    }
  }, [])

  const handleDefectPredictionScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24

    if (isNearBottom && hasNextDefectPredictionRef.current && !isDefectPredictionLoadingRef.current) {
      void fetchDefectPredictionRows(defectPredictionCursor)
    }
  }

  const resetDefectCauses = useCallback(() => {
    requestedDefectCauseCursorsRef.current.clear()
    hasNextDefectCauseRef.current = true
    isDefectCauseLoadingRef.current = false
    setDefectCauseRows([])
    setDefectCauseCursor(DEFECT_TRANSFER_INITIAL_CURSOR)
    setHasNextDefectCause(true)
    setIsDefectCauseLoading(false)
    setDefectCauseError(null)
    setDefectCauseSummary(null)
  }, [])

  const fetchDefectCauseRows = useCallback(async (cursor: number | null, vehicleId: string | null) => {
    if (cursor === null) return
    const requestKey = vehicleId || "__default__"
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
        size: DEFECT_TRANSFER_PAGE_SIZE,
        cursor,
      })

      if (initializedDefectCauseVehicleRef.current !== requestKey) return

      setDefectCauseSummary(result)
      setDefectCauseRows((prevRows) => {
        const existingRanks = new Set(prevRows.map((row) => row.rank))
        const nextRows = result.content.filter((row) => !existingRanks.has(row.rank))
        return [...prevRows, ...nextRows]
      })
      hasNextDefectCauseRef.current = result.hasNext
      setHasNextDefectCause(result.hasNext)
      setDefectCauseCursor(result.hasNext ? result.nextCursor : null)
    } catch (error) {
      if (initializedDefectCauseVehicleRef.current !== requestKey) return
      requestedDefectCauseCursorsRef.current.delete(cursor)
      setDefectCauseError(error instanceof Error ? error.message : "SHAP 원인 분석 데이터를 불러오지 못했습니다.")
    } finally {
      if (initializedDefectCauseVehicleRef.current === requestKey) {
        isDefectCauseLoadingRef.current = false
        setIsDefectCauseLoading(false)
      }
    }
  }, [])

  const handleDefectCauseScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24

    if (isNearBottom && hasNextDefectCauseRef.current && !isDefectCauseLoadingRef.current) {
      void fetchDefectCauseRows(defectCauseCursor, selectedVehicle || null)
    }
  }

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
      const accessToken = sessionStorage.getItem("aims-auth-accessToken")
      if (!accessToken) {
        if (!ignore) {
          setOperationRateByProcess({})
        }
        return
      }

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
        }
      } catch (error) {
        console.error("Failed to load equipment operation rate", error)

        if (!ignore) {
          setOperationRateByProcess({})
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
    setPaintDashboard({
      ...emptyPaintDashboard,
      ...result,
      summary: {
        ...emptyPaintDashboard.summary,
        ...result?.summary,
      },
      chart: Array.isArray(result?.chart) ? result.chart : [],
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
      setPaintDashboardError("도장 대시보드 데이터를 불러오지 못했습니다.")
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
      setAssemblyDashboardError("조립 대시보드 데이터를 불러오지 못했습니다.")
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
          setPaintDatesError("도장 데이터 날짜 목록을 불러오지 못했습니다.")
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
          setAssemblyDatesError("조립 데이터 날짜 목록을 불러오지 못했습니다.")
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
    void fetchBottleneckRows(BOTTLENECK_INITIAL_CURSOR)
  }, [fetchBottleneckRows])

  useEffect(() => {
    const scrollElement = bottleneckScrollRef.current
    if (!scrollElement || !hasNextBottleneck || isBottleneckLoading || bottleneckCursor === null) return

    const hasScrollableContent = scrollElement.scrollHeight > scrollElement.clientHeight + 1
    if (!hasScrollableContent) {
      void fetchBottleneckRows(bottleneckCursor)
    }
  }, [bottleneckRows.length, bottleneckCursor, fetchBottleneckRows, hasNextBottleneck, isBottleneckLoading])

  useEffect(() => {
    void fetchDefectPredictionRows(DEFECT_TRANSFER_INITIAL_CURSOR)
  }, [fetchDefectPredictionRows])

  useEffect(() => {
    if (!selectedVehicle && defectPredictionVehicleOptions.length > 0) {
      setSelectedVehicle(defectPredictionVehicleOptions[0].vehicleId)
    }
  }, [selectedVehicle, defectPredictionVehicleOptions])

  useEffect(() => {
    const requestKey = selectedVehicle || "__default__"
    if (initializedDefectCauseVehicleRef.current === requestKey) return

    initializedDefectCauseVehicleRef.current = requestKey
    resetDefectCauses()
    void fetchDefectCauseRows(DEFECT_TRANSFER_INITIAL_CURSOR, selectedVehicle || null)
  }, [fetchDefectCauseRows, resetDefectCauses, selectedVehicle])

  useEffect(() => {
    const scrollElement = defectPredictionScrollRef.current
    if (!scrollElement || !hasNextDefectPrediction || isDefectPredictionLoading || defectPredictionCursor === null) return

    const hasScrollableContent = scrollElement.scrollHeight > scrollElement.clientHeight + 1
    if (!hasScrollableContent) {
      void fetchDefectPredictionRows(defectPredictionCursor)
    }
  }, [defectPredictionRows.length, defectPredictionCursor, fetchDefectPredictionRows, hasNextDefectPrediction, isDefectPredictionLoading])

  useEffect(() => {
    const scrollElement = defectCauseScrollRef.current
    if (!scrollElement || !hasNextDefectCause || isDefectCauseLoading || defectCauseCursor === null) return

    const hasScrollableContent = scrollElement.scrollHeight > scrollElement.clientHeight + 1
    if (!hasScrollableContent) {
      void fetchDefectCauseRows(defectCauseCursor, selectedVehicle || null)
    }
  }, [defectCauseRows.length, defectCauseCursor, fetchDefectCauseRows, hasNextDefectCause, isDefectCauseLoading, selectedVehicle])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = bodyChartDragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return

      event.preventDefault()
      const pixelsPerPoint = Math.max(5, drag.width / (BODY_CHART_WINDOW_SIZE - 1))
      const movedPoints = Math.round((event.clientX - drag.startX) / pixelsPerPoint)
      const maxStartIndex = Math.max(0, sourceBodyData.length - BODY_CHART_WINDOW_SIZE)

      setBodyChartStartIndex(
        Math.min(maxStartIndex, Math.max(0, drag.startIndex - movedPoints)),
      )
    }

    const handlePointerEnd = (event: PointerEvent) => {
      if (bodyChartDragRef.current?.pointerId !== event.pointerId) return
      bodyChartDragRef.current = null
      setIsBodyChartDragging(false)
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
    bottleneckScrollRef,
    handleBottleneckScroll,
    defectPredictionRows,
    selectedVehicle,
    defectCauseSummary,
    isDefectPredictionLoading,
    defectPredictionError,
    defectPredictionScrollRef,
    handleDefectPredictionScroll,
    setSelectedVehicle,
    defectPredictionVehicleOptions,
    defectCauseRows,
    isDefectCauseLoading,
    defectCauseError,
    defectCauseScrollRef,
    handleDefectCauseScroll,
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
