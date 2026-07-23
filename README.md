# AIMS Frontend

AI 기반 자동차 스마트팩토리 관제 시스템의 사용자 화면을 제공하는 프론트엔드 레포지토리입니다.

자동차 제조 공정과 품질 검사 현황을 통합 모니터링하고, 실시간 이벤트 알림, 공정 이상 탐지, 병목 분석, 불량 전이 예측 및 조치 이력 관리 기능을 제공합니다.

---

## 주요 기능

### 1. 사용자 인증 및 접근 제어

- 이메일 기반 로그인 및 회원가입
- JWT Access Token을 `sessionStorage`에 저장
- 인증되지 않은 사용자의 보호 페이지 접근 차단
- 사용자 프로필 조회 및 비밀번호 변경 UI

### 2. 통합 관제 대시보드

- 설비 상태 및 전체 공정 흐름 모니터링
- 프레스, 차체, 도장, 의장, 검사 공정 상태 시각화
- AGV 상태 실시간 수신
- 이벤트 알림과 AI 매뉴얼 표시
- 다크 테마 기반 관제 화면 제공

### 3. 제조 공정 분석

- 공정별 가동률 및 전체 공정 흐름 요약
- 병목 공정 탐지 및 지연 시간 분석
- 차량별 불량 전이 확률 예측
- SHAP 기반 주요 원인 분석
- 공정별 이상 탐지
  - 프레스 공정 정지 및 Cycle Time 이상
  - 차체 로봇 진동 및 충돌 위험
  - 도장 품질 이상
  - 의장 조립 순서 이상

### 4. 품질 검사 모니터링

- 검사 공정 진행 상태 조회
- 검사 결과 및 위험도 요약
- 위험도 이력과 추세 차트 제공
- 차량 상태 및 주행 검사 상세 조회
- 수동 새로고침 및 자동 갱신 지원

### 5. 이벤트 및 조치 이력 관리

- 이벤트 목록 조회, 검색, 필터링 및 페이지네이션
- 심각도, 처리 상태, 공정, 우선순위별 조회
- 이벤트 우선순위 점수 및 요약 정보 제공
- 이벤트 처리 상태 변경
- 유사 사례 기반 권장 조치 조회
- 조치 내용과 결과 타임라인 등록

### 6. 실시간 통신

- SockJS와 STOMP 기반 실시간 이벤트 수신
- AGV 상태 및 경보 알림 실시간 반영
- 연결 오류 발생 시 자동 재연결

---

## 화면 경로

| 경로 | 화면 |
|---|---|
| `/` | 통합 관제 대시보드 |
| `/login` | 로그인 |
| `/signup` | 회원가입 |
| `/manufacturing` | 제조 공정 분석 |
| `/inspection` | 품질 검사 모니터링 |
| `/events` | 이벤트 및 조치 이력 관리 |

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| Core | React 19, TypeScript 5.7 |
| Build Tool | Vite 7 |
| Routing | React Router DOM 7 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui, Radix UI |
| State / Form | React Hooks, React Hook Form, Zod |
| HTTP Client | Axios, Fetch API |
| Realtime | STOMP, SockJS |
| Chart | Recharts |
| Animation | Framer Motion |
| Icon | Lucide React |
| 3D | Three.js, React Three Fiber, Drei |
| Container | Docker, Nginx |

---

## 패키지 구조

