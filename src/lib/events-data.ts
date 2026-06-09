// 이벤트 데이터 / 타입 / 유틸 - 이벤트 페이지와 알림(마스코트) Provider가 공유하는 단일 진실 공급원

// 공정 코드 매핑
export const PROCESS_CODES: Record<string, string> = {
  "프레스 공정": "P",
  "용접 공정": "W",
  "차체 공정": "W",
  "도장 공정": "C",
  "의장 공정": "A",
  "조립 공정": "A",
  "검사 공정": "I",
  "자재 관리": "M",
}

// 심각도 코드 매핑
export const SEVERITY_CODES: Record<string, string> = {
  "위험": "D",
  "경고": "W",
}

export type EventStatus = "조치 필요" | "조치 완료" | "조치 불필요"
export type Severity = "위험" | "경고"

export interface EventItem {
  id: number
  datetime: string
  severity: Severity
  area: string
  subArea: string
  title: string
  content: string
  status: EventStatus
  handler?: string
  trustScore?: number
  equipmentNo: string // 장비 번호
  eventDate: string // 이벤트 날짜 (MMDD)
  eventCount: number // 해당 장비 이벤트 횟수
  currentImpact: number // 현재 영향도 (1-10)
  followUpImpact: number // 후속 영향도 (1-10)
  actionMethod?: string // 조치 방법 (조치 완료시)
  actionTimeline?: {
    time: string
    action: string
    handler: string
    type: "확인" | "분석" | "조치" | "완료" | "검증"
  }[]
  aiAnalysis?: {
    causeEstimation: string
    impactAssessment: string
    additionalImpact: string
  }
  aiRecommendation?: {
    recommendedAction: string
    basedOn: string
    confidence: number
    seniorHandler: string
    similarCaseId: string
  }
  impactPrediction?: {
    affectedProcesses: string[]
    impactLevel: "높음" | "중간" | "낮음"
    estimatedDelay: string
  }
  aiScore?: number // AI 지수 (마스코트 우선 안내용)
}

// 로그 코드 생성 함수 (- 없이)
export function generateLogCode(
  severity: Severity,
  area: string,
  equipmentNo: string,
  eventDate: string,
  eventCount: number
): string {
  const severityCode = SEVERITY_CODES[severity] || "W"
  const processCode = PROCESS_CODES[area] || "P"
  const equipNo = equipmentNo.padStart(3, "0")
  const date = eventDate // MMDD 형식
  const count = String(eventCount).padStart(4, "0")

  return `${severityCode}${processCode}${equipNo}${date}${count}`
}

// 우선순위 점수 계산 함수
export function calculatePriorityScore(event: EventItem): number {
  const severityWeight = event.severity === "위험" ? 3 : 1.5
  const currentImpactWeight = event.currentImpact * 2
  const followUpImpactWeight = event.followUpImpact * 1.5
  const processCountWeight = (event.impactPrediction?.affectedProcesses.length || 1) * 5

  return Math.round(
    (severityWeight * 10) + currentImpactWeight + followUpImpactWeight + processCountWeight
  )
}

// 마스코트가 안내해야 하는(미조치) 상태인지 여부
export function isActionableStatus(status: EventStatus): boolean {
  return status === "조치 필요"
}

// 이벤트(알림)가 발생할 수 있는 생산 공정만 허용한다.
// 차체/도장/의장/프레스 공정에서만 이벤트가 발생하고,
// 검사 공정·자재 관리 등은 알림을 띄우지 않는다.
const ALLOWED_PROCESS_KEYWORDS = ["차체", "도장", "의장", "프레스", "용접", "조립"]

export function isProductionProcess(area: string): boolean {
  return ALLOWED_PROCESS_KEYWORDS.some(keyword => area.includes(keyword))
}

