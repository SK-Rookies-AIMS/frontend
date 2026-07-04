import { ChevronDown } from "lucide-react"
import type { ComponentType, RefObject, UIEvent } from "react"
import type {
  DefectTransferCauseData,
  DefectTransferCauseRow,
  DefectTransferPredictionRow,
} from "@/api/defectTransferApi"

type ShapCauseAnalysisPanelProps = {
  selectedVehicle: string
  vehicleOptions: DefectTransferPredictionRow[]
  defectCauseSummary: DefectTransferCauseData | null
  defectCauseRows: DefectTransferCauseRow[]
  isLoading: boolean
  error: string | null
  scrollRef: RefObject<HTMLDivElement | null>
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  onChangeVehicle: (vehicleId: string) => void
  formatProbability: (value: number) => string
  getDefectRiskTextClass: (riskLevel: string, probability?: number) => string
  ImpactBar: ComponentType<{ value: number }>
}

export function ShapCauseAnalysisPanel({
  selectedVehicle,
  vehicleOptions,
  defectCauseSummary,
  defectCauseRows,
  isLoading,
  error,
  scrollRef,
  onScroll,
  onChangeVehicle,
  formatProbability,
  getDefectRiskTextClass,
  ImpactBar,
}: ShapCauseAnalysisPanelProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <h3 className="text-sm font-medium mb-2">SHAP 기반 AI 원인 분석</h3>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-muted-foreground text-sm">선택 차량</span>
        <div className="relative">
          <select
            className="appearance-none bg-secondary border border-border rounded py-1.5 pl-3 pr-8 text-sm"
            value={selectedVehicle}
            onChange={(event) => onChangeVehicle(event.target.value)}
            disabled={vehicleOptions.length === 0}
          >
            {vehicleOptions.length === 0 && <option value="">차량 없음</option>}
            {vehicleOptions.map((row) => (
              <option key={`${row.vehicleId}-${row.carMasterId}`} value={row.vehicleId}>
                {row.vehicleId}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2" />
        </div>

        <div className="ml-auto text-right">
          <span className="text-muted-foreground text-xs">예측 불량 확률</span>
          <p
            className={`text-2xl font-bold ${getDefectRiskTextClass(
              defectCauseSummary?.riskLevel ?? "",
              defectCauseSummary?.predictedDefectProbability,
            )}`}
          >
            {defectCauseSummary ? formatProbability(defectCauseSummary.predictedDefectProbability) : "-"}
            {defectCauseSummary?.riskLevel && (
              <span className="text-sm font-normal"> ({defectCauseSummary.riskLevel})</span>
            )}
          </p>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span>현재 공정: {defectCauseSummary?.currentProcess ?? "-"}</span>
        <span>예측 공정: {defectCauseSummary?.predictedDefectProcess ?? "-"}</span>
      </div>
      <h4 className="text-xs text-muted-foreground mb-1 mt-3">주요 원인</h4>
      <div ref={scrollRef} className="h-[114px] overflow-y-auto pr-1" onScroll={onScroll}>
        <div className="space-y-2">
          {defectCauseRows.map((factor) => (
            <div key={`${factor.rank}-${factor.feature}`} className="flex items-center gap-2">
              <span className="text-xs w-4">{factor.rank}</span>
              <span className="text-xs flex-1" title={factor.message}>
                {factor.label || factor.feature} {factor.value}
              </span>
              <span className="text-xs text-muted-foreground">영향도 {factor.impact}</span>
              <ImpactBar value={Math.abs(factor.impact)} />
            </div>
          ))}
          {!isLoading && defectCauseRows.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              SHAP 원인 분석 데이터가 없습니다.
            </div>
          )}
        </div>
        {isLoading && (
          <div className="py-3 text-center text-xs text-muted-foreground">
            SHAP 원인 분석 데이터를 불러오는 중...
          </div>
        )}
        {error && <div className="py-3 text-center text-xs text-destructive">{error}</div>}
      </div>
    </div>
  )
}
