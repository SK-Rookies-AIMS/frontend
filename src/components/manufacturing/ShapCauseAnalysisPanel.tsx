import type { ComponentType, RefObject, UIEvent } from "react"
import type {
  DefectTransferCauseData,
  DefectTransferCauseRow,
  DefectTransferPredictionRow,
} from "@/api/defectTransferApi"

type ShapCauseAnalysisPanelProps = {
  selectedVehicle: string
  vehicleOptions: DefectTransferPredictionRow[]
  selectedDate: string | null
  dateOptions: string[]
  defectCauseSummary: DefectTransferCauseData | null
  defectCauseRows: DefectTransferCauseRow[]
  isLoading: boolean
  error: string | null
  scrollRef: RefObject<HTMLDivElement | null>
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  onChangeVehicle: (vehicleId: string) => void
  onChangeDate: (date: string) => void
  formatProbability: (value: number) => string
  getDefectRiskTextClass: (riskLevel: string, probability?: number) => string
  ImpactBar: ComponentType<{ value: number }>
}

export function ShapCauseAnalysisPanel({
  selectedVehicle,
  vehicleOptions,
  selectedDate,
  dateOptions,
  defectCauseSummary,
  defectCauseRows,
  isLoading,
  error,
  scrollRef,
  onScroll,
  onChangeVehicle,
  onChangeDate,
  formatProbability,
  getDefectRiskTextClass,
  ImpactBar,
}: ShapCauseAnalysisPanelProps) {
  const causeRows = (() => {
    const merged = [
      ...(defectCauseSummary?.content ?? []),
      ...(defectCauseSummary?.representativeCause ? [defectCauseSummary.representativeCause] : []),
      ...(defectCauseSummary?.detailCauses ?? []),
      ...defectCauseRows,
    ]

    const seen = new Set<string>()
    return merged
      .filter((row) => {
        const key = `${row.rank}-${row.feature}-${row.message}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => a.rank - b.rank)
  })()

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">AI 원인 분석 및 불량 전이 확률</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>날짜</span>
          <select
            className="appearance-none rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none transition-colors hover:border-primary/60"
            value={selectedDate ?? dateOptions[0] ?? ""}
            onChange={(event) => onChangeDate(event.target.value)}
            disabled={dateOptions.length === 0}
          >
            {dateOptions.length === 0 ? (
              <option value="">{isLoading ? "날짜 불러오는 중..." : "조회 가능한 날짜 없음"}</option>
            ) : (
              dateOptions.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-3">
        <span className="text-muted-foreground text-sm">선택 차량</span>
        <select
          className="appearance-none rounded border border-border bg-secondary py-1.5 pl-3 pr-8 text-sm"
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

        <div className="ml-auto text-right">
          <span className="text-muted-foreground text-xs">예측 공정 전이 확률</span>
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

      <h4 className="mt-3 mb-1 text-xs text-muted-foreground">주요 원인</h4>
      <div ref={scrollRef} className="h-[114px] overflow-y-auto pr-1" onScroll={onScroll}>
        <div className="space-y-2">
          {causeRows.map((factor, index) => (
            <div key={`${factor.rank}-${factor.feature}-${index}`} className="flex items-center gap-2">
              <span className="w-5 text-xs font-medium">{factor.rank}.</span>
              <span className="flex-1 text-xs" title={factor.message}>
                {factor.label || factor.feature} {factor.value}
              </span>
              <span className="text-xs text-muted-foreground">영향도 {factor.impact.toFixed(4)}</span>
              <ImpactBar value={Math.abs(factor.impact)} />
            </div>
          ))}
          {!isLoading && causeRows.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              SHAP 주요 원인 데이터가 없습니다.
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
