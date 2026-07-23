import { getStoredAccessToken } from "./authStorage"

export const BODY_ANALYSIS_DEFAULT_LIMIT = 30

export type BodyFrequencyZone = {
  avg: number
  max: number
}

export type BodyAnalysisMetrics = {
  robotMotionStatus: string | null
  robotOperationMode: string | null
  avgRobotVibrationScore?: number | null
  robotVibrationScore?: number | null
  targetVibrationScore: number | null
  vibrationScore: number | null
  avgVibrationPeak?: number | null
  targetVibrationPeak: number | null
  vibrationPeak: number | null
  avgVibrationRms?: number | null
  vibrationRms: number | null
  avgFrequencyPeakValue?: number | null
  frequencyPeakValue: number | null
  frequencyPeakBand: string | null
  vibrationWarningLine?: number | null
  vibrationDangerLine?: number | null
  peakWarningLine?: number | null
  peakDangerLine?: number | null
  riskScore: number | null
  riskScoreScale: string | null
  severity: string | null
  frequencyBands?: Record<string, number> | null
}

export type BodyAnalysisChartPoint = {
  eventId: string
  analysisId: string
  timestamp: string
  targetVibrationScore: number | null
  vibrationScore: number | null
  targetVibrationPeak: number | null
  vibrationPeak: number | null
  vibrationRms: number | null
  riskScore: number | null
  isAbnormal: boolean
  severity: string | null
}

export type BodyFrequencyChartPoint = {
  timestamp: string
  band: string
  value: number
  targetValue: number
  warningValue?: number | null
  dangerValue?: number | null
}

export type BodySeriesPoint = {
  eventId: string
  analysisId: string
  timestamp: string
  value: number | null
  secondaryValue?: number | null
  warningLine?: number | null
  dangerLine?: number | null
  riskScore?: number | null
  isAbnormal?: boolean
  severity?: string | null
}

export type BodySeriesChart = {
  title: string
  metricKey: string
  unit: string
  points: BodySeriesPoint[]
}

export type BodyFrequencyZoneChartPoint = {
  zone: string
  range: string
  description?: string | null
  avg: number
  max: number
  targetValue?: number | null
  warningValue?: number | null
  dangerValue?: number | null
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

export type BodyRiskScoreChartPoint = {
  eventId: string
  analysisId: string
  timestamp: string
  targetVibrationScore: number | null
  vibrationScore: number | null
  riskScore: number | null
  isAbnormal: boolean
  severity: string | null
}

export type BodyVibrationChartPoint = {
  eventId: string
  analysisId: string
  timestamp: string
  targetVibrationPeak: number | null
  vibrationPeak: number | null
  vibrationRms: number | null
}

export type BodyAnomalyData = {
  date?: string | null
  from?: string | null
  to?: string | null
  previousEndAt?: string | null
  dateOptions: BodyDateOption[]
  metrics: BodyAnalysisMetrics | null
  chart?: BodyAnalysisChartPoint[]
  charts?: {
    robotVibration?: BodySeriesChart | null
    frequencyPeak?: BodySeriesChart | null
  }
  riskScoreChart?: BodyRiskScoreChartPoint[]
  vibrationChart?: BodyVibrationChartPoint[]
  frequencyChart?: BodyFrequencyChartPoint[]
  frequencyZoneChart?: BodyFrequencyZoneChartPoint[]
  frequencyZoneAnalysis?: Record<string, BodyFrequencyZone>
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
    const charts = result.data.charts ?? {}
    return {
      ...result.data,
      dateOptions: Array.isArray(result.data.dateOptions) ? result.data.dateOptions : [],
      chart: Array.isArray(result.data.chart) ? result.data.chart : [],
      charts: {
        robotVibration: charts.robotVibration
          ? {
              ...charts.robotVibration,
              points: Array.isArray(charts.robotVibration.points) ? charts.robotVibration.points : [],
            }
          : null,
        frequencyPeak: charts.frequencyPeak
          ? {
              ...charts.frequencyPeak,
              points: Array.isArray(charts.frequencyPeak.points) ? charts.frequencyPeak.points : [],
            }
          : null,
      },
      riskScoreChart: Array.isArray(result.data.riskScoreChart) ? result.data.riskScoreChart : [],
      vibrationChart: Array.isArray(result.data.vibrationChart) ? result.data.vibrationChart : [],
      frequencyChart: Array.isArray(result.data.frequencyChart) ? result.data.frequencyChart : [],
      frequencyZoneChart: Array.isArray(result.data.frequencyZoneChart) ? result.data.frequencyZoneChart : [],
      alert: result.data.alert ?? null,
    } as BodyAnomalyData
  }

  if (!response.ok) {
    throw new Error(result?.message || `차체 이상 탐지 API 요청 실패 (${response.status})`)
  }

  throw new Error(result?.message || "차체 이상 탐지 API 응답이 실패 상태입니다.")
}
