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
  type PressAnomalyData,
  fetchPressAnomalyAnalysis,
} from "@/api/pressAnomalyApi"
import {
  type BodyAnomalyData,
  fetchBodyAnalysis,
} from "@/api/bodyAnalysisApi"
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
  { id: "01", name: "프레스", rate: 92, events: 22, status: "normal", color: "#22c55e" },
  { id: "02", name: "차체", rate: 89, events: 22, status: "warning", color: "#f59e0b" },
  { id: "03", name: "도장", rate: 87, events: 22, status: "danger", color: "#ef4444", isBottleneck: true },
  { id: "04", name: "의장", rate: 91, events: 22, status: "normal", color: "#22c55e" },
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

type PressDataPoint = PressAnchor

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
const PRESS_DAY_QUERY_LIMIT = 24 * 60 + 1
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

const paintData = [
  { eventTime: "2026-06-18T10:00:00", defectScore: 0.42, surfaceQualityScore: 88.4, thicknessValue: 121.2, thermalStdTemp: 2.1, visionLabel: "OK", riskScore: 34.2, severity: "NORMAL", isAbnormal: false, analysisMessage: "표면 품질 안정" },
  { eventTime: "2026-06-18T10:15:00", defectScore: 0.51, surfaceQualityScore: 84.7, thicknessValue: 119.8, thermalStdTemp: 2.8, visionLabel: "OK", riskScore: 41.5, severity: "NORMAL", isAbnormal: false, analysisMessage: "도장 두께 정상 범위" },
  { eventTime: "2026-06-18T10:30:00", defectScore: 0.68, surfaceQualityScore: 78.9, thicknessValue: 117.3, thermalStdTemp: 3.5, visionLabel: "DEFECT", riskScore: 67.4, severity: "WARNING", isAbnormal: true, analysisMessage: "비전 불량 라벨 감지" },
  { eventTime: "2026-06-18T10:45:00", defectScore: 0.87, surfaceQualityScore: 72.3, thicknessValue: 116.5, thermalStdTemp: 4.2, visionLabel: "DEFECT", riskScore: 88.5, severity: "CRITICAL", isAbnormal: true, analysisMessage: "표면 품질 점수 저하 및 두께 이상 의심" },
  { eventTime: "2026-06-18T11:00:00", defectScore: 0.73, surfaceQualityScore: 76.8, thicknessValue: 118.1, thermalStdTemp: 3.9, visionLabel: "DEFECT", riskScore: 72.8, severity: "WARNING", isAbnormal: true, analysisMessage: "불량 점수 상승" },
  { eventTime: "2026-06-18T11:15:00", defectScore: 0.46, surfaceQualityScore: 86.2, thicknessValue: 120.4, thermalStdTemp: 2.4, visionLabel: "OK", riskScore: 38.6, severity: "NORMAL", isAbnormal: false, analysisMessage: "후속 샘플 품질 회복" },
]

