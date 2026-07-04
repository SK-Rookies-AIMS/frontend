export interface ManualResponse {
  title: string
  summary: string
  action_steps: string[]
  precautions: string[]
}

export interface ManualApiResponse {
  event: {
    eventId: string
    title: string
    severity: string
    process: string
    equipmentId: string
    riskScore: number
  }

  manual: ManualResponse
}