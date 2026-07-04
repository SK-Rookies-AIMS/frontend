import type { ComponentType, RefObject, UIEvent } from "react"
import type { BottleneckRow } from "@/api/bottleneckApi"

type BottleneckAnalysisPanelProps = {
  rows: BottleneckRow[]
  isLoading: boolean
  error: string | null
  scrollRef: RefObject<HTMLDivElement | null>
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  formatDelayTime: (seconds: number) => string
  RiskIndicator: ComponentType<{ level: number }>
}

export function BottleneckAnalysisPanel({
  rows,
  isLoading,
  error,
  scrollRef,
  onScroll,
  formatDelayTime,
  RiskIndicator,
}: BottleneckAnalysisPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h3 className="mb-2 text-sm font-medium">실시간 병목 분석</h3>
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
