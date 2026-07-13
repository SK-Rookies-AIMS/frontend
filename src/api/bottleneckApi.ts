export const BOTTLENECK_PAGE_SIZE = 5
export const BOTTLENECK_INITIAL_CURSOR = 0

export type BottleneckRow = {
  rankNo: number
  processCode: string
  delayTime: number
  affectedVehicleCount: number
  riskScore: number
}

export type BottleneckDateOption = {
  date: string
  sampleEventId: string
}

export type BottleneckApiResponse = {
  success: boolean
  data?: {
    mostBottleneckProcess?: string
    mostBottleneckRiskLevel?: string
    date?: string | null
    dateOptions?: BottleneckDateOption[]
    content?: BottleneckRow[]
    hasNext?: boolean
    nextCursor?: number | null
  }
  message?: string
}

export async function fetchBottleneckAnalysis({
  date,
  size = BOTTLENECK_PAGE_SIZE,
  cursor = BOTTLENECK_INITIAL_CURSOR,
}: {
  date?: string | null
  size?: number
  cursor?: number
}) {
  const params = new URLSearchParams({
    size: String(size),
    cursor: String(cursor),
  })

  if (date) {
    params.set("date", date)
  }

  const response = await fetch(`/api/ai/process/bottleneck?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`병목 분석 API 요청 실패 (${response.status})`)
  }

  const result: BottleneckApiResponse = await response.json()

  if (!result.success) {
    throw new Error(result.message || "병목 분석 API 응답이 실패 상태입니다.")
  }

  return {
    mostBottleneckProcess: result.data?.mostBottleneckProcess ?? null,
    mostBottleneckRiskLevel: result.data?.mostBottleneckRiskLevel ?? null,
    date: result.data?.date ?? null,
    dateOptions: Array.isArray(result.data?.dateOptions) ? result.data.dateOptions : [],
    content: Array.isArray(result.data?.content) ? result.data.content : [],
    hasNext: Boolean(result.data?.hasNext),
    nextCursor: result.data?.nextCursor ?? null,
  }
}
