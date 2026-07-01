export const DEFECT_TRANSFER_PAGE_SIZE = 5
export const DEFECT_TRANSFER_INITIAL_CURSOR = 0

export type DefectTransferPredictionRow = {
  vehicleId: string
  carMasterId: number
  currentProcess: string
  predictedDefectProcess: string
  defectProbability: number
  expectedTime: string
  riskLevel: string
}

export type DefectTransferCauseRow = {
  rank: number
  feature: string
  label: string
  value: string
  impact: number
  message: string
}

export type DefectTransferCauseData = {
  vehicleId: string
  carMasterId: number
  predictedDefectProbability: number
  riskLevel: string
  currentProcess: string
  predictedDefectProcess: string
  transferProbability: number
  content: DefectTransferCauseRow[]
  hasNext: boolean
  nextCursor: number | null
}

type ApiEnvelope<T> = {
  success: boolean
  data?: T
  message?: string
}

export async function fetchDefectTransferPredictions({
  size = DEFECT_TRANSFER_PAGE_SIZE,
  cursor = DEFECT_TRANSFER_INITIAL_CURSOR,
}: {
  size?: number
  cursor?: number
}) {
  const params = new URLSearchParams({
    size: String(size),
    cursor: String(cursor),
  })

  const response = await fetch(`/api/process/defect-transfer/predictions?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`불량 전이 예측 API 요청 실패 (${response.status})`)
  }

  const result: ApiEnvelope<{
    content?: DefectTransferPredictionRow[]
    hasNext?: boolean
    nextCursor?: number | null
  }> = await response.json()

  if (!result.success) {
    throw new Error(result.message || "불량 전이 예측 API 응답이 실패 상태입니다.")
  }

  return {
    content: Array.isArray(result.data?.content) ? result.data.content : [],
    hasNext: Boolean(result.data?.hasNext),
    nextCursor: result.data?.nextCursor ?? null,
  }
}

export async function fetchDefectTransferCauses({
  vehicleId,
  size = DEFECT_TRANSFER_PAGE_SIZE,
  cursor = DEFECT_TRANSFER_INITIAL_CURSOR,
}: {
  vehicleId?: string | null
  size?: number
  cursor?: number
}) {
  const params = new URLSearchParams({
    size: String(size),
    cursor: String(cursor),
  })

  if (vehicleId) {
    params.set("vehicleId", vehicleId)
  }

  const response = await fetch(`/api/process/defect-transfer/causes?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`SHAP 원인 분석 API 요청 실패 (${response.status})`)
  }

  const result: ApiEnvelope<Omit<DefectTransferCauseData, "content" | "hasNext" | "nextCursor"> & {
    content?: DefectTransferCauseRow[]
    hasNext?: boolean
    nextCursor?: number | null
  }> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.message || "SHAP 원인 분석 API 응답이 실패 상태입니다.")
  }

  return {
    ...result.data,
    content: Array.isArray(result.data.content) ? result.data.content : [],
    hasNext: Boolean(result.data.hasNext),
    nextCursor: result.data.nextCursor ?? null,
  }
}
