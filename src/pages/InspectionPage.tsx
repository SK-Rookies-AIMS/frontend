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
  CircleDot,
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {

    try {

      const [
        process,
        summary,
        riskHistory,
        statusDetail,
        driveDetail,
      ] = await Promise.all([
        fetchInspectionProcess(),
        fetchInspectionSummary(),
        fetchRiskHistory(),
        fetchStatusDetail(),
        fetchDriveDetail(),
      ])

      setProcessData(Array.isArray(process) ? process : [])
      setSummaryData(summary || {})
      setRiskHistoryData(Array.isArray(riskHistory) ? riskHistory : [])
      setStatusDetailData(Array.isArray(statusDetail) ? statusDetail : [])
      setDriveDetailData(Array.isArray(driveDetail) ? driveDetail : [])

    } catch (error) {
      console.error(error)
    }
  }

  /**
   * 최신 시간대 기준 4개만 추출
   */
  const latestProcesses = useMemo(() => {

    if (!processData.length) return []

    const grouped = processData.reduce((acc: any, item: any) => {

      const time = item.createdAt

      if (!acc[time]) {
        acc[time] = []
      }

      acc[time].push(item)

      return acc

    }, {})

    const sortedTimes = Object.keys(grouped).sort()

    const latestTime = sortedTimes[sortedTimes.length - 1]

    return grouped[latestTime] || []

  }, [processData])

  /**
   * 위험도 그래프 데이터 변환
   */
  const chartData = useMemo(() => {

    const grouped: any = {}

    riskHistoryData.forEach((item) => {

      const time = item.recordTime

      if (!grouped[time]) {
        grouped[time] = {
          time,
        }
      }

      grouped[time][item.inspectionType] = item.riskScore

    })

    return Object.values(grouped)

  }, [riskHistoryData])

  /**
   * 페이지네이션
   */
  const pagedStatusData = useMemo(() => {

    const start = (statusPage - 1) * PAGE_SIZE

    return statusDetailData.slice(start, start + PAGE_SIZE)

  }, [statusDetailData, statusPage])

  const pagedDriveData = useMemo(() => {

    const start = (drivePage - 1) * PAGE_SIZE

    return driveDetailData.slice(start, start + PAGE_SIZE)

  }, [driveDetailData, drivePage])

  const statusTotalPage = Math.ceil(statusDetailData.length / PAGE_SIZE)
  const driveTotalPage = Math.ceil(driveDetailData.length / PAGE_SIZE)

  function renderProcessIcon(name: string) {

    if (name.includes("외관")) {
      return <Car className="w-5 h-5" />
    }

    if (name.includes("기능")) {
      return <Gauge className="w-5 h-5" />
    }

    if (name.includes("주행")) {
      return <PlayCircle className="w-5 h-5" />
    }

    return <CheckCircle2 className="w-5 h-5" />
  }

  function getStatusColor(status: string) {

    switch (status) {

      case "RUNNING":
        return "text-green-400"

      case "WAIT":
        return "text-yellow-400"

      case "COMPLETE":
        return "text-cyan-400"

      default:
        return "text-slate-400"
    }
  }

  return (
    <AuthGuard>

      <div className="min-h-screen bg-background flex flex-col">

        <Header currentTime={currentTime} />

        <main className="flex-1 p-4 overflow-auto">

          {/* TITLE */}
          <div className="mb-6">

            <h1 className="text-xl font-bold mb-1">
              포장 / 검사 단계 모니터링
            </h1>

            <p className="text-sm text-muted-foreground">
              검사 단계 진행 현황 및 위험도 실시간 모니터링
            </p>

          </div>

          {/* PROCESS */}
          <div className="grid grid-cols-4 gap-4 mb-6">

            {latestProcesses.map((process, index) => (

              <div
                key={process.id}
                className="bg-card border border-border rounded-xl p-4"
              >

                <div className="flex items-center justify-between mb-4">

                  <div className="flex items-center gap-2">

                    <div className="w-7 h-7 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>

                    <span className="font-medium">
                      {process.processName}
                    </span>

                  </div>

                  <span
                    className={`text-xs font-medium ${getStatusColor(
                      process.processStatus
                    )}`}
                  >
                    {process.processStatus}
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                      {renderProcessIcon(process.processName)}
                    </div>

                    <div>

                      <p className="text-xs text-muted-foreground">
                        차량 수
                      </p>

                      <p className="text-2xl font-bold">
                        {process.totalVehicleCount}
                      </p>

                    </div>

                  </div>

                  <div className="relative w-14 h-14">

                    <svg
                      className="w-full h-full -rotate-90"
                      viewBox="0 0 36 36"
                    >

                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="3"
                      />

                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="#00d4ff"
                        strokeWidth="3"
                        strokeDasharray={`${process.progressRate} 100`}
                      />

                    </svg>

                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                      {process.progressRate}%
                    </span>

                  </div>

                </div>

              </div>

            ))}

          </div>

          {/* CHART */}
          <div className="bg-card border border-border rounded-xl p-4 mb-6">

            <h3 className="text-sm font-medium mb-4">
              검사 단계별 위험도 추이
            </h3>

            <ResponsiveContainer width="100%" height={320}>

              <LineChart data={chartData}>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                />

                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                />

                <YAxis domain={[0, 100]} />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="DYNAMICS"
                  stroke="#22c55e"
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="STATUS"
                  stroke="#00d4ff"
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="CONTROL"
                  stroke="#f59e0b"
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="DRIVE"
                  stroke="#ef4444"
                  dot={false}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-4 gap-4 mb-6">

            <SummaryCard
              title="전체 차량"
              value={summaryData?.totalCount || 0}
            />

            <SummaryCard
              title="정상"
              value={summaryData?.normalCount || 0}
              color="text-green-400"
            />

            <SummaryCard
              title="이상"
              value={summaryData?.abnormalCount || 0}
              color="text-red-400"
            />

            <SummaryCard
              title="대기"
              value={summaryData?.standbyCount || 0}
              color="text-yellow-400"
            />

          </div>

          {/* TABLES */}
          <div className="grid grid-cols-2 gap-4">

            {/* STATUS TABLE */}
            <TableSection
              title="차량 상태 결과"
              data={pagedStatusData}
              page={statusPage}
              totalPage={statusTotalPage}
              setPage={setStatusPage}
              onSelect={setSelectedDetail}
              type="status"
            />

            {/* DRIVE TABLE */}
            <TableSection
              title="운전자 입력 결과"
              data={pagedDriveData}
              page={drivePage}
              totalPage={driveTotalPage}
              setPage={setDrivePage}
              onSelect={setSelectedDetail}
              type="drive"
            />

          </div>

          {/* DETAIL MODAL */}
          {selectedDetail && (

            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

              <div className="w-[850px] bg-card border border-border rounded-2xl p-6">

                <div className="flex items-center justify-between mb-6">

                  <div>

                    <h2 className="text-xl font-bold">
                      차량 상세 정보
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      {selectedDetail.carCode}
                    </p>

                  </div>

                  <button
                    onClick={() => setSelectedDetail(null)}
                  >
                    <X className="w-5 h-5" />
                  </button>

                </div>

                <div className="grid grid-cols-3 gap-4">

                  <DetailCard
                    icon={<Activity />}
                    label="속도"
                    value={selectedDetail.speed}
                  />

                  <DetailCard
                    icon={<Battery />}
                    label="배터리"
                    value={selectedDetail.batteryVoltage}
                  />

                  <DetailCard
                    icon={<Fuel />}
                    label="연료"
                    value={selectedDetail.fuelRate}
                  />

                  <DetailCard
                    icon={<Gauge />}
                    label="스로틀"
                    value={selectedDetail.throttlePosition}
                  />

                  <DetailCard
                    icon={<SteeringWheel />}
                    label="조향각"
                    value={selectedDetail.steeringAngle}
                  />

                  <DetailCard
                    icon={<Clock />}
                    label="생성 시간"
                    value={selectedDetail.createdAt}
                  />

                </div>

                <div className="mt-6 p-4 rounded-xl bg-slate-900">

                  <p className="text-sm text-muted-foreground mb-2">
                    검사 결과
                  </p>

                  <p className="text-lg font-bold">
                    {selectedDetail.inspectionResult}
                  </p>

                  <p className="mt-4 text-sm">
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

/* ========================= */

function SummaryCard({
  title,
  value,
  color = "",
}: any) {

  return (
    <div className="bg-card border border-border rounded-xl p-5 text-center">

      <p className="text-sm text-muted-foreground mb-2">
        {title}
      </p>

      <p className={`text-3xl font-bold ${color}`}>
        {value}
      </p>

    </div>
  )
}

function TableSection({
  title,
  data,
  page,
  totalPage,
  setPage,
  onSelect,
  type,
}: any) {

  return (
    <div className="bg-card border border-border rounded-xl p-4">

      <h3 className="text-sm font-medium mb-4">
        {title}
      </h3>

      <table className="w-full text-sm">

        <thead>

          <tr className="border-b border-border text-xs text-muted-foreground">

            <th className="text-left py-2">차량</th>

            <th className="text-center">
              결과
            </th>

            <th className="text-center">
              위험도
            </th>

            <th className="text-center">
              상세
            </th>

          </tr>

        </thead>

        <tbody>

          {data.map((item: any) => (

            <tr
              key={item.id}
              className="border-b border-border"
            >

              <td className="py-3">
                {item.carCode}
              </td>

              <td className="text-center">
                {item.inspectionResult}
              </td>

              <td className="text-center">
                {type === "status"
                  ? item.statusScore
                  : item.driveScore}
              </td>

              <td className="text-center">

                <button
                  onClick={() => onSelect(item)}
                  className="px-3 py-1 rounded bg-cyan-500 text-white text-xs"
                >
                  보기
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

      {/* PAGINATION */}
      <div className="flex items-center justify-center gap-3 mt-4">

        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="p-2 rounded bg-secondary disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm">
          {page} / {totalPage}
        </span>

        <button
          disabled={page >= totalPage}
          onClick={() => setPage(page + 1)}
          className="p-2 rounded bg-secondary disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>

    </div>
  )
}

function DetailCard({
  icon,
  label,
  value,
}: any) {

  return (
    <div className="bg-slate-900 rounded-xl p-4">

      <div className="flex items-center gap-2 mb-2 text-cyan-400">
        {icon}
        <span className="text-sm">
          {label}
        </span>
      </div>

      <p className="text-xl font-bold">
        {value ?? "-"}
      </p>

    </div>
  )
}