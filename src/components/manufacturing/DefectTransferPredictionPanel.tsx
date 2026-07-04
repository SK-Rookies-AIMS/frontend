import type { RefObject, UIEvent } from "react"
import type { DefectTransferCauseData, DefectTransferPredictionRow } from "@/api/defectTransferApi"

type DefectTransferPredictionPanelProps = {
  rows: DefectTransferPredictionRow[]
  selectedVehicle: string
  defectCauseSummary: DefectTransferCauseData | null
  isLoading: boolean
  error: string | null
  scrollRef: RefObject<HTMLDivElement | null>
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  onSelectVehicle: (vehicleId: string) => void
  formatProbability: (value: number) => string
  getDefectRiskTextClass: (riskLevel: string, probability?: number) => string
}

export function DefectTransferPredictionPanel({
  rows,
  selectedVehicle,
  defectCauseSummary,
  isLoading,
  error,
  scrollRef,
  onScroll,
  onSelectVehicle,
  formatProbability,
  getDefectRiskTextClass,
}: DefectTransferPredictionPanelProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <h3 className="text-sm font-medium mb-2">불량 전이 예측</h3>
      <div ref={scrollRef} className="h-[206px] overflow-y-auto pr-1" onScroll={onScroll}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="text-muted-foreground text-xs">
              <th className="text-left py-2">Vehicle ID</th>
              <th className="text-left py-2">현재 공정</th>
              <th className="text-center py-2">예측 불량 공정</th>
              <th className="text-center py-2">불량 확률</th>
              <th className="text-center py-2">예상 시간</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isSelected =
                selectedVehicle === row.vehicleId ||
                (!selectedVehicle && defectCauseSummary?.vehicleId === row.vehicleId)
              return (
                <tr
                  key={`${row.vehicleId}-${row.carMasterId}-${index}`}
                  onClick={() => onSelectVehicle(row.vehicleId)}
                  className={`border-t border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                    isSelected ? "bg-primary/10" : ""
                  }`}
                >
                  <td className="py-2 font-medium">{row.vehicleId}</td>
                  <td className="py-2">{row.currentProcess}</td>
                  <td className="py-2 text-destructive text-center">{row.predictedDefectProcess}</td>
                  <td className="text-center">
                    <span className={`font-bold ${getDefectRiskTextClass(row.riskLevel, row.defectProbability)}`}>
                      {formatProbability(row.defectProbability)}
                    </span>
                  </td>
                  <td className="text-center text-muted-foreground">{row.expectedTime}</td>
                </tr>
              )
            })}
            {!isLoading && rows.length === 0 && (
              <tr className="border-t border-border">
                <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                  불량 전이 예측 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {isLoading && (
          <div className="py-3 text-center text-xs text-muted-foreground">
            불량 전이 예측 데이터를 불러오는 중...
          </div>
        )}
        {error && <div className="py-3 text-center text-xs text-destructive">{error}</div>}
      </div>
    </div>
  )
}
