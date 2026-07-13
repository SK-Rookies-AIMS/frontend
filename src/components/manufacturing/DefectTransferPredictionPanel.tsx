import type { RefObject, UIEvent } from "react"
import type { DefectTransferCauseData, DefectTransferPredictionRow } from "@/api/defectTransferApi"

type DefectTransferPredictionPanelProps = {
  rows: DefectTransferPredictionRow[]
  selectedVehicle: string
  selectedDate: string | null
  dateOptions: string[]
  defectCauseSummary: DefectTransferCauseData | null
  isLoading: boolean
  error: string | null
  scrollRef: RefObject<HTMLDivElement | null>
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  onSelectVehicle: (vehicleId: string) => void
  onChangeDate: (date: string) => void
  formatProbability: (value: number) => string
  getDefectRiskTextClass: (riskLevel: string, probability?: number) => string
}

export function DefectTransferPredictionPanel({
  rows,
  selectedVehicle,
  selectedDate,
  dateOptions,
  defectCauseSummary,
  isLoading,
  error,
  scrollRef,
  onScroll,
  onSelectVehicle,
  onChangeDate,
  formatProbability,
  getDefectRiskTextClass,
}: DefectTransferPredictionPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">공정 불량 예측</h3>
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

      <div ref={scrollRef} className="h-[206px] overflow-y-auto pr-1" onScroll={onScroll}>
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[33%]" />
            <col className="w-[22%]" />
            <col className="w-[20%]" />
            <col className="w-[15%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="sticky top-0 bg-card">
            <tr className="text-xs text-muted-foreground">
              <th className="py-2 text-left">Vehicle ID</th>
              <th className="py-2 text-center">현재 공정</th>
              <th className="py-2 text-center">예측 불량 공정</th>
              <th className="py-2 text-center">불량 확률</th>
              <th className="py-2 text-center">예상 시점</th>
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
                  className={`cursor-pointer border-t border-border transition-colors hover:bg-muted/50 ${
                    isSelected ? "bg-primary/10" : ""
                  }`}
                >
                  <td className="py-2 font-medium">{row.vehicleId}</td>
                  <td className="py-2 text-center truncate">{row.currentProcess}</td>
                  <td className="py-2 text-center text-destructive whitespace-nowrap truncate">{row.predictedDefectProcess}</td>
                  <td className="text-center">
                    <span className={`font-bold ${getDefectRiskTextClass(row.riskLevel, row.defectProbability)}`}>
                      {formatProbability(row.defectProbability)}
                    </span>
                  </td>
                  <td className="text-center whitespace-nowrap text-muted-foreground">{row.expectedTime}</td>
                </tr>
              )
            })}
            {!isLoading && rows.length === 0 && (
              <tr className="border-t border-border">
                <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                  불량 예측 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {isLoading && (
          <div className="py-3 text-center text-xs text-muted-foreground">
            불량 예측 데이터를 불러오는 중...
          </div>
        )}
        {error && <div className="py-3 text-center text-xs text-destructive">{error}</div>}
      </div>
    </div>
  )
}