```text
frontend-dev/
├── public/                     # 로고, 파비콘, 이미지 리소스
├── src/
│   ├── api/                    # 인증, 공정, 품질, 이벤트 API
│   ├── components/
│   │   ├── dashboard/          # 통합 대시보드 컴포넌트
│   │   ├── event/              # 이벤트 요약 컴포넌트
│   │   ├── manufacturing/      # 제조 공정 분석 컴포넌트
│   │   ├── mascot/             # AI 매뉴얼 및 Watchy 캐릭터
│   │   ├── ui/                 # 공통 UI 컴포넌트
│   │   └── user/               # 사용자 정보 및 비밀번호 변경
│   ├── hooks/                  # WebSocket 및 공통 커스텀 Hook
│   ├── lib/                    # 데이터 변환 및 공통 유틸리티
│   ├── pages/                  # 라우팅 단위 페이지
│   ├── styles/                 # 전역 스타일
│   ├── types/                  # TypeScript 타입 정의
│   ├── App.tsx                 # 애플리케이션 라우팅
│   └── main.tsx                # 애플리케이션 진입점
├── Dockerfile                  # 멀티 스테이지 이미지 빌드
├── nginx.conf                  # SPA 라우팅 및 Health Check
├── vite.config.ts              # Vite 및 API Proxy 설정
├── package.json
└── tsconfig.json
```

---

## 실행 방법

### 1. 사전 요구사항

- Node.js 20 이상 권장
- npm
- 연동할 백엔드 서비스

로컬 개발 환경의 기본 연결 포트는 다음과 같습니다.

| 서비스 | 포트 | 요청 경로 |
|---|---:|---|
| Backend | `8081` | `/api`, `/ws` |
| Assembly Service | `8082` | `/api/process` |
| Quality Service | `8083` | `/api/quality/inspection` |
| AI Service | `8000` | `/api/ai` |

### 2. 저장소 이동

```bash
cd frontend
```

### 3. 패키지 설치

`package-lock.json`을 기준으로 동일한 의존성을 설치합니다.

```bash
npm ci
```

### 4. 환경 변수 설정

프로젝트 루트에 `.env.development` 파일을 생성합니다.

```env
VITE_API_BASE_URL=/api
```

`VITE_API_BASE_URL`은 이벤트 API의 기본 주소로 사용됩니다. `/api`로 지정하면 Vite Proxy를 통해 로컬 Backend의 `8081` 포트로 전달됩니다.

> `.env`, `.env.*` 파일은 Git에서 제외되므로 저장소에 커밋하지 않습니다.

### 5. 개발 서버 실행

```bash
npm run dev
```

기본 접속 주소:

```text
http://localhost:5173
```

### 6. 로컬 WebSocket 설정

알림 WebSocket은 개발 환경에서 `http://localhost:8081/ws`를 사용합니다.

AGV WebSocket도 로컬 Backend에 연결하려면 `vite.config.ts`의 `/ws` Proxy 주석을 해제합니다.

```ts
"/ws": {
  target: "http://localhost:8081",
  changeOrigin: true,
  ws: true,
},
```

변경 후 개발 서버를 다시 시작합니다.

### 7. 프로덕션 빌드

```bash
npm run build
```

빌드 결과물은 `dist/` 디렉터리에 생성됩니다.

---

## API 및 인증 참고사항

- 로그인 성공 시 Access Token은 `aims-auth-accessToken` 키로 `sessionStorage`에 저장됩니다.
- 보호 화면은 `AuthGuard`를 통해 로그인 여부를 확인합니다.
- 공통 Axios 요청에는 JWT 토큰을 `Authorization: Bearer <token>` 형태로 전달합니다.
- 개발 환경의 API 요청은 `vite.config.ts`에 정의된 Proxy 규칙을 따릅니다.
- 프로덕션 알림 WebSocket 주소는 `https://aims-factory.com/ws`로 설정되어 있습니다.

---

## 배포 참고사항

- Nginx의 `try_files` 설정을 통해 React Router의 새로고침 오류를 방지합니다.
- Kubernetes 또는 Load Balancer Health Check에는 `/health` 경로를 사용할 수 있습니다.
- 애플리케이션 API와 WebSocket 경로가 Ingress 또는 Reverse Proxy 설정과 일치해야 합니다.
- 프로덕션 배포 전 `vite.config.ts`의 운영 도메인과 API 경로를 확인해야 합니다.
