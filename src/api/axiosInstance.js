/**
 * axiosInstance.js — 공통 axios 인스턴스
 *
 * ─── 왜 axios 인스턴스를 만들까요? ───────────────────────────────────
 *  axios를 그냥 사용하면 모든 요청마다 baseURL, 헤더를 반복해서 써야 합니다.
 *
 *    // 인스턴스 없이 사용할 때 — 매 요청마다 baseURL 반복
 *    axios.get('http://localhost:8080/api/employees');
 *    axios.post('http://localhost:8080/api/employees', data);
 *
 *  axios.create()로 인스턴스를 만들면 공통 설정을 한 번만 정의합니다.
 *
 *    // 인스턴스 사용 후 — baseURL 자동 결합
 *    axios.get('/api/employees');   → VITE_API_BASE_URL/api/employees
 *    axios.post('/api/employees');  → VITE_API_BASE_URL/api/employees
 *
 * ─── 인터셉터(Interceptor)란? ─────────────────────────────────────────
 *  "가로채다(intercept)"는 단어 그대로, 요청/응답이 목적지에 도달하기 전에
 *  중간에서 붙잡아 추가 작업을 수행하는 기능입니다.
 *
 *  [요청 흐름]
 *  컴포넌트
 *    → [★ 요청 인터셉터] ← 요청이 서버로 떠나기 직전에 실행
 *    → 서버
 *    → [★ 응답 인터셉터] ← 응답이 컴포넌트에 도달하기 직전에 실행
 *    → 컴포넌트
 *
 *  요청 인터셉터에서 주로 하는 것:
 *    - 인증 토큰(Authorization 헤더) 자동 추가 ← 이 파일에서 사용
 *    - 로딩 스피너 시작
 *
 *  응답 인터셉터에서 주로 하는 것:
 *    - 에러 메시지 변환 ← 이 파일에서 사용
 *    - 토큰 만료(401) 시 자동 로그아웃 ← 이 파일에서 사용
 *    - 로딩 스피너 종료
 *
 * ─── 이 파일에서 인터셉터를 사용하는 이유 ───────────────────────────
 *  [요청 인터셉터]
 *  모든 API 요청에 JWT 토큰을 자동으로 추가합니다.
 *  컴포넌트나 api 파일마다 헤더를 직접 설정할 필요가 없습니다.
 *    Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
 *
 *  [응답 인터셉터 — 에러 메시지]
 *  서버가 에러 응답(4xx, 5xx)을 보낼 때 axios 기본 동작은:
 *    err.message = "Request failed with status code 400"  ← 영어, 개발자용 메시지
 *  인터셉터에서 서버 메시지로 교체하면:
 *    err.message = "이미 사용 중인 이메일입니다"  ← 서버가 보낸 메시지
 *  → 컴포넌트에서 showToast(err.message, true) 한 줄로 처리 가능
 *
 *  [응답 인터셉터 — 401 자동 로그아웃]
 *  401(인증 실패): 토큰이 없거나 만료된 경우입니다.
 *  인터셉터에서 감지하여 자동으로 로그아웃 처리합니다.
 *  (localStorage 초기화 + /login 페이지로 이동)
 */
import axios from 'axios';

// ── axios 인스턴스 생성 ───────────────────────────────────────────────
//
// import.meta.env.VITE_API_BASE_URL
//   Vite의 환경변수 접근 방식입니다.
//   - npm run dev   → .env.development의 VITE_API_BASE_URL 값 사용
//   - npm run build → .env.production의 VITE_API_BASE_URL 값 사용
//   - VITE_ 접두사가 없으면 브라우저 코드에서 접근할 수 없습니다. (보안)
//
const axiosInstance = axios.create({
    baseURL: "/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// ── 요청 인터셉터 등록 ────────────────────────────────────────────────
//
// 모든 요청이 서버로 떠나기 직전에 실행됩니다.
// localStorage에서 JWT 토큰을 읽어 Authorization 헤더에 자동으로 추가합니다.
//
// Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
//   Bearer: "소지자"를 뜻하며, 토큰을 소지한 사람에게 접근 권한을 부여하는 방식입니다.
//
// localStorage를 직접 읽는 이유:
//   authStore를 import하면 순환 참조가 발생합니다.
//   (authStore → authApi → axiosInstance → authStore)
//   localStorage는 import 없이 어디서나 읽을 수 있으므로 순환 참조를 피할 수 있습니다.
//
axiosInstance.interceptors.request.use(
    config => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // config를 반드시 반환해야 요청이 계속 진행됩니다.
        return config;
    },
    error => Promise.reject(error)
);

// ── 응답 인터셉터 등록 ────────────────────────────────────────────────
//
// axiosInstance.interceptors.response.use(성공핸들러, 에러핸들러)
//   - 성공핸들러: HTTP 2xx 응답이 왔을 때 실행 (response 객체를 받음)
//   - 에러핸들러: HTTP 4xx/5xx 응답이 왔을 때 실행 (error 객체를 받음)
//
// 핸들러에서 반드시 값을 반환하거나 throw해야 합니다.
//   - return response / return Promise.resolve(값) → 성공으로 처리
//   - return Promise.reject(error) / throw error    → 에러로 처리 (catch 블록으로 전달)
//
axiosInstance.interceptors.response.use(

    // ── 성공 핸들러 (2xx 응답) ────────────────────────────────────────
    // 성공 응답은 별도 처리 없이 그대로 반환합니다.
    // response를 그대로 돌려줘야 axiosInstance.get()의 결과로 사용할 수 있습니다.
    response => response,

    // ── 에러 핸들러 (4xx, 5xx 응답) ──────────────────────────────────
    // error 객체의 주요 속성:
    //   error.message          → axios 기본 메시지: "Request failed with status code 400"
    //   error.response.status  → HTTP 상태 코드: 400, 404, 500 ...
    //   error.response.data    → 서버가 보낸 응답 본문: { message: "이미 사용 중인 이메일입니다" }
    //
    // 이 핸들러에서 error.message를 서버 메시지로 교체합니다.
    // 교체 후 Promise.reject(error)로 다시 throw해야
    // 호출한 곳(employeeApi.js, departmentApi.js)의 catch 블록이 동작합니다.
    error => {
        // error.response?.data?.message
        //   error.response가 없을 수도 있습니다 (네트워크 단절 등)
        //   ?.  (옵셔널 체이닝): 중간 값이 없으면 undefined를 반환하고 에러를 내지 않습니다.
        // ── 401 처리: 자동 로그아웃 ──────────────────────────────────
        // 401 = 인증 실패 (토큰 없음 / 만료 / 위변조)
        // 더 이상 유효한 세션이 아니므로 로그아웃 처리합니다.
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_email');
            // window.location.href를 사용하면 React 외부에서도 페이지 이동이 가능합니다.
            // (useNavigate는 React 컴포넌트 안에서만 사용 가능)
            window.location.href = '/login';
            return Promise.reject(error);
        }

        // ── 서버 에러 메시지 교체 ─────────────────────────────────────
        const serverMessage = error.response?.data?.message;

        if (serverMessage) {
            // 서버 메시지가 있으면 error.message를 교체합니다.
            // 컴포넌트에서 err.message를 그대로 사용자에게 보여줄 수 있게 됩니다.
            error.message = serverMessage;
        }
        // error.response.status 등 나머지 속성은 그대로 유지됩니다.
        // → employeeApi.js의 catch에서 err.response?.status === 404 로 여전히 확인 가능합니다.
        return Promise.reject(error);
    }
);

export default axiosInstance;