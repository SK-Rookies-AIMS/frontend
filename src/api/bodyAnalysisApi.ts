import { getStoredAccessToken } from "./authStorage"

export const BODY_ANALYSIS_DEFAULT_LIMIT = 30

export type BodyAnalysisMetrics = {
  robotMotionStatus: string | null
  robotOperationMode: string | null
  robotVibrationScore: number | null
  frequencyPeakValue: number | null
  frequencyPeakBand: string | null
  riskScore: number | null
  riskScoreScale: string | null
  severity: string | null
  frequencyBands?: { LOW?: number; MEDIUM?: number; HIGH?: number } | null
}

export type BodyAnalysisChartPoint = {
  eventId: string
  analysisId: string
  timestamp: string
  robotVibrationScore: number | null
  frequencyPeakValue: number | null
  riskScore: number | null
  isAbnormal: boolean
  severity: string | null
}

export type BodyAnalysisAlert = {
  detected: boolean
  title?: string | null
  reasons: string[]
}

export type BodyDateOption = {
  date: string
  sampleEventId: string
}

export type BodyAnomalyData = {
  date?: string | null
  from?: string | null
  to?: string | null
  previousEndAt?: string | null
  dateOptions: BodyDateOption[]
  metrics: BodyAnalysisMetrics | null
  chart: BodyAnalysisChartPoint[]
  alert: BodyAnalysisAlert | null
}

type ApiEnvelope<T> = {
  success: boolean
  data?: T
  message?: string
}

export async function fetchBodyAnalysis({
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
  const response = await fetch(`/api/process/body/analysis${queryString ? `?${queryString}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  let result: ApiEnvelope<Partial<BodyAnomalyData>> | null = null
  try {
    result = await response.json()
  } catch (e) {
    // JSON 파싱 실패 시
  }

  if (result && result.success && result.data) {
    return {
      ...result.data,
      dateOptions: Array.isArray(result.data.dateOptions) ? result.data.dateOptions : [],
      chart: Array.isArray(result.data.chart) ? result.data.chart : [],
      alert: result.data.alert ?? null,
    } as BodyAnomalyData
  }

  if (!response.ok) {
    throw new Error(result?.message || `차체 이상 탐지 API 요청 실패 (${response.status})`)
  }

  throw new Error(result?.message || "차체 이상 탐지 API 응답이 실패 상태입니다.")
}
