import { useEffect, useMemo, useState } from "react"

import { Header } from "@/components/dashboard/header"
import { Footer } from "@/components/dashboard/footer"
import { Mascot } from "@/components/dashboard/mascot"
import { AuthGuard } from "@/components/auth-guard"

import {
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  PlayCircle,
  CheckCircle2,
  X,
  Activity,
  Battery,
  Fuel,
  ArrowRight,
} from "lucide-react"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

import {
  fetchInspectionProcess,
  fetchInspectionSummary,
  fetchRiskHistory,
  fetchStatusDetail,
  fetchDriveDetail,
} from "@/api/qualityApi"

const PAGE_SIZE = 10

// ─── 검사 코드(carCode) 기준 집계 헬퍼 ─────────────────────────────────────
function groupByInspectionNo(data: any[], scoreKey: string) {
  const map: Record<
    string,
    { inspectionNo: string; total: number; normal: number; abnormal: number; item: any }
  > = {}

  data.forEach((item) => {
    // 원본 데이터 필드: carCode. inspectionNo 필드가 생기면 자동 우선 사용
    const key = item.inspectionNo ?? item.carCode ?? item.id ?? "기타"
    if (!map[key]) {
      map[key] = { inspectionNo: key, total: 0, normal: 0, abnormal: 0, item }
    }
    map[key].total++
    if (item.inspectionResult === "NORMAL") map[key].normal++
    else map[key].abnormal++
  })

  const rows = Object.values(map)
  const totals = rows.reduce(
    (acc, r) => ({
      inspectionNo: "총 합계",
      total: acc.total + r.total,
      normal: acc.normal + r.normal,
      abnormal: acc.abnormal + r.abnormal,
      item: null,
    }),
    { inspectionNo: "총 합계", total: 0, normal: 0, abnormal: 0, item: null }
  )
  return { rows, totals }
}


// 기본 프로세스 카드 (API 실패 시 skeleton 표시용)
const DEFAULT_PROCESSES = [
  { id: "p1", processName: "외관 검사", processStatus: "WAIT", totalVehicleCount: 0, progressRate: 0 },
  { id: "p2", processName: "기능 검사", processStatus: "WAIT", totalVehicleCount: 0, progressRate: 0 },
  { id: "p3", processName: "주행 검사", processStatus: "WAIT", totalVehicleCount: 0, progressRate: 0 },
  { id: "p4", processName: "최종 검사", processStatus: "WAIT", totalVehicleCount: 0, progressRate: 0 },
]