// 차체/도장/의장/프레스 공정에 대한 추가 샘플 알림 자동 생성
function generateSampleEvents(): EventItem[] {
  const processes: {
    area: string
    subAreas: string[]
    titles: { title: string; content: string }[]
    handlers: string[]
  }[] = [
    {
      area: "프레스 공정",
      subAreas: ["프레스 #1", "프레스 #2", "프레스 #3", "프레스 #4"],
      titles: [
        { title: "프레스 실린더 과부하 이상", content: "프레스 실린더의 압력이 정상 범위를 초과하여 과부하가 발생하였습니다." },
        { title: "금형 정렬 오차 감지", content: "금형 정렬 위치가 허용 오차를 벗어나 불량 발생 위험이 있습니다." },
        { title: "프레스 오일 압력 저하", content: "프레스의 유압 오일 압력이 설정 값보다 낮아졌습니다." },
        { title: "타발 소음 이상 감지", content: "프레스 타발 시 비정상적인 소음 패턴이 감지되었습니다." },
        { title: "프레스 모터 온도 상승", content: "프레스 구동 모터의 온도가 임계치에 근접했습니다." },
      ],
      handlers: ["박철수", "박영희", "김민수"],
    },
    {
      area: "차체 공정",
      subAreas: ["용접 로봇 #1", "용접 로봇 #2", "차체 조립 #1", "차체 조립 #2"],
      titles: [
        { title: "용접 로봇 토크 이상", content: "용접 로봇의 토크 값이 정상 범위를 벗어났습니다." },
        { title: "스폿 용접 품질 저하", content: "스폿 용접 강도가 기준치를 하회하여 품질 점검이 필요합니다." },
        { title: "차체 정합도 오차", content: "차체 패널 간 정합도 오차가 허용 범위를 초과했습니다." },
        { title: "용접 팁 마모 경고", content: "용접 팁의 마모도가 교체 기준에 도달했습니다." },
        { title: "지그 클램프 압력 저하", content: "차체 고정 지그의 클램프 압력이 저하되었습니다." },
      ],
      handlers: ["이정훈", "최수진", "강대현"],
    },
    {
      area: "도장 공정",
      subAreas: ["도장 라인 #1", "도장 라인 #2", "도장 부스 #1", "건조 오븐 #1"],
      titles: [
        { title: "도장 부스 온도 상승 경고", content: "도장 부스 온도 설정 범위를 초과하여 상승했습니다." },
        { title: "도료 점도 이상 감지", content: "도료 점도가 정상 범위를 벗어나 도막 품질에 영향을 줄 수 있습니다." },
        { title: "스프레이 건 막힘 경고", content: "스프레이 건 노즐 막힘으로 분사량이 감소했습니다." },
        { title: "건조 오븐 온도 편차", content: "건조 오븐 내 온도 편차가 기준을 초과했습니다." },
        { title: "도막 두께 불균일", content: "도막 두께 측정값이 불균일하게 분포되어 있습니다." },
      ],
      handlers: ["김철수", "정유나", "오세훈"],
    },
    {
      area: "의장 공정",
      subAreas: ["의장 라인 #1", "의장 라인 #2", "조립 스테이션 #1", "검사 게이트 #1"],
      titles: [
        { title: "체결 토크 부족 감지", content: "볼트 체결 토크가 규정값에 미달하여 재작업이 필요합니다." },
        { title: "부품 공급 지연", content: "의장 라인 부품 공급이 지연되어 작업 흐름에 영향을 줍니다." },
        { title: "전장 배선 오결선 감지", content: "전장 배선 결선 검사에서 오결선이 감지되었습니다." },
        { title: "내장재 정합 오차", content: "내장재 장착 위치가 기준 정합도를 벗어났습니다." },
        { title: "컨베이어 속도 이상", content: "의장 컨베이어 이송 속도가 설정값과 차이를 보입���다." },
      ],
      handlers: ["한지민", "서준호", "임채원"],
    },
  ]

  const statuses: EventStatus[] = ["조치 필요", "조치 완료", "조치 불필요"]
  const impactLevels: ("높음" | "중간" | "낮음")[] = ["높음", "중간", "낮음"]
  const allProcessNames = ["차체", "도장", "의장", "프레스"]

  const events: EventItem[] = []
  let id = 100

  for (let i = 0; i < 120; i++) {
    const proc = processes[i % processes.length]
    const titleObj = proc.titles[i % proc.titles.length]
    // 위험 이벤트는 전체에서 소수만 발생하도록 제한 (수동 이벤트 id 1과 합쳐 총 3건)
    const severity: Severity = i < 2 ? "위험" : "경고"
    const status = statuses[i % statuses.length]
    const subArea = proc.subAreas[i % proc.subAreas.length]
    const handler = proc.handlers[i % proc.handlers.length]
    const minute = 59 - (i % 60)
    const second = (i * 7) % 60
    const currentImpact = ((i * 3) % 9) + 1
    const followUpImpact = ((i * 5) % 9) + 1
    const impactLevel = impactLevels[i % impactLevels.length]
    const affected = allProcessNames.filter((_, idx) => (i + idx) % 3 === 0).slice(0, 2)
    const logCount = 100 + i * 3

    const event: EventItem = {
      id: id++,
      datetime: `2025-05-20 ${String(13 + (i % 2)).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`,
      severity,
      area: proc.area,
      subArea,
      title: titleObj.title,
      content: titleObj.content,
      status,
      handler: status === "조치 완료" ? handler : undefined,
      trustScore: 70 + (i % 30),
      equipmentNo: String((i % 4) + 1).padStart(3, "0"),
      eventDate: "0520",
      eventCount: logCount,
      currentImpact,
      followUpImpact,
      aiScore: severity === "위험" ? 80 + (i % 20) : undefined,
      // AI 판단 / AI 추천 조치 정보 (상세 화면에서 표시)
      aiAnalysis: {
        causeEstimation: `${subArea} 설비의 센서 데이터 패턴 분석 결과, ${titleObj.title.replace(/ (이상|경고|감지|저하|부족|상승)$/, "")} 관련 이상 징후가 추정됩니다.`,
        impactAssessment: `${proc.area} 라인의 ${impactLevel === "높음" ? "주요 공정 중단" : impactLevel === "중간" ? "부분 공정 지연" : "경미한 품질 편차"} 가능성이 있어 조치가 필요합니다.`,
        additionalImpact: `미조치 시 후속 공정(${(affected.length > 0 ? affected : [allProcessNames[i % allProcessNames.length]]).join(", ")})에 영향 가능성 ${20 + (i % 30)}%`,
      },
      aiRecommendation: {
        recommendedAction: `1. ${subArea} 설비 상태 점검\n2. 관련 센서/계측값 재측정\n3. 이상 부품 교체 또는 재설정\n4. 조치 후 정상 가동 확인 및 상태 업데이트`,
        basedOn: `2025-04-${String((i % 28) + 1).padStart(2, "0")} ${proc.area} 유사 이벤트 조치 기록`,
        confidence: 82 + (i % 15),
        seniorHandler: `${handler} (시니어)`,
        similarCaseId: `DI${String(logCount).padStart(5, "0")}${String(i % 1000).padStart(4, "0")}`,
      },
      impactPrediction: {
        affectedProcesses: affected.length > 0 ? affected : [allProcessNames[i % allProcessNames.length]],
        impactLevel,
        estimatedDelay: impactLevel === "높음" ? "약 2시간" : impactLevel === "중간" ? "약 45분" : "약 15분",
      },
    }

    events.push(event)
  }

  return events
}

