export type EventStatus =
  | "미조치"
  | "조치중"
  | "조치완료"

export interface EventItem {
  id: number
  title: string
  area: string
  subArea: string
  severity: "경고" | "위험"
  status: EventStatus
  aiScore: number
  equipmentNo: string
  eventDate: string
  eventCount: number
}

export interface EventPrioritySummary {
  periodDays: number
  averagePriorityScore: number
  averageRiskScore: number
  averageOccurrencePercentage: number
  actionCompletionRate: number
}

export interface EventPrioritySummaryResponse {
  success: boolean
  data: EventPrioritySummary | null
  message: string
  timestamp: string
}
