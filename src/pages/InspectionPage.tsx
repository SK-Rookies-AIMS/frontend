import { useEffect, useMemo, useState, useRef } from "react"

import { Header } from "@/components/dashboard/header"
import { Footer } from "@/components/dashboard/footer"
import { Mascot } from "@/components/mascot/mascot"
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
  RefreshCw,
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
  fetchRiskTrend,
} from "@/api/qualityApi"

const PAGE_SIZE = 10


// 기본 프로세스 카드 (API 실패 시 skeleton 표시용)
const DEFAULT_PROCESSES = [
  { id: "p1", processName: "VISUAL", processStatus: "WAIT", totalVehicleCount: 0, progressRate: 0 },
  { id: "p2", processName: "FUNCTION", processStatus: "WAIT", totalVehicleCount: 0, progressRate: 0 },
  { id: "p3", processName: "DRIVE", processStatus: "WAIT", totalVehicleCount: 0, progressRate: 0 },
  { id: "p4", processName: "FINAL", processStatus: "WAIT", totalVehicleCount: 0, progressRate: 0 },
]

export default function InspectionPage() {
  const [refreshInterval, setRefreshInterval] = useState("10")
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)

  const [currentTime, setCurrentTime] = useState(new Date())

  const [processData, setProcessData] = useState<any[]>([])
  const [summaryData, setSummaryData] = useState<any>({})
  const [riskHistoryData, setRiskHistoryData] = useState<any[]>([])
  const [statusDetailData, setStatusDetailData] = useState<any[]>([])
  const [driveDetailData, setDriveDetailData] = useState<any[]>([])
  const [riskTrendData, setRiskTrendData] = useState<any[]>([])

  const [statusPage, setStatusPage] = useState(1)
  const [drivePage, setDrivePage] = useState(1)
  const [selectedDetail, setSelectedDetail] = useState<any>(null)
  const [detailType, setDetailType] = useState<'status'|'drive'>('status')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
  if (!autoRefreshEnabled) return

  const seconds = Number(refreshInterval)

  if (isNaN(seconds) || seconds <= 0) return

  const timer = setInterval(() => {
    loadDashboard(true)
  }, seconds * 1000)

  return () => clearInterval(timer)
}, [autoRefreshEnabled, refreshInterval])


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [])

