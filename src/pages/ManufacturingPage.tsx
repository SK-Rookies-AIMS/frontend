"use client"

import { useState, useEffect, useRef } from "react"
import { Header } from "@/components/dashboard/header"
import { Mascot } from "@/components/dashboard/mascot"
import { Footer } from "@/components/dashboard/footer"
import { AuthGuard } from "@/components/auth-guard"
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

const bottleneckData = [
  { rank: 1, process: "도장 (L3)", delay: 12.4, affected: 128, risk: 5 },
  { rank: 2, process: "차체 (S12)", delay: 9.8, affected: 92, risk: 4 },
  { rank: 3, process: "프레스 (P4)", delay: 6.1, affected: 54, risk: 3 },
  { rank: 4, process: "의장 (A1)", delay: 4.3, affected: 32, risk: 2 },
  { rank: 5, process: "검사 (I2)", delay: 2.1, affected: 18, risk: 1 },
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

export default function ManufacturingPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState("press")
  const [selectedVehicle, setSelectedVehicle] = useState("VIN-001245")
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">실시간 병목 분석</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs">
                  <th className="text-left py-2">순위</th>
                  <th className="text-left py-2">공정</th>
                  <th className="text-center py-2">평균 지연</th>
                  <th className="text-center py-2">영향 차량 수</th>
                  <th className="text-center py-2">위험도</th>
                </tr>
              </thead>
              <tbody>
                {bottleneckData.map((row) => (
                  <tr key={row.rank} className="border-t border-border">
                    <td className="py-2 font-bold">{row.rank}</td>
                    <td className="py-2">{row.process}</td>
                    <td className="text-center">{row.delay}초</td>
                    <td className="text-center text-warning">{row.affected}대</td>
                    <td className="text-center">
                      <RiskIndicator level={row.risk} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. Defect Prediction */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">불량 전이 예측</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs">
                  <th className="text-left py-2">VIN / Lot ID</th>
                  <th className="text-left py-2">현재 공정</th>
                  <th className="text-left py-2">예측 불량 공정</th>
                  <th className="text-center py-2">불량 확률</th>
                  <th className="text-center py-2">예상 발생 시간</th>
                </tr>
              </thead>
              <tbody>
                {defectPredictionData.map((row) => (
                  <tr key={row.vinId} className="border-t border-border">
                    <td className="py-2">{row.vinId}</td>
                    <td className="py-2">{row.currentProcess}</td>
                    <td className="py-2 text-destructive">{row.predictedProcess}</td>
                    <td className="text-center">
                      <span className={`font-bold ${row.probability >= 70 ? "text-destructive" : "text-warning"}`}>
                        {row.probability}%
                      </span>
                    </td>
                    <td className="text-center text-muted-foreground">{row.stepsAhead}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 3. AI Analysis */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">AI 원인 분석</h3>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-muted-foreground text-sm">선택 차량</span>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-secondary border border-border rounded text-sm">
                {selectedVehicle}
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="ml-auto text-right">
                <span className="text-muted-foreground text-xs">예측 불량 확률</span>
                <p className="text-2xl font-bold text-destructive">78% <span className="text-sm font-normal">(위험)</span></p>
              </div>
            </div>
            
            <h4 className="text-xs text-muted-foreground mb-2">주요 원인</h4>
            <div className="space-y-2">
              {aiAnalysisFactors.map((factor, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs w-4">{index + 1}</span>
                  <span className="text-xs flex-1">{factor.name}</span>
                  <span className="text-xs text-muted-foreground">(영향도 {factor.impact})</span>
                  <ImpactBar value={factor.impact} />
                </div>
              ))}
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