const paintChartData = paintData.map((row) => ({
  ...row,
  time: new Date(row.eventTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
  defectScoreScaled: row.defectScore <= 1 ? row.defectScore * 100 : row.defectScore,
}))

const paintAlert = [...paintData].sort((a, b) => b.riskScore - a.riskScore)[0]
const paintKpis = {
  analysisCount: paintData.length,
  defectRate: (paintData.filter((row) => row.isAbnormal || row.visionLabel === "DEFECT").length / paintData.length) * 100,
  averageQuality: paintData.reduce((sum, row) => sum + row.surfaceQualityScore, 0) / paintData.length,
  riskAlarmCount: paintData.filter((row) => row.severity === "WARNING" || row.severity === "CRITICAL").length,
}

const assemblyData = [
  { carId: "CAR-000001", expectedSequence: "A01>A02>A03>A04", actualSequence: "A01>A03>A02>A04", sequenceErrorCount: 1, missingPartCount: 0, fasteningErrorCount: 1, riskScore: 86.5, severity: "CRITICAL", isAbnormal: true, analysisMessage: "조립 순서 오류와 체결 오류 동시 감지" },
  { carId: "CAR-000002", expectedSequence: "A01>A02>A03>A04", actualSequence: "A01>A02>A03>A04", sequenceErrorCount: 0, missingPartCount: 0, fasteningErrorCount: 0, riskScore: 18.2, severity: "NORMAL", isAbnormal: false, analysisMessage: "정상 조립 완료" },
  { carId: "CAR-000003", expectedSequence: "A01>A02>A03>A04", actualSequence: "A01>A02>A04", sequenceErrorCount: 0, missingPartCount: 1, fasteningErrorCount: 0, riskScore: 61.3, severity: "WARNING", isAbnormal: true, analysisMessage: "부품 누락 의심" },
  { carId: "CAR-000004", expectedSequence: "A01>A02>A03>A04", actualSequence: "A01>A02>A03>A04", sequenceErrorCount: 0, missingPartCount: 0, fasteningErrorCount: 1, riskScore: 54.7, severity: "WARNING", isAbnormal: true, analysisMessage: "체결 토크 이상 감지" },
  { carId: "CAR-000005", expectedSequence: "A01>A02>A03>A04", actualSequence: "A01>A02>A03>A04", sequenceErrorCount: 0, missingPartCount: 0, fasteningErrorCount: 0, riskScore: 22.4, severity: "NORMAL", isAbnormal: false, analysisMessage: "정상 조립 진행" },
]

const assemblyAlert = [...assemblyData].sort((a, b) => b.riskScore - a.riskScore)[0]
const assemblyKpis = {
  carCount: new Set(assemblyData.map((row) => row.carId)).size,
  sequenceErrors: assemblyData.reduce((sum, row) => sum + row.sequenceErrorCount, 0),
  missingParts: assemblyData.reduce((sum, row) => sum + row.missingPartCount, 0),
  fasteningErrors: assemblyData.reduce((sum, row) => sum + row.fasteningErrorCount, 0),
  averageRisk: assemblyData.reduce((sum, row) => sum + row.riskScore, 0) / assemblyData.length,
}

type PaintChartDatum = (typeof paintChartData)[number]

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
        <p>vision_label: {row.visionLabel}</p>
      </div>
    </div>
  )
}

function formatSequence(sequence: string) {
  return sequence.split(">").join(" > ")
}

function getAssemblyStatus(severity: string, isAbnormal: boolean) {
  if (!isAbnormal) return "정상"
  if (severity === "CRITICAL") return "위험"
  if (severity === "WARNING") return "경고"
  return "이상"
}

