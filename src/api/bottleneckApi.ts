export const BOTTLENECK_PAGE_SIZE = 5
export const BOTTLENECK_INITIAL_CURSOR = 0

export type BottleneckRow = {
  rankNo: number
  processCode: string
  delayTime: number
  affectedVehicleCount: number
  riskScore: number
}

export type BottleneckApiResponse = {
  success: boolean
  data?: {
    content?: BottleneckRow[]
    hasNext?: boolean
    nextCursor?: number | null
  }
  message?: string
}

export async function fetchBottleneckAnalysis({
  size = BOTTLENECK_PAGE_SIZE,
  cursor = BOTTLENECK_INITIAL_CURSOR,
}: {
  size?: number
  cursor?: number
}) {
  const params = new URLSearchParams({
    size: String(size),
    cursor: String(cursor),
  })

  const response = await fetch(`/api/ai/process/bottleneck?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`병목 분석 API 요청 실패 (${response.status})`)
  }

  const result: BottleneckApiResponse = await response.json()

  if (!result.success) {
    throw new Error(result.message || "병목 분석 API 응답이 실패 상태입니다.")
  }

  return {
    content: Array.isArray(result.data?.content) ? result.data.content : [],
    hasNext: Boolean(result.data?.hasNext),
    nextCursor: result.data?.nextCursor ?? null,
  }
}
