import React from "react"
import { AlertTriangle, CheckCircle } from "lucide-react"

type AssemblyFilter = "all" | "abnormal" | "sequence" | "fastening" | "missing"
type SequenceCompareStatus = "MATCH" | "MISMATCH" | "MISSING" | "EXTRA"

type AssemblyVehicleRow = {
  carMasterId?: number
  carDisplayId: string
  expectedSequence: string | null
  actualSequence: string | null
  sequenceErrorCount: number
  missingPartCount: number
  fasteningErrorCount: number
  riskScore: number
  severity: string
  status: string
  time?: string
}

type SequenceCompareItem = {
  index: number
  expected?: string
  actual?: string
  status: SequenceCompareStatus
}

function parseSequence(sequence?: string | null): string[] {
  if (!sequence || sequence.trim() === "") return []
  return sequence
    .split(/(?:->|>)/)
    .map((step) => step.trim())
    .filter(Boolean)
}

function formatProcessStep(step: string): string {
  const normalized = step.trim()
  if (/^PA\d+$/i.test(normalized)) return `도장 ${normalized.replace(/^PA/i, "")}`
  if (/^P\d+$/i.test(normalized)) return `프레스 ${normalized.replace(/^P/i, "")}`
  if (/^B\d+$/i.test(normalized)) return `차체 ${normalized.replace(/^B/i, "")}`
  if (/^A\d+$/i.test(normalized)) return `의장 ${normalized.replace(/^A/i, "")}`
  return normalized
}

function compareSequence(expected: string[], actual: string[]): SequenceCompareItem[] {
  const maxLength = Math.max(expected.length, actual.length)
  return Array.from({ length: maxLength }, (_, index) => {
    const expectedStep = expected[index]
    const actualStep = actual[index]

    if (expectedStep && actualStep && expectedStep === actualStep) {
      return { index, expected: expectedStep, actual: actualStep, status: "MATCH" }
    }
    if (expectedStep && !actualStep) return { index, expected: expectedStep, status: "MISSING" }
    if (!expectedStep && actualStep) return { index, actual: actualStep, status: "EXTRA" }
    return { index, expected: expectedStep, actual: actualStep, status: "MISMATCH" }
  })
}

const compactSequence = (sequence?: string | null) => parseSequence(sequence).join(" > ") || "-"

const statusLabel = (row?: Partial<AssemblyVehicleRow> | null) => {
  const raw = `${row?.severity ?? ""} ${row?.status ?? ""}`.toUpperCase()
  if (raw.includes("DANGER") || raw.includes("CRITICAL") || raw.includes("위험")) return "DANGER"
  if (raw.includes("WARNING") || raw.includes("주의") || raw.includes("경고")) return "WARNING"
  return "NORMAL"
}

const statusBadgeClass = (status: string) => {
  if (status === "DANGER") return "border-destructive/30 bg-destructive/15 text-destructive"
  if (status === "WARNING") return "border-warning/30 bg-warning/15 text-warning"
  return "border-success/30 bg-success/10 text-success"
}

const riskTextClass = (riskScore: number) => {
  if (riskScore >= 80) return "text-destructive"
  if (riskScore >= 50) return "text-warning"
  return "text-success"
}

const countClass = (value: number, kind: "sequence" | "missing" | "fastening") => {
  if (value <= 0) return "text-success"
  if (kind === "missing") return "text-warning"
  return "text-destructive"
}

const chipClass = (status: SequenceCompareStatus) => {
  if (status === "MISSING") return "border-destructive/40 bg-destructive/15 text-destructive"
  if (status === "EXTRA") return "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300"
  if (status === "MISMATCH") return "border-warning/40 bg-warning/15 text-warning"
  return "border-primary/30 bg-primary/10 text-primary"
}

const filterOptions: Array<{ id: AssemblyFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "abnormal", label: "이상만 보기" },
  { id: "sequence", label: "순서 오류" },
  { id: "fastening", label: "체결 오류" },
  { id: "missing", label: "부품 누락" },
]

