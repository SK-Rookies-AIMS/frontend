import { getStoredAccessToken } from "./authStorage"

export const PRESS_ANOMALY_DEFAULT_LIMIT = 30

export type PressAnomalySeverity = "NORMAL" | "WARNING" | "CRITICAL" | string | null

export type PressAnomalyMetrics = {
  targetCycleTimeSec: number | null
  actualCycleTimeSec: number | null
  cycleTimeGapSec: number | null
  timestampDelaySec: number | null
  riskScore: number | null
  riskScoreScale: string | null
  severity: PressAnomalySeverity
}

export type PressAnomalyChartPoint = {
  eventId: string
  analysisId: string
  timestamp: string
  targetCycleTimeSec: number | null
  actualCycleTimeSec: number | null
  cycleTimeGapSec: number | null
  timestampDelaySec: number | null
  riskScore: number | null
  countIncreaseYn: boolean
  isAbnormal: boolean
  severity: PressAnomalySeverity
}

export type PressAnomalyAlert = {
  detected: boolean
  title: string | null
  reasons: string[]
}

export type PressDateOption = {
  date: string
  sampleEventId: string
}

export type PressAnomalyData = {
  date: string | null
  from: string | null
  to: string | null
  previousEndAt: string | null
  dateOptions: PressDateOption[]
  metrics: PressAnomalyMetrics | null
  chart: PressAnomalyChartPoint[]
  alert: PressAnomalyAlert | null
}

type ApiEnvelope<T> = {
  success: boolean
  data?: T
  message?: string
}

export async function fetchPressAnomalyAnalysis({
  date,
  from,
  to,
  endAt,
  limit,
}: {
  date?: string | null
  from?: string | null
  to?: string | null
  endAt?: string | null
  limit?: number
} = {}) {
  const params = new URLSearchParams()

  if (date) params.set("date", date)
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  if (endAt) params.set("endAt", endAt)
  if (limit) params.set("limit", String(limit))

  const token = getStoredAccessToken()
  const queryString = params.toString()
  const response = await fetch(`/api/process/press/analysis${queryString ? `?${queryString}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  type ResultType = ApiEnvelope<Omit<PressAnomalyData, "chart" | "alert" | "dateOptions"> & {
    dateOptions?: PressDateOption[]
    chart?: PressAnomalyChartPoint[]
    alert?: PressAnomalyAlert | null
  }>

  let result: ResultType | null = null
  try {
    result = await response.json()
  } catch (e) {
    // JSON parsing failed
  }

  if (result && result.success && result.data) {
    return {
      ...result.data,
      dateOptions: Array.isArray(result.data.dateOptions) ? result.data.dateOptions : [],
      chart: Array.isArray(result.data.chart) ? result.data.chart : [],
      alert: result.data.alert ?? null,
    }
  }

  if (!response.ok) {
    throw new Error(result?.message || `프레스 이상 탐지 API 요청 실패 (${response.status})`)
  }

  throw new Error(result?.message || "프레스 이상 탐지 API 응답이 실패 상태입니다.")
}
