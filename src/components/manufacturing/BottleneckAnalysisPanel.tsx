import type { ComponentType, RefObject, UIEvent } from "react"
import type { BottleneckRow } from "@/api/bottleneckApi"

type BottleneckAnalysisPanelProps = {
  rows: BottleneckRow[]
  selectedDate: string | null
  dateOptions: string[]
  isLoading: boolean
  error: string | null
  scrollRef: RefObject<HTMLDivElement | null>
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  onChangeDate: (date: string) => void
  formatDelayTime: (seconds: number) => string
  RiskIndicator: ComponentType<{ level: number }>
}

export function BottleneckAnalysisPanel({
  rows,
  selectedDate,
  dateOptions,
  isLoading,
  error,
  scrollRef,
  onScroll,
  onChangeDate,
  formatDelayTime,
  RiskIndicator,
}: BottleneckAnalysisPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">실시간 병목 분석</h3>
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
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="text-xs text-muted-foreground">
              <th className="py-2 text-left">순위</th>
              <th className="py-2 text-left">공정</th>
              <th className="py-2 text-center">평균 지연</th>
              <th className="py-2 text-center">영향 차량 수</th>
              <th className="py-2 text-center">위험도</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.rankNo}-${row.processCode}-${index}`} className="border-t border-border">
                <td className="py-2 font-bold">{row.rankNo}</td>
                <td className="py-2">{row.processCode}</td>
                <td className="text-center">{formatDelayTime(row.delayTime)}</td>
                <td className="text-center text-warning">{row.affectedVehicleCount}대</td>
                <td className="text-center">
                  <RiskIndicator level={row.riskScore} />
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr className="border-t border-border">
                <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                  병목 분석 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {isLoading && (
          <div className="py-3 text-center text-xs text-muted-foreground">
            병목 분석 데이터를 불러오는 중...
          </div>
        )}
        {error && <div className="py-3 text-center text-xs text-destructive">{error}</div>}
      </div>
    </div>
  )
}
