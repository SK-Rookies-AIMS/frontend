export interface ManualStep {
    step: number
    action: string
    reason: string
    warning: string
}

export interface ManualResponse {
    title: string
    summary: string
    steps: ManualStep[]
    precautions: string[]
    prevention: string[]
    completion_check: string[]
    escalation: string
    estimated_time: string
    difficulty: string
}

export interface EventInfo {
    eventId: string;
    title: string;
    severity: string;
    process: string;
    equipmentId: number | null;
    riskScore: number | null;
}

export interface ManualApiResponse {
  event: EventInfo;
  manual: ManualResponse
}