export const eventsData: EventItem[] = [
  {
    id: 1,
    datetime: "2025-05-20 14:32:18",
    severity: "위험",
    area: "프레스 공정",
    subArea: "프레스 #1",
    title: "프레스 실린 과부하 이상",
    content: "프레스 실린더의 압력이 정상 범위를 초과하여 과부하가 발생하였습니다. 즉시 점검이 필요합니다.",
    status: "조치 필요",
    trustScore: 92,
    equipmentNo: "001",
    eventDate: "0520",
    eventCount: 1432,
    currentImpact: 9,
    followUpImpact: 8,
    aiScore: 92,
    aiAnalysis: {
      causeEstimation: "유압 시스템 노후화로 인한 압력 불안정 또는 실린더 씰 마모로 추정됩니다.",
      impactAssessment: "프레스 작업 중단 시 후속 차체 공정 지연이 예상되며, 생산 라인 전체에 영향을 미칠 수 있습니다.",
      additionalImpact: "유사 장비(프레스 #2, #3)에서도 동일 증상 발생 가능성 15% 감지됨"
    },
    aiRecommendation: {
      recommendedAction: "1. 프레스 장비 긴급 정지 후 유압 시스템 압력 게이지 점검\n2. 실린더 씰 상태 확인 및 필요시 교체\n3. 유압 오일 레벨 및 품질 점검\n4. 압력 릴리프 밸브 동작 테스트 실시",
      basedOn: "2025-04-15 프레스 #2 유사 사례 조치 기록",
      confidence: 94,
      seniorHandler: "박철수 (시니어)",
      similarCaseId: "DP00204151287"
    },
    impactPrediction: {
      affectedProcesses: ["차체", "도장"],
      impactLevel: "높음",
      estimatedDelay: "약 2시간"
    }
  },
  {
    id: 2,
    datetime: "2025-05-20 14:28:05",
    severity: "경고",
    area: "도장 공정",
    subArea: "도장 라인 #2",
    title: "도장 부스 온도 상승 경고",
    content: "도장 부스 온도 설정 범위(15°C~30°C)을 초과하여 34°C로 상승했습니다.",
    status: "조치 완료",
    handler: "김철수",
    trustScore: 88,
    equipmentNo: "002",
    eventDate: "0520",
    eventCount: 428,
    currentImpact: 6,
    followUpImpact: 7,
    actionMethod: "냉각 시스템 점검 및 필터 청소 완료. 온도 센서 재보정 실시. 환기 팬 속도 조절하여 정상 범위(28°C)로 복귀 확인.",
    actionTimeline: [
      { time: "14:28:05", action: "이벤트 발생 확인", handler: "시스템", type: "확인" },
      { time: "14:30:12", action: "담당자 김철수에게 알림 전송", handler: "시스템", type: "확인" },
      { time: "14:32:45", action: "현장 도착 및 온도 센서 수치 확인 (34.2°C)", handler: "김철수", type: "분석" },
      { time: "14:38:20", action: "냉각 시스템 상태 점검 - 필터 막힘 확인", handler: "김철수", type: "분석" },
      { time: "14:45:00", action: "냉각 필터 청소 작업 시작", handler: "김철수", type: "조치" },
      { time: "14:58:30", action: "필터 청소 완료 및 온도 센서 재보정", handler: "김철수", type: "조치" },
      { time: "15:05:15", action: "환기 팬 속도 조절 (60% → 80%)", handler: "김철수", type: "조치" },
      { time: "15:12:40", action: "온도 정상화 확인 (28°C)", handler: "김철수", type: "검증" },
      { time: "15:15:00", action: "조치 완료 보고서 작성", handler: "김철수", type: "완료" },
    ],
    impactPrediction: {
      affectedProcesses: ["의장"],
      impactLevel: "중간",
      estimatedDelay: "약 30분"
    }
  },
  {
    id: 7,
    datetime: "2025-05-20 13:58:41",
    severity: "경고",
    area: "프레스 공정",
    subArea: "프레스 #2",
    title: "프레스 오일 압력 저하",
    content: "프레스 #2의 오일 압력이 설정 값보다 낮아졌습니다.",
    status: "조치 완료",
    handler: "박영희",
    trustScore: 82,
    equipmentNo: "002",
    eventDate: "0520",
    eventCount: 358,
    currentImpact: 5,
    followUpImpact: 6,
    actionMethod: "유압 오일 보충 및 필터 교체 완료. 압력 게이지 점검 결과 정상 범위 확인. 누유 지점 없음 확인 후 재가동.",
    actionTimeline: [
      { time: "13:58:41", action: "오일 압력 저하 이벤트 감지", handler: "시스템", type: "확인" },
      { time: "14:00:05", action: "담당자 박영희에게 알림 전송", handler: "시스템", type: "확인" },
      { time: "14:03:22", action: "현장 도착 및 압력 게이지 확인 (정상: 150bar, 현재: 95bar)", handler: "박영희", type: "분석" },
      { time: "14:08:15", action: "유압 오일 탱크 레벨 확인 - 부족 확인", handler: "박영희", type: "분석" },
      { time: "14:12:00", action: "유압 오일 보충 시작 (5L 추가)", handler: "박영희", type: "조치" },
      { time: "14:22:30", action: "유압 필터 상태 점검 - 교체 필요 확인", handler: "박영희", type: "분석" },
      { time: "14:35:45", action: "유압 필터 교체 완료", handler: "박영희", type: "조치" },
      { time: "14:40:10", action: "누유 지점 점검 - 이상 없음 확인", handler: "박영희", type: "검증" },
      { time: "14:45:20", action: "프레스 재가동 및 압력 정상화 확인 (148bar)", handler: "박영희", type: "검증" },
      { time: "14:50:00", action: "조치 완료 및 보고서 제출", handler: "박영희", type: "완료" },
    ],
    impactPrediction: {
      affectedProcesses: ["차체"],
      impactLevel: "중간",
      estimatedDelay: "약 45분"
    }
  },
  ...generateSampleEvents(),
]