export default function InspectionPage() {
  const [currentTime, setCurrentTime] = useState(new Date())

  const [processData, setProcessData] = useState<any[]>([])
  const [summaryData, setSummaryData] = useState<any>({})
  const [riskHistoryData, setRiskHistoryData] = useState<any[]>([])
  const [statusDetailData, setStatusDetailData] = useState<any[]>([])
  const [driveDetailData, setDriveDetailData] = useState<any[]>([])

  const [statusPage, setStatusPage] = useState(1)
  const [drivePage, setDrivePage] = useState(1)
  const [selectedDetail, setSelectedDetail] = useState<any>(null)
  const [detailType, setDetailType] = useState<'status'|'drive'>('status')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setIsLoading(true)
    // 각 API를 독립적으로 호출 — 하나가 500이어도 나머지는 정상 렌더링
    const safeCall = async (fn: () => Promise<any>, fallback: any) => {
      try { return await fn() } catch (e) { console.error(e); return fallback }
    }

    const [process, summary, riskHistory, statusDetail, driveDetail] =
      await Promise.all([
        safeCall(fetchInspectionProcess, []),
        safeCall(fetchInspectionSummary, {}),
        safeCall(fetchRiskHistory, []),
        safeCall(fetchStatusDetail, []),
        safeCall(fetchDriveDetail, []),
      ])

    setProcessData(Array.isArray(process) ? process : [])
    setSummaryData(summary || {})
    setRiskHistoryData(Array.isArray(riskHistory) ? riskHistory : [])
    setStatusDetailData(Array.isArray(statusDetail) ? statusDetail : [])
    setDriveDetailData(Array.isArray(driveDetail) ? driveDetail : [])
    setIsLoading(false)
  }

  // 최신 시간대 기준 최대 4개 추출
  // createdAt 필드가 없으면 processData 전체를 그대로 사용
  const latestProcesses = useMemo(() => {
    if (!processData.length) return DEFAULT_PROCESSES
    const hasTime = processData.some((item: any) => item.createdAt)
    if (!hasTime) return processData.slice(0, 4)
    const grouped = processData.reduce((acc: any, item: any) => {
      const time = item.createdAt ?? "unknown"
      if (!acc[time]) acc[time] = []
      acc[time].push(item)
      return acc
    }, {})
    const sortedTimes = Object.keys(grouped).sort()
    const latestTime = sortedTimes[sortedTimes.length - 1]
    return (grouped[latestTime] || []).slice(0, 4)
  }, [processData])

  // API summary가 모두 0이면 statusDetailData 기반으로 직접 계산
  const derivedSummary = useMemo(() => {
    const total = statusDetailData.length
    if (!total && !summaryData?.totalCount) return null

    // API 값이 있으면 그대로 사용, 없으면 detail 데이터로 계산
    if (summaryData?.totalCount) return summaryData

    const normal   = statusDetailData.filter((d) => d.inspectionResult === "NORMAL").length
    const abnormal = statusDetailData.filter((d) => d.inspectionResult !== "NORMAL").length
    return {
      totalCount:      total,
      inspectingCount: statusDetailData.filter((d) => d.processStatus === "RUNNING").length,
      normalCount:     normal,
      abnormalCount:   abnormal,
      standbyCount:    statusDetailData.filter((d) => d.processStatus === "WAIT").length,
    }
  }, [summaryData, statusDetailData])

  // derivedSummary가 있으면 우선 사용
  const activeSummary = derivedSummary ?? summaryData ?? {}

  // 위험도 그래프 데이터 변환
  const chartData = useMemo(() => {
    const grouped: any = {}
    riskHistoryData.forEach((item) => {
      const time = item.recordTime
      if (!grouped[time]) grouped[time] = { time }
      grouped[time][item.inspectionType] = item.riskScore
    })
    return Object.values(grouped)
  }, [riskHistoryData])

  // 위험도 분포 계산
  const riskDistribution = useMemo(() => {
    const total = statusDetailData.length || 1
    const high = statusDetailData.filter((d) => (d.statusScore ?? 0) >= 75).length
    const medium = statusDetailData.filter(
      (d) => (d.statusScore ?? 0) >= 40 && (d.statusScore ?? 0) < 75
    ).length
    const low = statusDetailData.filter((d) => (d.statusScore ?? 0) < 40).length
    return {
      high,
      medium,
      low,
      highPct: Math.round((high / total) * 100),
      mediumPct: Math.round((medium / total) * 100),
      lowPct: Math.round((low / total) * 100),
    }
  }, [statusDetailData])

  // 집계 테이블 데이터
  const statusGrouped = useMemo(
    () => groupByInspectionNo(statusDetailData, "statusScore"),
    [statusDetailData]
  )
  const driveGrouped = useMemo(
    () => groupByInspectionNo(driveDetailData, "driveScore"),
    [driveDetailData]
  )

  // 페이지네이션
  const pagedStatusRows = useMemo(() => {
    const start = (statusPage - 1) * PAGE_SIZE
    return statusGrouped.rows.slice(start, start + PAGE_SIZE)
  }, [statusGrouped.rows, statusPage])

  const pagedDriveRows = useMemo(() => {
    const start = (drivePage - 1) * PAGE_SIZE
    return driveGrouped.rows.slice(start, start + PAGE_SIZE)
  }, [driveGrouped.rows, drivePage])

  const statusTotalPage = Math.ceil(statusGrouped.rows.length / PAGE_SIZE)
  const driveTotalPage = Math.ceil(driveGrouped.rows.length / PAGE_SIZE)

  function renderProcessIcon(name: string) {
    if (name.includes("외관")) return <Car className="w-5 h-5" />
    if (name.includes("기능")) return <Gauge className="w-5 h-5" />
    if (name.includes("주행")) return <PlayCircle className="w-5 h-5" />
    return <CheckCircle2 className="w-5 h-5" />
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "RUNNING": return "text-green-400"
      case "WAIT":    return "text-yellow-400"
      case "COMPLETE": return "text-cyan-400"
      default:        return "text-slate-400"
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "RUNNING": return "진행 중"
      case "WAIT":    return "대기 중"
      case "COMPLETE": return "완료"
      default:        return status
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col">
        <Header currentTime={currentTime} />

        <main className="flex-1 p-6 overflow-auto">

          {/* ── TITLE ── */}
          <div className="mb-5">
            <h1 className="text-xl font-bold mb-1">품질 / 검사 단계 모니터링</h1>
            <p className="text-sm text-muted-foreground">
              각 검사 단계별 진행 상황과 결과를 실시간으로 모니터링합니다.
            </p>
          </div>

          {/* ── PROCESS CARDS (4개, 화살표 연결) ── */}
          <div className="flex items-center gap-2 mb-6">
            {latestProcesses.map((process: any, index: number) => (
              <div key={process.id} className="flex items-center flex-1 min-w-0">
                <div
                  className={`flex-1 bg-card border rounded-xl p-4 transition-all ${
                    isLoading
                      ? "border-border opacity-50 animate-pulse"
                      : process.processStatus === "RUNNING"
                      ? "border-cyan-500 shadow-[0_0_12px_rgba(0,212,255,0.2)]"
                      : "border-border"
                  }`}
                >
                  {/* 카드 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold truncate">
                        {process.processName}
                      </span>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${getStatusColor(process.processStatus)}`}>
                      {getStatusLabel(process.processStatus)}
                    </span>
                  </div>

                  {/* 카드 바디 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                        {renderProcessIcon(process.processName)}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">차량 대수</p>
                        <p className="text-2xl font-bold leading-tight">
                          {process.totalVehicleCount}
                          <span className="text-sm font-normal ml-1 text-muted-foreground">대</span>
                        </p>
                      </div>
                    </div>

                    {/* 원형 진행률 */}
                    <div className="relative w-12 h-12 shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15" fill="none"
                          stroke={process.processStatus === "RUNNING" ? "#00d4ff" : process.processStatus === "COMPLETE" ? "#22c55e" : "#f59e0b"}
                          strokeWidth="3"
                          strokeDasharray={`${process.progressRate} 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                        {process.progressRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 화살표 (마지막 카드 제외) */}
                {index < latestProcesses.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 mx-1" />
                )}
              </div>
            ))}
          </div>

          {/* ── CHART + SUMMARY (좌우 분할) ── */}
          <div className="grid grid-cols-[1fr_300px] gap-4 mb-6">

            {/* 차트 */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">검사 단계별 위험도 추이</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    labelStyle={{ color: "#94a3b8", fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="DYNAMICS" name="외관 검사" stroke="#22c55e" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="STATUS"   name="기능 검사" stroke="#00d4ff" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="CONTROL"  name="주행 검사" stroke="#f59e0b" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="DRIVE"    name="최종 검사" stroke="#ef4444" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 검사 단계 요약 */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold">검사 단계 요약</h3>

              {/* 카운트 그리드 */}
              <div className="grid grid-cols-2 gap-3">
                <SummaryBox
                  label="전체 차량 대수"
                  value={activeSummary?.totalCount ?? 0}
                  sub="대"
                  size="lg"
                />
                <SummaryBox
                  label="검사 진행"
                  value={activeSummary?.inspectingCount ?? 0}
                  sub={`대 (${activeSummary?.totalCount ? Math.round(((activeSummary.inspectingCount ?? 0) / activeSummary.totalCount) * 100) : 0}%)`}
                />
                <SummaryBox
                  label="정상"
                  value={activeSummary?.normalCount ?? 0}
                  sub={`대 (${activeSummary?.totalCount ? Math.round(((activeSummary.normalCount ?? 0) / activeSummary.totalCount) * 100) : 0}%)`}
                  color="text-green-400"
                />
                <SummaryBox
                  label="이상"
                  value={activeSummary?.abnormalCount ?? 0}
                  sub={`대 (${activeSummary?.totalCount ? Math.round(((activeSummary.abnormalCount ?? 0) / activeSummary.totalCount) * 100) : 0}%)`}
                  color="text-red-400"
                />
              </div>

              {/* 대기 */}
              <div className="bg-slate-800/60 rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">대기 중</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-yellow-400">{activeSummary?.standbyCount ?? 0}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    대 ({activeSummary?.totalCount ? Math.round(((activeSummary.standbyCount ?? 0) / activeSummary.totalCount) * 100) : 0}%)
                  </span>
                </div>
              </div>

              {/* 위험도 분포 */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">위험도 분포</p>
                <div className="flex gap-3 text-xs mb-1.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    High
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                    Medium
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    Low
                  </span>
                </div>

                {/* 가로 막대 */}
                <div className="w-full h-5 rounded-full overflow-hidden flex">
                  {riskDistribution.highPct > 0 && (
                    <div
                      className="bg-red-500 flex items-center justify-center text-[10px] font-medium text-white"
                      style={{ width: `${riskDistribution.highPct}%` }}
                    >
                      {riskDistribution.highPct}%
                    </div>
                  )}
                  {riskDistribution.mediumPct > 0 && (
                    <div
                      className="bg-yellow-400 flex items-center justify-center text-[10px] font-medium text-black"
                      style={{ width: `${riskDistribution.mediumPct}%` }}
                    >
                      {riskDistribution.mediumPct}%
                    </div>
                  )}
                  {riskDistribution.lowPct > 0 && (
                    <div
                      className="bg-green-500 flex items-center justify-center text-[10px] font-medium text-white"
                      style={{ width: `${riskDistribution.lowPct}%` }}
                    >
                      {riskDistribution.lowPct}%
                    </div>
                  )}
                  {/* 데이터 없을 때 placeholder */}
                  {riskDistribution.high + riskDistribution.medium + riskDistribution.low === 0 && (
                    <div className="w-full bg-slate-700" />
                  )}
                </div>

                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{riskDistribution.high}대</span>
                  <span>{riskDistribution.medium}대</span>
                  <span>{riskDistribution.low}대</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── TABLES ── */}
          <div className="grid grid-cols-2 gap-4">

            {/* 차량 상태 결과 */}
            <AggregateTable
              title="차량 상태 결과"
              rows={pagedStatusRows}
              totals={statusGrouped.totals}
              page={statusPage}
              totalPage={statusTotalPage}
              setPage={setStatusPage}
              onSelect={(item: any) => { setDetailType('status'); setSelectedDetail(item) }}
            />

            {/* 운전자 입력 결과 */}
            <AggregateTable
              title="운전자 입력 결과"
              rows={pagedDriveRows}
              totals={driveGrouped.totals}
              page={drivePage}
              totalPage={driveTotalPage}
              setPage={setDrivePage}
              onSelect={(item: any) => { setDetailType('drive'); setSelectedDetail(item) }}
            />
          </div>

          {/* ── DETAIL MODAL ── */}
          {selectedDetail && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="w-[850px] bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">
                      {detailType === 'status' ? '차량 상태 상세' : '운전자 입력 상세'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedDetail.inspectionNo ?? selectedDetail.carCode}
                    </p>
                  </div>
                  <button onClick={() => setSelectedDetail(null)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {detailType === 'status' ? (
                  /* ── 차량 상태 결과 (fetchStatusDetail 데이터) ── */
                  <div className="grid grid-cols-3 gap-4">
                    <DetailCard icon={<Activity />} label="속도"         value={selectedDetail.speed} />
                    <DetailCard icon={<Battery />}  label="배터리 전압"  value={selectedDetail.batteryVoltage} />
                    <DetailCard icon={<Fuel />}     label="연료율"       value={selectedDetail.fuelRate} />
                    <DetailCard icon={<Gauge />}    label="스로틀 포지션" value={selectedDetail.throttlePosition} />
                    <DetailCard icon={<Gauge />}    label="조향각"       value={selectedDetail.steeringAngle} />
                    <DetailCard icon={<Clock />}    label="생성 시간"    value={selectedDetail.createdAt} />
                  </div>
                ) : (
                  /* ── 운전자 입력 결과 (fetchDriveDetail 데이터) ── */
                  <div className="grid grid-cols-3 gap-4">
                    <DetailCard icon={<Activity />} label="주행 거리"    value={selectedDetail.driveDistance} />
                    <DetailCard icon={<Gauge />}    label="평균 속도"    value={selectedDetail.avgSpeed} />
                    <DetailCard icon={<PlayCircle />} label="급가속 횟수" value={selectedDetail.suddenAccelCount} />
                    <DetailCard icon={<PlayCircle />} label="급감속 횟수" value={selectedDetail.suddenBrakeCount} />
                    <DetailCard icon={<Clock />}    label="주행 시간"    value={selectedDetail.driveDuration} />
                    <DetailCard icon={<Clock />}    label="생성 시간"    value={selectedDetail.createdAt} />
                  </div>
                )}

                <div className="mt-6 p-4 rounded-xl bg-slate-900">
                  <p className="text-sm text-muted-foreground mb-2">검사 결과</p>
                  <p className={`text-lg font-bold ${
                    selectedDetail.inspectionResult === 'NORMAL' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {selectedDetail.inspectionResult === 'NORMAL' ? '정상' : '이상'}
                  </p>
                  <p className="mt-4 text-sm text-slate-300">
                    {selectedDetail.issueMessage || "이상 메시지 없음"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Mascot />
        </main>

        <Footer />
      </div>
    </AuthGuard>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENTS                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

function SummaryBox({
  label,
  value,
  sub = "",
  color = "",
  size = "md",
}: {
  label: string
  value: number
  sub?: string
  color?: string
  size?: "md" | "lg"
}) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`font-bold leading-tight ${color} ${size === "lg" ? "text-3xl" : "text-2xl"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function AggregateTable({
  title,
  rows,
  totals,
  page,
  totalPage,
  setPage,
  onSelect,
}: {
  title: string
  rows: any[]
  totals: any
  page: number
  totalPage: number
  setPage: (p: number) => void
  onSelect: (item: any) => void
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>

      <table className="w-full text-sm border-collapse">
        <thead>
          {/* 1행: 그룹 헤더 */}
          <tr className="text-xs text-muted-foreground">
            <th rowSpan={2} className="text-left py-2 pr-3 border-b border-border align-bottom">검사 코드</th>
            <th rowSpan={2} className="text-center py-2 px-2 border-b border-border align-bottom whitespace-nowrap">차량 대수</th>
            <th colSpan={2} className="text-center py-1 px-2 border border-border bg-slate-800/50 rounded-t">상태</th>
            <th rowSpan={2} className="text-center py-2 px-2 border-b border-border align-bottom text-red-400 whitespace-nowrap">이상률</th>
            <th rowSpan={2} className="text-center py-2 pl-2 border-b border-border align-bottom">상세</th>
          </tr>
          {/* 2행: 상태 하위 헤더 */}
          <tr className="text-xs">
            <th className="text-center py-1 px-3 border border-border bg-slate-800/50 text-green-400 font-medium">정상</th>
            <th className="text-center py-1 px-3 border border-border bg-slate-800/50 text-red-400 font-medium">이상</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const abnormalPct =
              row.total > 0 ? ((row.abnormal / row.total) * 100).toFixed(1) : "0.0"
            const isAbnormal = row.abnormal > 0
            return (
              <tr key={row.inspectionNo} className="border-b border-border hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 pr-3 font-mono text-xs">{row.inspectionNo}</td>
                <td className="text-center px-2">{row.total}<span className="text-xs text-muted-foreground ml-0.5">대</span></td>
                {/* 상태: 정상 / 이상 묶음 */}
                <td className="text-center px-3 text-green-400 font-medium">
                  {row.normal}<span className="text-xs text-muted-foreground ml-0.5">대</span>
                </td>
                <td className="text-center px-3 text-red-400 font-medium">
                  {row.abnormal}<span className="text-xs text-muted-foreground ml-0.5">대</span>
                </td>
                <td className={`text-center px-2 font-medium ${isAbnormal ? "text-red-400" : "text-green-400"}`}>
                  {abnormalPct}%
                </td>
                <td className="text-center pl-2">
                  <button
                    onClick={() => onSelect(row.item)}
                    className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs hover:bg-cyan-500/30 transition-colors"
                  >
                    보기
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>

        {/* 총합계 행 */}
        <tfoot>
          <tr className="border-t-2 border-slate-600 bg-slate-800/30">
            <td className="py-2.5 pr-3 font-semibold text-xs">총 합계</td>
            <td className="text-center px-2 font-semibold">
              {totals.total}<span className="text-xs text-muted-foreground ml-0.5">대</span>
            </td>
            <td className="text-center px-3 text-green-400 font-semibold">
              {totals.normal}<span className="text-xs text-muted-foreground ml-0.5">대</span>
            </td>
            <td className="text-center px-3 text-red-400 font-semibold">
              {totals.abnormal}<span className="text-xs text-muted-foreground ml-0.5">대</span>
            </td>
            <td className="text-center px-2 text-red-400 font-semibold">
              {totals.total > 0 ? ((totals.abnormal / totals.total) * 100).toFixed(1) : "0.0"}%
            </td>
            <td className="text-center pl-2 text-muted-foreground text-xs">-</td>
          </tr>
        </tfoot>
      </table>

      {/* PAGINATION */}
      {totalPage > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="p-1.5 rounded bg-secondary disabled:opacity-30 hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPage}
          </span>
          <button
            disabled={page >= totalPage}
            onClick={() => setPage(page + 1)}
            className="p-1.5 rounded bg-secondary disabled:opacity-30 hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: any
}) {
  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2 text-cyan-400">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-xl font-bold">{value ?? "-"}</p>
    </div>
  )
}
