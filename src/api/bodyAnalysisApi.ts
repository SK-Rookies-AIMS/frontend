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
  limit = BODY_ANALYSIS_DEFAULT_LIMIT,
}: {
  date?: string | null
  from?: string | null
  to?: string | null
  endAt?: string | null
  limit?: number
} = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
  })

  if (date) params.set("date", date)
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  if (endAt) params.set("endAt", endAt)

  const response = await fetch(`/api/process/body/analysis?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`차체 이상 탐지 API 요청 실패 (${response.status})`)
  }

  const result: ApiEnvelope<Partial<BodyAnomalyData>> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.message || "차체 이상 탐지 API 응답이 실패 상태입니다.")
  }

  return {
    ...result.data,
    dateOptions: Array.isArray(result.data.dateOptions) ? result.data.dateOptions : [],
    chart: Array.isArray(result.data.chart) ? result.data.chart : [],
    alert: result.data.alert ?? null,
  } as BodyAnomalyData
}