function SequenceChipRow({
  label,
  items,
  side,
}: {
  label: string
  items: SequenceCompareItem[]
  side: "expected" | "actual"
}) {
  const visibleItems = items.filter((item) => (side === "expected" ? item.expected : item.actual))

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      {visibleItems.length === 0 ? (
        <div className="rounded border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">순서 데이터 없음</div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {visibleItems.map((item, index) => {
            const value = side === "expected" ? item.expected : item.actual
            return (
              <React.Fragment key={`${side}-${item.index}-${value}`}>
                {index > 0 && <span className="text-muted-foreground">→</span>}
                <span className={`rounded border px-2 py-1 text-xs font-medium ${chipClass(item.status)}`} title={value}>
                  {formatProcessStep(value ?? "")}
                </span>
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}

function buildErrorMessages(row: AssemblyVehicleRow | null) {
  if (!row) return ["선택된 차량이 없습니다."]

  const messages: string[] = []
  if (row.sequenceErrorCount > 0) messages.push(`순서 오류 ${row.sequenceErrorCount}건이 감지되었습니다.`)
  if (row.missingPartCount > 0) messages.push(`누락 부품 ${row.missingPartCount}건이 감지되었습니다.`)
  if (row.fasteningErrorCount > 0) messages.push(`체결 오류 ${row.fasteningErrorCount}건이 감지되었습니다.`)

  if (messages.length >= 2) {
    messages.push("조립 순서 오류, 부품 누락 또는 체결 오류가 동시에 감지되었습니다.")
  }

  return messages.length > 0
    ? messages
    : ["조립 순서가 기준 순서와 일치합니다.", "누락 부품 및 체결 오류가 없습니다."]
}

export function AssemblyAnomalyPanel({ dashboard }: { dashboard: any }) {
  const {
    assemblyKpis,
    selectedAssemblyDate,
    setSelectedAssemblyDate,
    fetchAssemblyDashboardData,
    isAssemblyDatesLoading,
    assemblyDateOptions,
    assemblyDatesError,
    assemblyDashboardError,
    isAssemblyDashboardLoading,
    assemblyData,
    filteredAssemblyData,
    pagedAssemblyData,
    assemblyStartIndex,
    assemblyPage,
    assemblyTotalPages,
    setAssemblyPage,
    assemblyFilter,
    setAssemblyFilter,
    selectedAssemblyVehicle,
    selectedAssemblyVehicleKey,
    setSelectedAssemblyVehicleKey,
    getAssemblyVehicleKey,
  } = dashboard

  const selectedVehicle = selectedAssemblyVehicle as AssemblyVehicleRow | null
  const selectedStatus = statusLabel(selectedVehicle)
  const expectedSteps = parseSequence(selectedVehicle?.expectedSequence)
  const actualSteps = parseSequence(selectedVehicle?.actualSequence)
  const compareItems = compareSequence(expectedSteps, actualSteps)
  const StatusIcon = selectedStatus === "NORMAL" ? CheckCircle : AlertTriangle
  const errorMessages = buildErrorMessages(selectedVehicle)

  const kpiCards = [
    { label: "분석 차량 수", value: assemblyKpis.carCount, unit: "대", className: "text-foreground" },
    { label: "순서 오류 건수", value: assemblyKpis.sequenceErrors, unit: "건", className: assemblyKpis.sequenceErrors > 0 ? "text-destructive" : "text-success" },
    { label: "누락 부품 건수", value: assemblyKpis.missingParts, unit: "건", className: assemblyKpis.missingParts > 0 ? "text-warning" : "text-success" },
    { label: "체결 오류 건수", value: assemblyKpis.fasteningErrors, unit: "건", className: assemblyKpis.fasteningErrors > 0 ? "text-destructive" : "text-success" },
    { label: "평균 위험도 점수", value: Number(assemblyKpis.averageRisk ?? 0).toFixed(1), unit: "점", className: riskTextClass(assemblyKpis.averageRisk ?? 0) },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {kpiCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.className}`}>
              {card.value} <span className="text-sm font-normal">{card.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(340px,1fr)]">
        <div className="flex min-w-0 flex-col xl:min-h-[630px]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-medium">차량별 조립 분석 결과</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                총 {assemblyData.length.toLocaleString()}건 · 필터 결과 {filteredAssemblyData.length.toLocaleString()}건
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              날짜
              <select
                aria-label="의장 대시보드 날짜 선택"
                value={selectedAssemblyDate}
                onChange={(event) => {
                  const date = event.target.value
                  setSelectedAssemblyDate(date)
                  void fetchAssemblyDashboardData(date)
                }}
                disabled={isAssemblyDatesLoading || assemblyDateOptions.length === 0}
                className="rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {assemblyDateOptions.length === 0 && <option value="">데이터 없음</option>}
                {assemblyDateOptions.map((date: string) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {(assemblyDatesError || assemblyDashboardError) && (
            <div className="mb-3 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {assemblyDatesError || assemblyDashboardError}
            </div>
          )}

          <div className="mb-3 flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setAssemblyFilter(option.id)}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                  assemblyFilter === option.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card/40 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[880px] text-xs">
              <thead className="bg-muted/20">
                <tr className="text-muted-foreground">
                  <th className="px-3 py-2 text-left">차량 ID</th>
                  <th className="px-3 py-2 text-left">기준 순서</th>
                  <th className="px-3 py-2 text-left">실제 순서</th>
                  <th className="px-3 py-2 text-center">순서 오류</th>
                  <th className="px-3 py-2 text-center">누락 부품</th>
                  <th className="px-3 py-2 text-center">체결 오류</th>
                  <th className="px-3 py-2 text-center">위험도</th>
                  <th className="px-3 py-2 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {isAssemblyDashboardLoading ? (
                  <tr className="border-t border-border">
                    <td className="px-3 py-8 text-center text-muted-foreground" colSpan={8}>
                      의장 대시보드 데이터를 불러오는 중입니다.
                    </td>
                  </tr>
                ) : filteredAssemblyData.length === 0 ? (
                  <tr className="border-t border-border">
                    <td className="px-3 py-8 text-center text-muted-foreground" colSpan={8}>
                      조건에 맞는 의장 분석 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  pagedAssemblyData.map((row: AssemblyVehicleRow, index: number) => {
                    const rowIndex = assemblyStartIndex + index
                    const rowKey = getAssemblyVehicleKey(row, rowIndex)
                    const rowStatus = statusLabel(row)
                    const isSelected = selectedAssemblyVehicleKey
                      ? selectedAssemblyVehicleKey === rowKey
                      : selectedVehicle && getAssemblyVehicleKey(selectedVehicle, 0) === rowKey

                    return (
                      <tr
                        key={rowKey}
                        onClick={() => setSelectedAssemblyVehicleKey(rowKey)}
                        className={`cursor-pointer border-t border-border transition-colors hover:bg-primary/5 ${
                          isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""
                        }`}
                      >
                        <td className="px-3 py-2 font-medium text-foreground">{row.carDisplayId}</td>
                        <td className="max-w-[180px] px-3 py-2">
                          <span className="block truncate" title={compactSequence(row.expectedSequence)}>
                            {compactSequence(row.expectedSequence)}
                          </span>
                        </td>
                        <td className="max-w-[180px] px-3 py-2">
                          <span className="block truncate" title={compactSequence(row.actualSequence)}>
                            {compactSequence(row.actualSequence)}
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-center font-medium ${countClass(row.sequenceErrorCount, "sequence")}`}>
                          {row.sequenceErrorCount}
                        </td>
                        <td className={`px-3 py-2 text-center font-medium ${countClass(row.missingPartCount, "missing")}`}>
                          {row.missingPartCount}
                        </td>
                        <td className={`px-3 py-2 text-center font-medium ${countClass(row.fasteningErrorCount, "fastening")}`}>
                          {row.fasteningErrorCount}
                        </td>
                        <td className={`px-3 py-2 text-center font-medium ${riskTextClass(row.riskScore)}`}>
                          {Number(row.riskScore ?? 0).toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(rowStatus)}`}>
                            {rowStatus}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredAssemblyData.length > 0 && (
            <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-xs text-muted-foreground">
              <p>현재 {pagedAssemblyData.length.toLocaleString()}건 표시</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssemblyPage((page: number) => Math.max(1, page - 1))}
                  disabled={assemblyPage <= 1}
                  className="rounded border border-border px-2 py-1 text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  이전
                </button>
                <span className="min-w-12 text-center text-foreground">
                  {assemblyPage} / {assemblyTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setAssemblyPage((page: number) => Math.min(assemblyTotalPages, page + 1))}
                  disabled={assemblyPage >= assemblyTotalPages}
                  className="rounded border border-border px-2 py-1 text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className={`rounded-lg border p-4 xl:sticky xl:top-4 xl:min-h-[630px] ${statusBadgeClass(selectedStatus)}`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              <div>
                <h4 className="font-medium">선택 차량 조립 상세</h4>
                <p className="text-xs text-muted-foreground">기준 순서와 실제 순서 비교 결과</p>
              </div>
            </div>
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(selectedStatus)}`}>
              {selectedStatus}
            </span>
          </div>

          {!selectedVehicle ? (
            <div className="rounded border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              선택할 차량 데이터가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card/60 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">차량 ID</p>
                    <p className="text-lg font-bold text-foreground">{selectedVehicle.carDisplayId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">위험도</p>
                    <p className={`text-lg font-bold ${riskTextClass(selectedVehicle.riskScore)}`}>
                      {Number(selectedVehicle.riskScore ?? 0).toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded border px-2 py-1 text-xs ${countClass(selectedVehicle.sequenceErrorCount, "sequence")} border-current/30`}>
                    순서 오류 {selectedVehicle.sequenceErrorCount}건
                  </span>
                  <span className={`rounded border px-2 py-1 text-xs ${countClass(selectedVehicle.missingPartCount, "missing")} border-current/30`}>
                    누락 부품 {selectedVehicle.missingPartCount}건
                  </span>
                  <span className={`rounded border px-2 py-1 text-xs ${countClass(selectedVehicle.fasteningErrorCount, "fastening")} border-current/30`}>
                    체결 오류 {selectedVehicle.fasteningErrorCount}건
                  </span>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-border bg-card/60 p-3">
                <SequenceChipRow label="기준 순서" items={compareItems} side="expected" />
                <SequenceChipRow label="실제 순서" items={compareItems} side="actual" />
              </div>

              <div className="rounded-lg border border-border bg-card/60 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">원본 sequence</p>
                <div className="space-y-2 text-xs">
                  <p className="break-all">
                    <span className="text-muted-foreground">기준: </span>
                    {selectedVehicle.expectedSequence || "-"}
                  </p>
                  <p className="break-all">
                    <span className="text-muted-foreground">실제: </span>
                    {selectedVehicle.actualSequence || "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card/60 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">오류 설명</p>
                <ul className="space-y-1 text-sm text-foreground">
                  {errorMessages.map((message) => (
                    <li key={message}>- {message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
