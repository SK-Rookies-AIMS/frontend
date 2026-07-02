"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Header } from "@/components/dashboard/header"
import { Mascot } from "@/components/dashboard/mascot"
import { Footer } from "@/components/dashboard/footer"
import { AuthGuard } from "@/components/auth-guard"
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
  getAssemblyDashboard,
  getAssemblyAvailableDates,
  getEquipmentOperationRate,
  getPaintAvailableDates,
  getPaintDashboard,
} from "@/api/processDashboardApi"
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

const formatChartTick = (dateTime: string) => `${dateTime.slice(5, 10)} ${dateTime.slice(11)}`

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

type PressDataPoint = PressAnchor

// 5분 기준값 사이를 1분 단위로 보간해 모든 시각에서 상세 값을 확인할 수 있게 한다.
const pressData: PressDataPoint[] = pressAnchorData.flatMap((current, index) => {
  const next = pressAnchorData[index + 1]
  if (!next) return [current]

  return Array.from({ length: 5 }, (_, minuteOffset) => {
    const ratio = minuteOffset / 5
    const date = new Date(current.timestamp + minuteOffset * 60_000)
    const interpolate = (key: "target_cycle_time_sec" | "actual_cycle_time_sec" | "cycle_time_gap_sec" | "timestamp_delay_sec" | "risk_score" | "overall_risk_score") =>
      Number((current[key] + (next[key] - current[key]) * ratio).toFixed(1))

    return {
      time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
      dateTime: formatDateTime(date),
      timestamp: date.getTime(),
      target_cycle_time_sec: interpolate("target_cycle_time_sec"),
      actual_cycle_time_sec: interpolate("actual_cycle_time_sec"),
      cycle_time_gap_sec: interpolate("cycle_time_gap_sec"),
      timestamp_delay_sec: interpolate("timestamp_delay_sec"),
      risk_score: interpolate("risk_score"),
      overall_risk_score: interpolate("overall_risk_score"),
    }
  })
})

const latestPressData = pressData[pressData.length - 1]

const getRiskSeverity = (score: number) => {
  if (score >= 70) return { label: "심각", className: "text-destructive" }
  if (score >= 50) return { label: "경고", className: "text-warning" }
  if (score >= 30) return { label: "주의", className: "text-warning" }
  return { label: "정상", className: "text-success" }
}

const latestOverallRisk = getRiskSeverity(latestPressData.overall_risk_score)
const PRESS_CHART_WINDOW_SIZE = 31
const pressAvailableDates = Array.from(
  new Set(pressData.map((item) => item.dateTime.slice(0, 10))),
).reverse()

// body_analysis_result 형태를 반영한 차체 로봇 1분 단위 목 데이터
const bodyRobotData = pressData.map((point, index) => {
  const vibrationWave = Math.abs(Math.sin(index / 17))
  const isLatestRisk = index >= pressData.length - 8
  const robotVibrationScore = isLatestRisk
    ? Math.min(86, 68 + (index - (pressData.length - 8)) * 2.6)
    : Math.round(22 + vibrationWave * 34 + point.timestamp_delay_sec * 2)
  const frequencyPeakValue = Number(
    (1.8 + vibrationWave * 3.4 + (isLatestRisk ? 3.2 : 0)).toFixed(1),
  )
  const riskScore = Math.round(
    Math.min(92, robotVibrationScore * 0.72 + frequencyPeakValue * 3),
  )

  return {
    ...point,
    robot_motion_status: isLatestRisk ? "COLLISION_RISK" : robotVibrationScore >= 55 ? "WARNING" : "NORMAL",
    robot_operation_mode: isLatestRisk ? "AUTO_MANUAL_STOPPED" : "AUTO",
    robot_vibration_score: robotVibrationScore,
    frequency_peak_band: frequencyPeakValue >= 7 ? "HIGH (80–120Hz)" : frequencyPeakValue >= 4.5 ? "MID (30–80Hz)" : "LOW (0–30Hz)",
    frequency_peak_value: frequencyPeakValue,
    band_low: Number((frequencyPeakValue * 0.42).toFixed(1)),
    band_mid: Number((frequencyPeakValue * 0.68).toFixed(1)),
    band_high: Number((frequencyPeakValue * (isLatestRisk ? 1 : 0.35)).toFixed(1)),
    risk_score: riskScore,
    severity: riskScore >= 70 ? "CRITICAL" : riskScore >= 50 ? "WARNING" : "NORMAL",
  }
})

