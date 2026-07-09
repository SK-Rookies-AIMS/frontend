// backend AlertRealtimeMessage record와 1:1 매핑
export interface AlertRealtimeMessage {
  eventId: string
  alertType: "PROCESS" | "EQUIPMENT"
  processCode: "PRESS" | "BODY" | "PAINT" | "ASSEMBLY"
  equipmentId: string | null
  eventKey: string
  riskScore: number
  occurrenceScore: number
  detectionScore: number
  /** 정렬 기준 — 높을수록 우선 표시 */
  priorityScore: number
  severity: "DANGER" | "CAUTION"
  title: string
  contents: string
  actionStatus: "INCOMPLETE" | "COMPLETED" | "NOT_NEEDED"
  scoreCalculatedAt: string
  createdAt: string
}