function getStatusBadgeClass(severity: string, isAbnormal: boolean) {
  if (!isAbnormal) return "bg-success/20 text-success"
  if (severity === "CRITICAL") return "bg-destructive/20 text-destructive"
  if (severity === "WARNING") return "bg-warning/20 text-warning"
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
  }
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

  const visiblePressData = pressDisplayData

  const handlePressDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPressAnalysisDate(event.target.value)
  }

  const isFetchingRef = useRef(false)
  const fetchPressAnalysis = useCallback(async (date?: string | null) => {
    isFetchingRef.current = true
    setIsPressAnalysisLoading(true)
    setPressAnalysisError(null)

    try {
      const result = await fetchPressAnomalyAnalysis({
        date,
        limit: PRESS_DAY_QUERY_LIMIT,
      })
      setPressAnalysis(result)
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

  const apiBodyData = (bodyAnalysis?.chart ?? []).map((point) => {
      const dateTime = formatBackendTimestamp(point.timestamp)
      const isoForParsing = point.timestamp.includes("T") ? point.timestamp : point.timestamp.replace(" ", "T")
      const date = new Date(isoForParsing)
      const epochMs = Number.isFinite(date.getTime()) ? date.getTime() : NaN

      const frequencyPeakValue = normalizeNumber(point.frequencyPeakValue)
      const rawVibe = normalizeNumber(point.robotVibrationScore)
      const robotVibrationScore = rawVibe <= 1 ? Math.round(rawVibe * 100) : rawVibe
      const riskScore = normalizeNumber(point.riskScore)

      const frequencyPeakBand =
        frequencyPeakValue >= 7 ? "HIGH (80–120Hz)" : frequencyPeakValue >= 4.5 ? "MID (30–80Hz)" : "LOW (0–30Hz)"

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
        robot_motion_status: point.isAbnormal ? "WARNING" : "NORMAL",
        robot_operation_mode: bodyAnalysis?.metrics?.robotOperationMode ?? "AUTO",
        robot_vibration_score: robotVibrationScore,
        frequency_peak_band: bodyAnalysis?.metrics?.frequencyPeakBand ?? frequencyPeakBand,
        frequency_peak_value: frequencyPeakValue,
        band_low: Number((frequencyPeakValue * 0.42).toFixed(1)),
        band_mid: Number((frequencyPeakValue * 0.68).toFixed(1)),
        band_high: Number((frequencyPeakValue * (point.isAbnormal ? 1 : 0.35)).toFixed(1)),
      }
    })

  const fetchBodyAnalysisData = useCallback(async (date?: string | null) => {
    setIsBodyAnalysisLoading(true)
    setBodyAnalysisError(null)
    try {
      const result = await fetchBodyAnalysis({ date, limit: 60 })
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

  const latestBodyData = sourceBodyData.length > 0
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
          band_low: 0,
          band_mid: 0,
          band_high: 0,
          risk_score: 0,
        }

  const latestBodySeverity = getRiskSeverity(Number(latestBodyData.risk_score ?? 0))


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
    void fetchPressAnalysis(selectedPressAnalysisDate)
  }, [fetchPressAnalysis, selectedPressAnalysisDate])

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
          {processStages.map((stage, index) => (
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
                    <th className="text-center py-2">예측 불량 공정</th>
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
                        <td className="py-2 text-destructive text-center">{row.predictedDefectProcess}</td>
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
                  {defectPredictionVehicleOptions.length === 0 && (
                    <option value="">차량 없음</option>
                  )}
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
                      <p className="text-2xl font-bold">{latestPressDisplayData.target_cycle_time_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">실제 사이클 타임</p>
                      <p className="text-2xl font-bold text-warning">{latestPressDisplayData.actual_cycle_time_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">사이클 지연</p>
                      <p className="text-2xl font-bold text-destructive">{latestPressDisplayData.cycle_time_gap_sec >= 0 ? "+" : ""}{latestPressDisplayData.cycle_time_gap_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Timestamp 지연</p>
                      <p className="text-2xl font-bold text-destructive">{latestPressDisplayData.timestamp_delay_sec.toFixed(1)} <span className="text-sm font-normal">sec</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">위험도</p>
                      <p className="text-2xl font-bold text-warning">{latestPressDisplayData.risk_score.toFixed(1)} <span className="text-sm font-normal">/ 100</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">전체 위험도</p>
                      <p className={`text-2xl font-bold ${latestPressDisplayRisk.className}`}>{latestPressDisplayRisk.label}</p>
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
                        {pressDisplayAvailableDates.map((date) => (
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
                  {pressDisplayData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[210px] bg-muted/5 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
                      {isPressAnalysisLoading ? (
                        <p>프레스 분석 데이터를 불러오는 중입니다...</p>
                      ) : (
                        <>
                          <p>선택한 날짜({selectedPressDate})에 분석 데이터가 없습니다.</p>
                          {pressDisplayAvailableDates.length > 0 && (
                            <p className="text-xs mt-1 text-muted-foreground/60">다른 날짜를 선택하여 조회할 수 있습니다.</p>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div
                      className="chart-line-reveal select-none"
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
                            interval={Math.max(0, Math.floor(visiblePressData.length / 6) - 1)}
                            padding={{ left: 8, right: 12 }}
                            tick={{ fontSize: 10 }}
                            stroke="#64748b"
                            tickFormatter={formatChartTick}
                          />
                          <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                          <Tooltip
                            labelFormatter={(label: string) => {
                              // label은 dateTime 필드 값 ("YYYY-MM-DD HH:mm:ss" 또는 "YYYY-MM-DD HH:mm")
                              // 백엔드 eventTime과 일치하는 형식으로 표시
                              return `이벤트 시각 ${label}`
                            }}
                            formatter={(value, name) => [`${Number(value).toFixed(1)} sec`, name]}
                            contentStyle={{
                              backgroundColor: "var(--popover)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              color: "var(--popover-foreground)",
                            }}
                            labelStyle={{ color: "var(--popover-foreground)" }}
                            wrapperStyle={{
                              visibility: isPressChartHovered ? "visible" : "hidden",
                              pointerEvents: "none",
                            }}
                          />
                          <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="actual_cycle_time_sec" stroke="#00d4ff" name="실제 사이클 타임" dot={visiblePressData.length === 1 ? { r: 4 } : false} strokeWidth={2} />
                          <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="target_cycle_time_sec" stroke="#22c55e" name="기준 사이클 타임" dot={visiblePressData.length === 1 ? { r: 4 } : false} strokeWidth={2} />
                          <Line isAnimationActive={false} pathLength={1} type="monotone" dataKey="timestamp_delay_sec" stroke="#f59e0b" name="Timestamp 지연" dot={visiblePressData.length === 1 ? { r: 4 } : false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                    <p>
                      {isPressAnalysisLoading
                        ? "프레스 이상 탐지 데이터를 불러오는 중입니다."
                        : pressAnalysisError ?? "선택 날짜의 전체 시간 범위를 한눈에 표시합니다."}
                    </p>
                    {visiblePressData.length > 0 && (
                      <p className="shrink-0 font-medium text-foreground">
                        {visiblePressData[0]?.dateTime} ~ {visiblePressData[visiblePressData.length - 1]?.dateTime}
                      </p>
                    )}
                  </div>
                </div>
                <div className={`${pressAnalysis?.alert?.detected === false ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"} border rounded p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    {pressAnalysis?.alert?.detected === false ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                    <span className={`font-medium ${pressAnalysis?.alert?.detected === false ? "text-success" : "text-destructive"}`}>
                      {pressAnalysis?.alert?.title ?? (pressAnalysis?.alert?.detected === false ? "프레스 이상 없음" : "프레스 이상 정지 탐지")}
                    </span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {!pressAnalysis ? (
                      <li>• 이상 징후가 감지되지 않았습니다.</li>
                    ) : pressAnalysis.alert?.reasons && pressAnalysis.alert.reasons.length > 0 ? (
                      pressAnalysis.alert.reasons.map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))
                    ) : (
                      <li>• {pressAnalysis.alert?.detected === false ? "이상 징후가 감지되지 않았습니다." : "이상 사유가 존재하지 않습니다."}</li>
                    )}
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
                        {bodyDateOptions.map((date) => (
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
                      bodyAnalysis.alert.reasons.map((reason) => (
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
                  <h4 className="text-sm font-medium mb-2">도장 품질 지표 추이</h4>
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
                  </div>
                </div>
                <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-medium text-destructive">도장 품질 이상 감지</span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>- 비전 불량 라벨 감지: {paintAlert.visionLabel}</li>
                    <li>- 불량 점수 상승: defect_score {paintAlert.defectScore.toFixed(2)}</li>
                    <li>- 표면 품질 점수 저하: surface_quality_score {paintAlert.surfaceQualityScore.toFixed(1)}</li>
                    <li>- 도장 두께 이상 의심: thickness_value {paintAlert.thicknessValue.toFixed(1)}</li>
                    <li>- 온도 균일도 이상: thermal_std_temp {paintAlert.thermalStdTemp.toFixed(1)}</li>
                    <li>- 위험도/등급: {paintAlert.riskScore.toFixed(1)} / {paintAlert.severity}</li>
                    <li>- {paintAlert.analysisMessage}</li>
                  </ul>
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
                  <h4 className="text-sm font-medium mb-2">차량별 조립 분석 결과</h4>
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
                      {assemblyData.map((row) => (
                        <tr key={row.carId} className="border-t border-border">
                          <td className="py-2">{row.carId}</td>
                          <td className="py-2">{formatSequence(row.expectedSequence)}</td>
                          <td className="py-2">{formatSequence(row.actualSequence)}</td>
                          <td className={`text-center font-medium ${row.sequenceErrorCount > 0 ? "text-destructive" : "text-success"}`}>{row.sequenceErrorCount}</td>
                          <td className={`text-center font-medium ${row.missingPartCount > 0 ? "text-warning" : "text-success"}`}>{row.missingPartCount}</td>
                          <td className={`text-center font-medium ${row.fasteningErrorCount > 0 ? "text-destructive" : "text-success"}`}>{row.fasteningErrorCount}</td>
                          <td className={`text-center font-medium ${getRiskTextClass(row.riskScore)}`}>{row.riskScore.toFixed(1)}</td>
                          <td className="text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(row.severity, row.isAbnormal)}`}>
                              {getAssemblyStatus(row.severity, row.isAbnormal)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-medium text-destructive">조립 순서 오류 감지</span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>- 기준 순서: {formatSequence(assemblyAlert.expectedSequence)}</li>
                    <li>- 실제 순서: {formatSequence(assemblyAlert.actualSequence)}</li>
                    <li>- 순서 오류: {assemblyAlert.sequenceErrorCount}건</li>
                    <li>- 체결 오류: {assemblyAlert.fasteningErrorCount}건</li>
                    <li>- 누락 부품: {assemblyAlert.missingPartCount}건</li>
                    <li>- 위험도/등급: {assemblyAlert.riskScore.toFixed(1)} / {assemblyAlert.severity}</li>
                    <li>- {assemblyAlert.analysisMessage}</li>
                  </ul>
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