const latestBodyData = bodyRobotData[bodyRobotData.length - 1]
const latestBodySeverity = getRiskSeverity(latestBodyData.risk_score)
const BODY_CHART_WINDOW_SIZE = 31
const bodyAvailableDates = Array.from(
  new Set(bodyRobotData.map((item) => item.dateTime.slice(0, 10))),
).reverse()

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

function PaintTooltip({
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

export default function ManufacturingPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState("press")
  const [selectedVehicle, setSelectedVehicle] = useState("")
  const [bottleneckRows, setBottleneckRows] = useState<BottleneckRow[]>([])
  const [bottleneckCursor, setBottleneckCursor] = useState<number | null>(BOTTLENECK_INITIAL_CURSOR)
  const [hasNextBottleneck, setHasNextBottleneck] = useState(true)
  const [isBottleneckLoading, setIsBottleneckLoading] = useState(false)
  const [bottleneckError, setBottleneckError] = useState<string | null>(null)
  const requestedBottleneckCursorsRef = useRef<Set<number>>(new Set())
  const hasNextBottleneckRef = useRef(true)
  const isBottleneckLoadingRef = useRef(false)
  const bottleneckScrollRef = useRef<HTMLDivElement | null>(null)
  const [defectPredictionRows, setDefectPredictionRows] = useState<DefectTransferPredictionRow[]>([])
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
  const [pressChartStartIndex, setPressChartStartIndex] = useState(
    Math.max(0, pressData.length - PRESS_CHART_WINDOW_SIZE),
  )
  const [isPressChartDragging, setIsPressChartDragging] = useState(false)
  const [isPressChartHovered, setIsPressChartHovered] = useState(false)
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

  const visiblePressData = pressData.slice(
    pressChartStartIndex,
    pressChartStartIndex + PRESS_CHART_WINDOW_SIZE,
  )
  const selectedPressDate =
    visiblePressData[Math.floor(visiblePressData.length / 2)]?.dateTime.slice(0, 10) ??
    pressAvailableDates[0]

  const handlePressDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDate = event.target.value
    const firstIndex = pressData.findIndex((item) => item.dateTime.startsWith(selectedDate))
    const lastIndex = pressData.reduce(
      (foundIndex, item, index) =>
        item.dateTime.startsWith(selectedDate) ? index : foundIndex,
      -1,
    )

    if (firstIndex < 0 || lastIndex < 0) return

    setPressChartStartIndex(
      Math.max(firstIndex, lastIndex - PRESS_CHART_WINDOW_SIZE + 1),
    )
  }

  const handlePressChartPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    pressChartDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startIndex: pressChartStartIndex,
      width: event.currentTarget.getBoundingClientRect().width,
    }
    setIsPressChartDragging(true)
  }

  const visibleBodyData = bodyRobotData.slice(
    bodyChartStartIndex,
    bodyChartStartIndex + BODY_CHART_WINDOW_SIZE,
  )
  const selectedBodyDate =
    visibleBodyData[Math.floor(visibleBodyData.length / 2)]?.dateTime.slice(0, 10) ??
    bodyAvailableDates[0]

  const handleBodyDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDate = event.target.value
    const firstIndex = bodyRobotData.findIndex((item) => item.dateTime.startsWith(selectedDate))
    const lastIndex = bodyRobotData.reduce(
      (foundIndex, item, index) =>
        item.dateTime.startsWith(selectedDate) ? index : foundIndex,
      -1,
    )

    if (firstIndex < 0 || lastIndex < 0) return

    setBodyChartStartIndex(
      Math.max(firstIndex, lastIndex - BODY_CHART_WINDOW_SIZE + 1),
    )
  }

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
    if (stage.rate === null) return stage

    const operationRate = stage.processCode
      ? operationRateByProcess[stage.processCode]?.operationRate
      : undefined
    const events =
      stage.processCode === "PAINT"
        ? paintAbnormalEventCount
        : stage.processCode === "ASSEMBLY"
          ? assemblyAbnormalEventCount
          : stage.events

    return {
      ...stage,
      rate: Number.isFinite(operationRate) ? Math.round(operationRate as number) : stage.rate,
      events,
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
    let ignore = false

    const fetchEquipmentOperationRate = async () => {
      try {
        const result: EquipmentOperationRateData = await getEquipmentOperationRate()
        const items = Array.isArray(result?.items) ? result.items : []
        const nextOperationRateByProcess = items.reduce<Record<string, EquipmentOperationRateItem>>(
          (acc, item) => {
            if (item?.processCode) {
              acc[item.processCode] = item
            }
            return acc
          },
          {},
        )

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

  const applyPaintDashboard = (result: Partial<PaintDashboardData> | null | undefined) => {
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

  const applyAssemblyDashboard = (result: Partial<AssemblyDashboardData> | null | undefined) => {
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
      const maxStartIndex = bodyRobotData.length - BODY_CHART_WINDOW_SIZE

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
  }, [])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = pressChartDragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return

      event.preventDefault()
      const pixelsPerPoint = Math.max(5, drag.width / (PRESS_CHART_WINDOW_SIZE - 1))
      const movedPoints = Math.round((event.clientX - drag.startX) / pixelsPerPoint)
      const maxStartIndex = pressData.length - PRESS_CHART_WINDOW_SIZE

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
  }, [])

  const defectPredictionVehicleOptions = defectPredictionRows.filter(
    (row, index, rows) => rows.findIndex((item) => item.vehicleId === row.vehicleId) === index,
  )

  return (
    <AuthGuard>
    <div className="min-h-screen bg-background flex flex-col">
      <Header currentTime={currentTime} />
      <main className="flex-1 p-4 overflow-auto relative">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-lg font-semibold">전체 공정 흐름 요약 및 병목 탐지 <span className="text-muted-foreground font-normal">(실시간)</span></h1>
        </div>

        {/* Process Stages */}
        <div className="flex items-center gap-2 mb-6">
          {topProcessStages.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              <div
                className={`relative rounded-lg border p-4 min-w-[160px] ${
                  stage.isBottleneck
                    ? "border-destructive bg-destructive/10"
                    : "border-border bg-card"
                }`}
              >
                {stage.isBottleneck && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap">
                    병목 구간 (위험)
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-primary font-bold">{stage.id}</span>
                  <StageIcon type={stage.name} />
                  <span className="font-medium">{stage.name}</span>
                </div>
                {stage.rate !== null ? (
                  <>
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>가동률</span>
                      <span className={stage.status === "danger" ? "text-destructive" : ""}>{stage.rate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">이상 이벤트</span>
                      <span className="text-destructive font-medium">{stage.events}건</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">불량 전이 확률</span>
                      <span className="text-destructive font-bold">{stage.defectRate}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      병목 예상 구간 {stage.targetProcess}
                    </div>
                  </>
                )}
              </div>
              {index < processStages.length - 1 && (
                <div className="mx-2 text-primary text-xl">→</div>
              )}
            </div>
          ))}
        </div>

        {/* Analysis Section - 3 Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* 1. Bottleneck Analysis */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-sm font-medium mb-2">실시간 병목 분석</h3>
            <div
              ref={bottleneckScrollRef}
              className="h-[206px] overflow-y-auto pr-1"
              onScroll={handleBottleneckScroll}
            >
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-muted-foreground text-xs">
                    <th className="text-left py-2">순위</th>
                    <th className="text-left py-2">공정</th>
                    <th className="text-center py-2">평균 지연</th>
                    <th className="text-center py-2">영향 차량 수</th>
                    <th className="text-center py-2">위험도</th>
                  </tr>
                </thead>
                <tbody>
                  {bottleneckRows.map((row, index) => (
                    <tr key={`${row.rankNo}-${row.processCode}-${index}`} className="border-t border-border">
                      <td className="py-2 font-bold">{row.rankNo}</td>
                      <td className="py-2">{row.processCode}</td>
                      <td className="text-center">{formatDelayTime(row.delayTime)}</td>
                      <td className="text-center text-warning">{row.affectedVehicleCount}대</td>
                      <td className="text-center">
                        <RiskIndicator level={row.riskScore} />
                      </td>
                    </tr>
                  ))}
                  {!isBottleneckLoading && bottleneckRows.length === 0 && (
                    <tr className="border-t border-border">
                      <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                        병목 분석 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {isBottleneckLoading && (
                <div className="py-3 text-center text-xs text-muted-foreground">
                  병목 분석 데이터를 불러오는 중...
                </div>
              )}
              {bottleneckError && (
                <div className="py-3 text-center text-xs text-destructive">
                  {bottleneckError}
                </div>
              )}
            </div>
          </div>

          {/* 2. Defect Prediction */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-sm font-medium mb-2">불량 전이 예측</h3>
            <div
              ref={defectPredictionScrollRef}
              className="h-[206px] overflow-y-auto pr-1"
              onScroll={handleDefectPredictionScroll}
            >
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-muted-foreground text-xs">
                    <th className="text-left py-2">Vehicle ID</th>
                    <th className="text-left py-2">현재 공정</th>
                    <th className="text-left py-2">예측 불량 공정</th>
                    <th className="text-center py-2">불량 확률</th>
                    <th className="text-center py-2">예상 시간</th>
                  </tr>
                </thead>
                <tbody>
                  {defectPredictionRows.map((row, index) => {
                    const isSelected =
                      selectedVehicle === row.vehicleId ||
                      (!selectedVehicle && defectCauseSummary?.vehicleId === row.vehicleId)
                    return (
                      <tr
                        key={`${row.vehicleId}-${row.carMasterId}-${index}`}
                        onClick={() => setSelectedVehicle(selectedVehicle === row.vehicleId ? "" : row.vehicleId)}
                        className={`border-t border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                          isSelected ? "bg-primary/10" : ""
                        }`}
                      >
                        <td className="py-2 font-medium">{row.vehicleId}</td>
                        <td className="py-2">{row.currentProcess}</td>
                        <td className="py-2 text-destructive">{row.predictedDefectProcess}</td>
                        <td className="text-center">
                          <span className={`font-bold ${getDefectRiskTextClass(row.riskLevel, row.defectProbability)}`}>
                            {formatProbability(row.defectProbability)}
                          </span>
                        </td>
                        <td className="text-center text-muted-foreground">{row.expectedTime}</td>
                      </tr>
                    )
                  })}
                  {!isDefectPredictionLoading && defectPredictionRows.length === 0 && (
                    <tr className="border-t border-border">
                      <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                        불량 전이 예측 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {isDefectPredictionLoading && (
                <div className="py-3 text-center text-xs text-muted-foreground">
                  불량 전이 예측 데이터를 불러오는 중...
                </div>
              )}
              {defectPredictionError && (
                <div className="py-3 text-center text-xs text-destructive">
                  {defectPredictionError}
                </div>
              )}
            </div>
          </div>

          {/* 3. AI Analysis */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-sm font-medium mb-2">SHAP 기반 AI 원인 분석</h3>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-muted-foreground text-sm">선택 차량</span>
              <div className="relative">
                <select
                  className="appearance-none bg-secondary border border-border rounded py-1.5 pl-3 pr-8 text-sm"
                  value={selectedVehicle}
                  onChange={(event) => setSelectedVehicle(event.target.value)}
                  disabled={defectPredictionVehicleOptions.length === 0}
                >
                  <option value="">예측 불량 확률 최고 차량</option>
                  {defectPredictionVehicleOptions.map((row) => (
                    <option key={`${row.vehicleId}-${row.carMasterId}`} value={row.vehicleId}>
                      {row.vehicleId}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2" />
              </div>

              <div className="ml-auto text-right">
                <span className="text-muted-foreground text-xs">예측 불량 확률</span>
                <p className={`text-2xl font-bold ${getDefectRiskTextClass(defectCauseSummary?.riskLevel ?? "", defectCauseSummary?.predictedDefectProbability)}`}>
                  {defectCauseSummary ? formatProbability(defectCauseSummary.predictedDefectProbability) : "-"}
                  {defectCauseSummary?.riskLevel && <span className="text-sm font-normal"> ({defectCauseSummary.riskLevel})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>현재 공정: {defectCauseSummary?.currentProcess ?? "-"}</span>
              <span>예측 공정: {defectCauseSummary?.predictedDefectProcess ?? "-"}</span>
            </div>
            <h4 className="text-xs text-muted-foreground mb-1 mt-3">주요 원인</h4>
            <div
              ref={defectCauseScrollRef}
              className="h-[114px] overflow-y-auto pr-1"
              onScroll={handleDefectCauseScroll}
            >
              <div className="space-y-2">
                {defectCauseRows.map((factor) => (
                  <div key={`${factor.rank}-${factor.feature}`} className="flex items-center gap-2">
                    <span className="text-xs w-4">{factor.rank}</span>
                    <span className="text-xs flex-1" title={factor.message}>
                      {factor.label || factor.feature}: {factor.value}
                    </span>
                    <span className="text-xs text-muted-foreground">(영향도 {factor.impact})</span>
                    <ImpactBar value={Math.abs(factor.impact)} />
                  </div>
                ))}
                {!isDefectCauseLoading && defectCauseRows.length === 0 && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    SHAP 원인 분석 데이터가 없습니다.
                  </div>
                )}
              </div>
              {isDefectCauseLoading && (
                <div className="py-3 text-center text-xs text-muted-foreground">
                  SHAP 원인 분석 데이터를 불러오는 중...
                </div>
              )}
              {defectCauseError && (
                <div className="py-3 text-center text-xs text-destructive">
                  {defectCauseError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Tabs Section */}
        <div className="bg-card border border-border rounded-lg">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("press")}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "press" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              2.1 프레스 | 이상 정지 탐지
            </button>
            <button
              onClick={() => setActiveTab("body")}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "body" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              2.2 차체 | 로봇 이상 동작 및 충돌 위험 탐지
            </button>
            <button
              onClick={() => setActiveTab("paint")}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "paint" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              2.3 도장 | 도장 품질 이상 탐지
            </button>
            <button
              onClick={() => setActiveTab("assembly")}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "assembly" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              2.4 의장 조립 | 조립 순서 오류 탐지
            </button>
          </div>

          <div className="p-4">
            {activeTab === "press" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <div className="flex items-center gap-8 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">기준 사이클 타임</p>
                      <p className="text-2xl font-bold">{latestPressData.target_cycle_time_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">실제 사이클 타임</p>
                      <p className="text-2xl font-bold text-warning">{latestPressData.actual_cycle_time_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">사이클 지연</p>
                      <p className="text-2xl font-bold text-destructive">+{latestPressData.cycle_time_gap_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Timestamp 지연</p>
                      <p className="text-2xl font-bold text-destructive">{latestPressData.timestamp_delay_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">위험도</p>
                      <p className="text-2xl font-bold text-warning">{latestPressData.risk_score} <span className="text-sm font-normal">/ 100</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">전체 위험도</p>
                      <p className={`text-2xl font-bold ${latestOverallRisk.className}`}>{latestOverallRisk.label}</p>
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
                        {pressAvailableDates.map((date) => (
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
                  <div
                    className={`chart-line-reveal select-none ${isPressChartDragging ? "cursor-grabbing" : "cursor-grab"}`}
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
                          interval={4}
                          padding={{ left: 8, right: 12 }}
                          tick={{ fontSize: 10 }}
                          stroke="#64748b"
                          tickFormatter={formatChartTick}
                        />
                        <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                        <Tooltip
                          labelFormatter={(label) => `분석 시각 ${label}`}
                          formatter={(value, name) => [`${Number(value).toFixed(1)} sec`, name]}
                          contentStyle={{
                            backgroundColor: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            color: "var(--popover-foreground)",
                          }}
                          labelStyle={{ color: "var(--popover-foreground)" }}
                          wrapperStyle={{
                            visibility:
                              isPressChartHovered && !isPressChartDragging ? "visible" : "hidden",
                            pointerEvents: "none",
                          }}
                        />
                        <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="actual_cycle_time_sec" stroke="#00d4ff" name="실제 사이클 타임" dot={false} strokeWidth={2} />
                        <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="target_cycle_time_sec" stroke="#22c55e" name="기준 사이클 타임" dot={false} strokeWidth={2} />
                        <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="timestamp_delay_sec" stroke="#f59e0b" name="Timestamp 지연" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                    <p>그래프 안을 좌우로 드래그하면 전날 날짜와 시간까지 이동할 수 있습니다.</p>
                    <p className="shrink-0 font-medium text-foreground">
                      {visiblePressData[0]?.dateTime} ~ {visiblePressData[visiblePressData.length - 1]?.dateTime}
                    </p>
                  </div>
                </div>
                <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-medium text-destructive">프레스 이상 정지 탐지</span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• count_increase_yn = true</li>
                    <li>• 실제 사이클 타임이 기준보다 초과</li>
                    <li>• Timestamp 지연 발생</li>
                    <li>• press_analysis_result 기준 이상 정지 의심</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "body" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">로봇 모션 상태</p>
                      <p className="whitespace-nowrap text-base font-bold text-destructive">{latestBodyData.robot_motion_status}</p>
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
                        {bodyAvailableDates.map((date) => (
                          <option key={date} value={date}>{date}</option>
                        ))}
                      </select>
                    </label>
                  </div>
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
                <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-medium text-destructive">차체 로봇 충돌 위험 탐지</span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• robot_motion_status = COLLISION_RISK</li>
                    <li>• robot_operation_mode = AUTO_MANUAL_STOPPED</li>
                    <li>• 피크 진동값 급증 ({latestBodyData.frequency_peak_value.toFixed(1)} mm/s)</li>
                    <li>• 고주파 대역 이상 감지 ({latestBodyData.frequency_peak_band})</li>
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
            )}

            {activeTab === "paint" && (
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
                        {paintDateOptions.map((date) => (
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
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#64748b" />
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
                      {paintDashboard.alert.messages.map((message) => (
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
            )}

            {activeTab === "assembly" && (
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
                        {assemblyDateOptions.map((date) => (
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
                      ) : pagedAssemblyData.map((row, index) => {
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
                          onClick={() => setAssemblyPage((page) => Math.max(1, page - 1))}
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
                          onClick={() => setAssemblyPage((page) => Math.min(assemblyTotalPages, page + 1))}
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
                      {assemblyDashboard.alert.messages.map((message) => (
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
            )}
          </div>
        </div>

        {/* Mascot */}
        <Mascot />
      </main>
      <Footer />
    </div>
    </AuthGuard>
  )
}

function StageIcon({ type }: { type: string }) {
  switch (type) {
    case "프레스":
      return (
        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="2" width="16" height="6" rx="1" />
          <rect x="8" y="8" width="8" height="10" />
          <rect x="6" y="18" width="12" height="4" rx="1" />
        </svg>
      )
    case "차체":
      return (
        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 17 L8 13 L16 13 L19 17" />
          <rect x="4" y="17" width="16" height="3" rx="1" />
          <path d="M9 13 L10 9 L14 9 L15 13" />
        </svg>
      )
    case "도장":
      return (
        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="10" width="8" height="12" rx="2" />
          <path d="M11 14 L18 6 L21 9 L14 17" />
        </svg>
      )
    case "의장":
      return (
        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 17 L8 13 L16 13 L19 17" />
          <rect x="4" y="17" width="16" height="3" rx="1" />
          <rect x="9" y="6" width="6" height="7" rx="1" />
        </svg>
      )
    case "연계 분석":
      return (
        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8 L12 12 L15 14" />
        </svg>
      )
    default:
      return null
  }
}

function RiskIndicator({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-sm ${
            i <= level
              ? level >= 4 ? "bg-destructive" : level >= 2 ? "bg-warning" : "bg-success"
              : "bg-secondary"
          }`}
        />
      ))}
    </div>
  )
}

function ImpactBar({ value }: { value: number }) {
  const getColor = (val: number) => {
    if (val >= 0.3) return "bg-destructive"
    if (val >= 0.2) return "bg-orange-500"
    if (val >= 0.15) return "bg-warning"
    return "bg-success"
  }
  
  return (
    <div className="w-20 h-3 bg-secondary rounded overflow-hidden">
      <div className={`h-full ${getColor(value)}`} style={{ width: `${value * 200}%` }} />
    </div>
  )
}
