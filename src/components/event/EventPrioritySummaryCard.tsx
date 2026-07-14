import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"

import { eventApi } from "@/api/eventApi"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  EventPrioritySummary,
  EventPrioritySummaryResponse,
} from "@/types/event"

const PERIOD_OPTIONS = [
  { days: 1, label: "최근 1일" },
  { days: 3, label: "최근 3일" },
  { days: 7, label: "최근 7일" },
] as const

const EMPTY_SUMMARY: EventPrioritySummary = {
  periodDays: 0,
  averagePriorityScore: 0,
  averageRiskScore: 0,
  averageOccurrencePercentage: 0,
  actionCompletionRate: 0,
}

const toSafeNumber = (value: unknown) => {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

const formatScore = (value: unknown) => {
  const rounded = Math.round(toSafeNumber(value) * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

const formatPercentage = (value: unknown) => `${formatScore(value)}%`

const normalizeSummary = (
  summary: EventPrioritySummary | null,
): EventPrioritySummary => ({
  periodDays: toSafeNumber(summary?.periodDays),
  averagePriorityScore: toSafeNumber(summary?.averagePriorityScore),
  averageRiskScore: toSafeNumber(summary?.averageRiskScore),
  averageOccurrencePercentage: toSafeNumber(
    summary?.averageOccurrencePercentage,
  ),
  actionCompletionRate: toSafeNumber(summary?.actionCompletionRate),
})

interface EventPrioritySummaryCardProps {
  refreshKey?: number
}

export function EventPrioritySummaryCard({
  refreshKey = 0,
}: EventPrioritySummaryCardProps) {
  const [days, setDays] = useState(7)
  const [summary, setSummary] = useState<EventPrioritySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let ignore = false

    const fetchSummary = async () => {
      setLoading(true)
      setError(false)
      setSummary(null)

      try {
        const response = (await eventApi.getEventPrioritySummary(
          days,
        )) as EventPrioritySummaryResponse

        if (!response?.success) {
          throw new Error(response?.message || "Failed to fetch priority summary")
        }

        const nextSummary = normalizeSummary(response.data)
        if (nextSummary.periodDays !== 0 && nextSummary.periodDays !== days) {
          throw new Error("Priority summary period does not match the request")
        }

        if (!ignore) {
          setSummary(nextSummary)
        }
      } catch (requestError) {
        console.error("Failed to fetch event priority summary:", requestError)
        if (!ignore) {
          setError(true)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    fetchSummary()

    return () => {
      ignore = true
    }
  }, [days, refreshKey, retryCount])

  const data = summary ?? EMPTY_SUMMARY

  return (
    <section className="bg-card border border-border rounded-lg">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
        <div className="flex min-w-0 items-start gap-1.5">
          <h3 className="text-[13px] font-medium leading-4">
            현장 대응형 이벤트 우선순위
          </h3>
          <div className="relative group shrink-0">
            <button
              type="button"
              aria-label="우선순위 평가 지표 설명"
              className="w-4 h-4 mt-0.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary flex items-center justify-center text-xs font-medium"
            >
              ?
            </button>
            <div className="absolute right-0 top-6 w-72 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all z-50">
              <div className="p-3 border-b border-border text-xs font-medium">
                평가 지표 안내
              </div>
              <dl className="p-3 space-y-3 text-xs">
                <div>
                  <dt className="font-medium text-primary">평균 대응 우선순위</dt>
                  <dd className="text-muted-foreground">전체 이벤트의 평균 현장 대응 우선순위</dd>
                </div>
                <div>
                  <dt className="font-medium">평균 기준 위험도</dt>
                  <dd className="text-muted-foreground">룰 기반으로 계산된 현재 위험도 평균</dd>
                </div>
                <div>
                  <dt className="font-medium">평균 반복 발생도</dt>
                  <dd className="text-muted-foreground">동일 이벤트 반복 발생 점수의 평균 백분율</dd>
                </div>
                <div>
                  <dt className="font-medium">조치 완료율</dt>
                  <dd className="text-muted-foreground">전체 이벤트 중 조치가 완료된 비율</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="relative shrink-0">
          <select
            aria-label="우선순위 통계 조회 기간"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="appearance-none text-xs bg-secondary border border-border rounded px-2 py-1 pr-6"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.days} value={option.days}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
        </div>
      </div>

      {loading ? (
        <div className="p-4" aria-live="polite">
          <p className="text-xs text-muted-foreground mb-4">
            통계 데이터를 불러오는 중입니다.
          </p>
          <div className="flex flex-col items-center gap-2 py-3">
            <Skeleton className="h-12 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {PERIOD_OPTIONS.map((option) => (
              <Skeleton key={option.days} className="h-16 w-full" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
          <p className="text-sm text-muted-foreground">
            우선순위 통계를 불러오지 못했습니다.
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="px-3 py-1.5 text-xs bg-secondary border border-border rounded hover:bg-muted"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex flex-col items-center py-3 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              평균 대응 우선순위
            </p>
            <strong className="text-5xl font-bold text-primary tabular-nums">
              {formatScore(data.averagePriorityScore)}
            </strong>
            <p className="mt-2 text-sm text-muted-foreground">
              이벤트 대응 우선순위 지수
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-1.5 mt-4">
            <div className="min-w-0 rounded border border-border bg-secondary/30 px-1 py-3 text-center">
              <dt className="text-[10px] leading-4 text-muted-foreground whitespace-nowrap break-keep">
                평균 기준 위험도
              </dt>
              <dd className="mt-1 text-lg font-bold tabular-nums">
                {formatScore(data.averageRiskScore)}
              </dd>
            </div>
            <div className="min-w-0 rounded border border-border bg-secondary/30 px-1 py-3 text-center">
              <dt className="text-[10px] leading-4 text-muted-foreground whitespace-nowrap break-keep">
                평균 반복 발생도
              </dt>
              <dd className="mt-1 text-lg font-bold tabular-nums">
                {formatPercentage(data.averageOccurrencePercentage)}
              </dd>
            </div>
            <div className="min-w-0 rounded border border-border bg-secondary/30 px-1 py-3 text-center">
              <dt className="text-[10px] leading-4 text-muted-foreground whitespace-nowrap break-keep">
                조치 완료율
              </dt>
              <dd className="mt-1 text-lg font-bold tabular-nums">
                {formatPercentage(data.actionCompletionRate)}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  )
}
