import type { ComponentType } from "react"

type ProcessStage = {
  id: string
  name: string
  rate: number | null
  events?: number
  status: string
  defectRate?: number
  targetProcess?: string
  isBottleneck?: boolean
}

type ProcessFlowSummaryProps = {
  stages: ProcessStage[]
  stageCount: number
  StageIcon: ComponentType<{ type: string }>
}

export function ProcessFlowSummary({ stages, stageCount, StageIcon }: ProcessFlowSummaryProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {stages.map((stage, index) => (
        <div key={stage.id} className="flex items-center">
          <div
            className={`relative min-w-[160px] rounded-lg border p-4 ${
              stage.isBottleneck ? "border-destructive bg-destructive/10" : "border-border bg-card"
            }`}
          >
            {stage.isBottleneck && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                병목 구간 (위험)
              </div>
            )}
            <div className="mb-2 flex items-center gap-2">
              <span className="font-bold text-primary">{stage.id}</span>
              <StageIcon type={stage.name} />
              <span className="font-medium">{stage.name}</span>
            </div>
            {stage.rate !== null ? (
              <>
                <div className="mb-1 flex justify-between text-sm text-muted-foreground">
                  <span>가동률</span>
                  <span className={stage.status === "danger" ? "text-destructive" : ""}>{stage.rate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">이상 이벤트</span>
                  <span className="font-medium text-destructive">{stage.events}건</span>
                </div>
              </>
            ) : (
              <>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">불량 전이 확률</span>
                  <span className="font-bold text-destructive">{stage.defectRate}%</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  병목 예상 구간 {stage.targetProcess}
                </div>
              </>
            )}
          </div>
          {index < stageCount - 1 && <div className="mx-2 text-xl text-primary">→</div>}
        </div>
      ))}
    </div>
  )
}