async function loadDashboard(refresh = false) {
  if (refresh) {
    setIsRefreshing(true)
  } else {
    setIsLoading(true)
  }

  const safeCall = async (fn: () => Promise<any>, fallback: any) => {
    try {
      return await fn()
    } catch (e) {
      console.error(e)
      return fallback
    }
  }

  const [process, summary, riskHistory, statusDetail, driveDetail, riskTrend] =
    await Promise.all([
      safeCall(fetchInspectionProcess, []),
      safeCall(fetchInspectionSummary, {}),
      safeCall(fetchRiskHistory, []),
      safeCall(fetchStatusDetail, []),
      safeCall(fetchDriveDetail, []),
      safeCall(fetchRiskTrend, []),
    ])

  setProcessData(Array.isArray(process) ? process : [])

  if (Array.isArray(summary) && summary.length > 0) {
    setSummaryData(summary[summary.length - 1])
  } else {
    setSummaryData(summary || {})
  }

  setRiskHistoryData(Array.isArray(riskHistory) ? riskHistory : [])
  setStatusDetailData(Array.isArray(statusDetail) ? statusDetail : [])
  setDriveDetailData(Array.isArray(driveDetail) ? driveDetail : [])
  setRiskTrendData(Array.isArray(riskTrend) ? riskTrend : [])

  if (refresh) {
    setIsRefreshing(false)
  } else {
    setIsLoading(false)
  }
}

  // 최신 시간대 기준 최대 4개 추출
  // createdAt 필드가 없으면 processData 전체를 그대로 사용
  const currentDateRef = useRef<string | null>(null)
  const getDate = (dt: string) =>
  new Date(dt).toISOString().split("T")[0]
  const latestProcesses = useMemo(() => {
    if (!processData.length) return DEFAULT_PROCESSES

    // 1. 가장 최신 데이터 기준 날짜 찾기
    const sorted = [...processData].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    const latestDate = getDate(sorted[sorted.length - 1].createdAt)

    // 2. 날짜 바뀌었으면 완전 초기화
    if (currentDateRef.current && currentDateRef.current !== latestDate) {
      currentDateRef.current = latestDate
      return DEFAULT_PROCESSES
    }

    currentDateRef.current = latestDate

    // 3. 해당 날짜 데이터만 필터링
    return processData
      .filter(item => getDate(item.createdAt) === latestDate)
      .slice(0, 4)
    }, [processData])

  // API summary가 모두 0이면 statusDetailData 기반으로 직접 계산
  const derivedSummary = useMemo(() => {

    if (Array.isArray(summaryData) && summaryData.length > 0) {

      const latest = summaryData[summaryData.length - 1]

      return {
        totalCount: latest.totalCount ?? 0,
        inspectingCount:
          (latest.normalCount ?? 0) +
          (latest.abnormalCount ?? 0),
        normalCount: latest.normalCount ?? 0,
        abnormalCount: latest.abnormalCount ?? 0,
        standbyCount:
          latest.standbyCount ??
          latest.stanbyCount ??
          0,
      }
    }

    return null

  }, [summaryData])

  // derivedSummary가 있으면 우선 사용
  const activeSummary = derivedSummary ?? summaryData ?? {}

  // 위험도 그래프 데이터 변환
  const chartData = useMemo(() => {
    const grouped = riskHistoryData.reduce(
      (acc: Record<string, any>, item: any) => {
        const date = item.startTime.split(" ")[0]

        if (!acc[date]) {
          acc[date] = {
            time: date.slice(5).replace("-", "/"),
          }
        }

        acc[date][item.inspectionType] = item.riskScore

        return acc
      },
      {}
    )

    return Object.values(grouped)
  }, [riskHistoryData])

  // 위험도 분포 계산
  const riskDistribution = useMemo(() => {
    const high = riskTrendData.find((r: any) => r.riskLevel === "HIGH")
    const medium = riskTrendData.find((r: any) => r.riskLevel === "MEDIUM")
    const low = riskTrendData.find((r: any) => r.riskLevel === "LOW")

    return {
      high: high?.riskCount ?? 0,
      medium: medium?.riskCount ?? 0,
      low: low?.riskCount ?? 0,
      highPct: high?.riskRatio ?? 0,
      mediumPct: medium?.riskRatio ?? 0,
      lowPct: low?.riskRatio ?? 0,
    }
  }, [riskTrendData])

  // 집계 테이블 데이터
  const statusRows = useMemo(
    () => statusDetailData,
    [statusDetailData]
  )

  const driveRows = useMemo(
    () => driveDetailData,
    [driveDetailData]
  )

  // 페이지네이션
  const pagedStatusRows = useMemo(() => {
  const start = (statusPage - 1) * PAGE_SIZE
    return statusRows.slice(start, start + PAGE_SIZE)
  }, [statusRows, statusPage])

  const pagedDriveRows = useMemo(() => {
    const start = (drivePage - 1) * PAGE_SIZE
    return driveRows.slice(start, start + PAGE_SIZE)
  }, [driveRows, drivePage])

  const statusTotalPage = Math.max(
    1,
    Math.ceil(statusRows.length / PAGE_SIZE)
  )

  const driveTotalPage = Math.max(
    1,
    Math.ceil(driveRows.length / PAGE_SIZE)
  )

  function renderProcessIcon(name: string) {
    if (name.includes("VISUAL")) return <Car className="w-5 h-5" />
    if (name.includes("FUNCTION")) return <Gauge className="w-5 h-5" />
    if (name.includes("DRIVE")) return <PlayCircle className="w-5 h-5" />
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
            <div className="flex items-center gap-5 mb-1">
              <h1 className="text-xl font-bold">
                품질 / 검사 단계 모니터링
              </h1>

              <div className="flex items-center gap-2">

                <input
                  type="number"
                  min={1}
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  className="w-20 px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700"
                />

                <span className="text-xs text-muted-foreground">
                  초
                </span>

                <button
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    autoRefreshEnabled
                      ? "bg-green-600 text-white"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {autoRefreshEnabled ? "자동 ON" : "자동 OFF"}
                </button>

                <button
                  onClick={() => loadDashboard(true)}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-cyan-400 transition-colors disabled:opacity-50 px-2 py-1 rounded bg-slate-800/50 hover:bg-slate-800"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {isRefreshing ? "갱신 중..." : "새로고침"}
                </button>

              </div>
            </div>
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
                        <p className="text-xs text-muted-foreground">목표 차량 대수</p>
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
                <h3 className="text-sm font-semibold">검사 단계별 안전 결과 추이</h3>
              </div>
              <ResponsiveContainer width="100%" height={360}>
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
                  value={(activeSummary?.normalCount ?? 0) + (activeSummary?.abnormalCount ?? 0)}
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
                  <span className="text-xl font-bold text-yellow-400">{activeSummary?.stanbyCount ?? 0}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    대 ({activeSummary?.totalCount ? Math.round(((activeSummary.stanbyCount ?? 0) / activeSummary.totalCount) * 100) : 0}%)
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
              page={statusPage}
              totalPage={statusTotalPage}
              setPage={setStatusPage}
              onSelect={(item: any) => {
                setDetailType("status")
                setSelectedDetail(item)
              }}
            />

            {/* 운전자 입력 결과 */}
            <AggregateTable
              title="운전자 입력 결과"
              rows={pagedDriveRows}
              page={drivePage}
              totalPage={driveTotalPage}
              setPage={setDrivePage}
              onSelect={(item: any) => {
                setDetailType("drive")
                setSelectedDetail(item)
              }}
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
                    <DetailCard icon={<Activity />} label="속도  (기준:80km/h)"         value={`${selectedDetail.speed} km/h`} />
                    <DetailCard icon={<Battery />}  label="배터리 전압 (기준:11~13V)"  value={`${selectedDetail.batteryVoltage} V`} />
                    <DetailCard icon={<Fuel />}     label="연료율 (기준:8~10km/L)"       value={`${selectedDetail.fuelRate} km/L`} />
                    <DetailCard icon={<Gauge />}    label="진동량 (기준:1500~2000RPM)" value={`${selectedDetail.att} RPM`} />
                    <DetailCard icon={<Gauge />}    label="차량 종류"       value={selectedDetail.carCode} />
                    <DetailCard icon={<Clock />}    label="생성 시간"    value={selectedDetail.createdAt} />
                  </div>
                ) : (
                  /* ── 운전자 입력 결과 (fetchDriveDetail 데이터) ── */
                  <div className="grid grid-cols-3 gap-4">
                    <DetailCard icon={<Activity />} label="조향각 (degree)"    value={`${selectedDetail.steeringAngle} °`} />
                    <DetailCard icon={<Gauge />}    label="브레이크 강도 (Force/Tension)"    value={`${selectedDetail.brakePressure} kgf`} />
                    <DetailCard icon={<PlayCircle />} label="운전 방식" value={selectedDetail.drivingPattern} />
                    <DetailCard icon={<PlayCircle />} label="운행 점수 (100점 만점)" value={`${selectedDetail.driveScore} 점`} />
                    <DetailCard icon={<Activity />}    label="가속량 (국제표준단위)"    value={`${selectedDetail.throttlePosition} m/s²`}/>
                    <DetailCard icon={<Clock />}    label="생성 시간"    value={selectedDetail.createdAt} />
                  </div>
                )}

                <div className="mt-6 p-4 rounded-xl bg-slate-900">
                  <p className="text-sm text-muted-foreground mb-2">검사 결과</p>

                  <p
                    className={`text-lg font-bold ${
                      selectedDetail.inspectionResult === "NORMAL"
                        ? "text-green-400"
                        : selectedDetail.inspectionResult === "WARNING"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {selectedDetail.inspectionResult === "NORMAL"
                      ? "정상"
                      : selectedDetail.inspectionResult === "WARNING"
                      ? "주의"
                      : "이상"}
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
  page,
  totalPage,
  setPage,
  onSelect,
}: {
  title: string
  rows: any[]
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
            <th rowSpan={2} className="text-center py-2 px-2 border-b border-border align-bottom whitespace-nowrap">차량 번호</th>
            <th rowSpan={2} className="text-center py-2 px-2 border-b border-border align-bottom whitespace-nowrap">검사 결과</th>
            <th rowSpan={2} className="text-center py-2 pl-2 border-b border-border align-bottom">상세</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const isFail = row.inspectionResult === "FAIL"

            return (
              <tr
                key={`${row.inspectionNo}-${row.vehicleNo}`}
                className="border-b border-border hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-2.5 pr-3 font-mono text-xs">
                  {row.inspectionNo}
                </td>

                <td className="text-center px-2">
                  {row.vehicleId ??
                    row.vehicle_no ??
                    row.carNumber ??
                    row.car_number ??
                    "-"}
                </td>

                <td
                  className={`text-center px-2 font-medium ${
                    row.inspectionResult === "NORMAL" ||
                    row.inspectionResult === "PASS"
                      ? "text-green-400"
                      : row.inspectionResult === "WARNING"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {row.inspectionResult === "NORMAL" ||
                  row.inspectionResult === "PASS"
                    ? "정상"
                    : row.inspectionResult === "WARNING"
                    ? "주의"
                    : "이상"}
                </td> 

                <td className="text-center pl-2">
                  <button
                    onClick={() => onSelect(row)}
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
