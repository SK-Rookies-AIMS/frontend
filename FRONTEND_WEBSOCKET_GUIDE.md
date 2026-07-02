# 병목, 불량 전이, AI 원인 분석 WebSocket 연동 가이드

이 서비스의 WebSocket은 대시보드 데이터를 직접 모두 내려주지 않고, 분석 결과가 갱신되었다는 알림만 보냅니다. 프론트는 WebSocket 메시지를 받으면 기존 REST API를 다시 호출해서 최신 목록을 갱신하면 됩니다.

## 전체 흐름

1. 화면 진입 시 기존 REST API로 초기 데이터를 조회합니다.
2. `/ws/process-analysis` WebSocket에 연결합니다.
3. WebSocket 메시지 타입에 따라 필요한 REST API만 다시 조회합니다.
4. 화면 이탈 시 WebSocket 연결을 닫습니다.

이 구조를 쓰는 이유는 cursor 기반 무한스크롤, Redis cache, API 응답 포맷을 그대로 유지하면서 실시간성만 추가하기 위해서입니다.

## WebSocket Endpoint

개발 환경 예시:

```text
ws://localhost:8000/ws/process-analysis
```

HTTPS 배포 환경에서는 `wss://`를 사용합니다.

```text
wss://api.example.com/ws/process-analysis
```

서버 연결 성공 시 최초 메시지:

```json
{
  "type": "CONNECTED"
}
```

클라이언트가 `"ping"` 텍스트를 보내면 서버는 아래처럼 응답합니다.

```json
{
  "type": "PONG"
}
```

## REST API

### 병목 탐지 목록

```http
GET /api/ai/process/bottleneck?cursor=0&size=5
```

응답 데이터 구조:

```ts
type BottleneckPage = {
  content: {
    rankNo: number;
    processCode: string;
    delayTime: number;
    affectedVehicleCount: number;
    riskScore: number;
  }[];
  hasNext: boolean;
  nextCursor: number | null;
};
```

### 불량 전이 예측 목록

```http
GET /api/ai/process/defect-transfer/predictions?cursor=0&size=5
```

응답 데이터 구조:

```ts
type DefectTransferPredictionPage = {
  content: {
    vehicleId: string;
    carMasterId: number;
    currentProcess: string;
    predictedDefectProcess: string | null;
    defectProbability: number;
    expectedTime: string | null;
    riskLevel: string;
  }[];
  hasNext: boolean;
  nextCursor: number | null;
};
```

`vehicleId`는 `car_master.vehicle_id`입니다. AI 원인 분석 select box는 이 목록의 `content[].vehicleId`로 구성하면 됩니다. 별도 차량 목록 API는 필요하지 않습니다.

### SHAP 기반 AI 원인 분석

```http
GET /api/ai/process/defect-transfer/causes?vehicleId=VIN-001245&cursor=0&size=5
```

`vehicleId`를 생략하면 현재 예측 불량 확률이 가장 높은 차량을 기준으로 조회합니다.

응답 데이터 구조:

```ts
type DefectTransferCausePage = {
  vehicleId: string | null;
  carMasterId: number | null;
  predictedDefectProbability: number | null;
  riskLevel: string | null;
  currentProcess: string | null;
  predictedDefectProcess: string | null;
  transferProbability: number | null;
  content: {
    rank: number;
    feature: string;
    label: string;
    value: string;
    impact: number;
    message: string;
  }[];
  hasNext: boolean;
  nextCursor: number | null;
};
```

## WebSocket Message Types

### 병목 탐지 갱신

```json
{
  "type": "BOTTLENECK_UPDATED",
  "eventId": "EVT-20260701-000001",
  "carMasterId": 84,
  "vehicleId": "VIN-001245",
  "processCode": "BODY",
  "updatedAt": "2026-07-01T10:15:30+09:00",
  "resultCount": 5
}
```

프론트 처리:

- 병목 탐지 영역이 화면에 있으면 `/api/ai/process/bottleneck?cursor=0&size=...` 재조회
- 무한스크롤 목록은 첫 페이지부터 새로고침하는 것을 권장
- 사용자가 아래 페이지를 보고 있어도 실시간 갱신 시 정렬 순위가 바뀔 수 있으므로 기존 페이지 append보다 reset 후 refetch가 안전

### 불량 전이 예측 갱신

```json
{
  "type": "DEFECT_TRANSFER_UPDATED",
  "eventId": "EVT-20260701-000001",
  "carMasterId": 84,
  "vehicleId": "VIN-001245",
  "processCode": "PAINT",
  "updatedAt": "2026-07-01T10:15:30+09:00",
  "defectProbability": 78.0,
  "transferProbability": 72.0,
  "riskGrade": "HIGH",
  "predictedDefectProcess": "ASSEMBLY (A1)"
}
```

프론트 처리:

- 불량 전이 예측 목록 재조회
- select box의 차량 후보도 이 목록에서 다시 생성
- 현재 선택된 `vehicleId`와 메시지의 `vehicleId`가 같으면 AI 원인 분석도 재조회
- 현재 선택된 차량이 없으면 갱신된 예측 목록의 첫 번째 차량을 선택하고 원인 분석을 조회

## 권장 React 구현

아래 예시는 TanStack Query를 기준으로 작성했습니다. SWR이나 직접 fetch를 사용해도 핵심은 같습니다.

```ts
const WS_URL =
  window.location.protocol === "https:"
    ? `wss://${window.location.host}/ws/process-analysis`
    : `ws://${window.location.hostname}:8000/ws/process-analysis`;
```

```ts
type ProcessAnalysisMessage =
  | {
      type: "CONNECTED";
    }
  | {
      type: "PONG";
    }
  | {
      type: "BOTTLENECK_UPDATED";
      eventId: string;
      carMasterId: number;
      vehicleId: string | null;
      processCode: string;
      updatedAt: string;
      resultCount: number;
    }
  | {
      type: "DEFECT_TRANSFER_UPDATED";
      eventId: string;
      carMasterId: number;
      vehicleId: string | null;
      processCode: string;
      updatedAt: string;
      defectProbability: number;
      transferProbability: number | null;
      riskGrade: string;
      predictedDefectProcess: string | null;
    };
```

```tsx
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useProcessAnalysisWebSocket(selectedVehicleId?: string | null) {
  const queryClient = useQueryClient();
  const selectedVehicleIdRef = useRef(selectedVehicleId);

  useEffect(() => {
    selectedVehicleIdRef.current = selectedVehicleId;
  }, [selectedVehicleId]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let closedByClient = false;

    const connect = () => {
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        socket?.send("ping");
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as ProcessAnalysisMessage;

        if (message.type === "BOTTLENECK_UPDATED") {
          queryClient.invalidateQueries({ queryKey: ["bottleneck"] });
          return;
        }

        if (message.type === "DEFECT_TRANSFER_UPDATED") {
          queryClient.invalidateQueries({ queryKey: ["defect-transfer", "predictions"] });

          if (
            message.vehicleId &&
            selectedVehicleIdRef.current === message.vehicleId
          ) {
            queryClient.invalidateQueries({
              queryKey: ["defect-transfer", "causes", message.vehicleId],
            });
          }
        }
      };

      socket.onclose = () => {
        if (!closedByClient) {
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      closedByClient = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [queryClient]);
}
```

## Query Key 권장안

무한스크롤을 쓴다면 query key를 기능별로 분리하세요.

```ts
const queryKeys = {
  bottleneck: ["bottleneck"],
  defectTransferPredictions: ["defect-transfer", "predictions"],
  defectTransferCauses: (vehicleId: string | null) => [
    "defect-transfer",
    "causes",
    vehicleId,
  ],
};
```

WebSocket 메시지 수신 시:

```ts
queryClient.invalidateQueries({ queryKey: queryKeys.bottleneck });
queryClient.invalidateQueries({ queryKey: queryKeys.defectTransferPredictions });
queryClient.invalidateQueries({
  queryKey: queryKeys.defectTransferCauses(selectedVehicleId),
});
```

## 무한스크롤 갱신 방식

실시간 갱신이 들어오면 기존 페이지 뒤에 append하지 말고 첫 페이지부터 다시 가져오는 방식을 권장합니다.

이유:

- 병목 순위는 새 이벤트마다 바뀔 수 있습니다.
- 불량 전이 예측 목록은 확률 기준 정렬입니다.
- 0% 차량은 목록에서 제외됩니다.
- Redis cache는 Kafka consumer가 새 결과 저장 후 삭제하므로, 재조회 시 최신 DB 기준으로 다시 cache됩니다.

TanStack Query의 `useInfiniteQuery`를 쓴다면 `invalidateQueries`만 호출해도 active query가 재조회됩니다. 더 강하게 초기화하고 싶으면 화면 상태의 scroll cursor를 0으로 되돌린 뒤 refetch하세요.

## Select Box 구성

AI 원인 분석 차량 선택 select box는 불량 전이 예측 목록에서 만듭니다.

```ts
const vehicleOptions = predictionPages.flatMap((page) =>
  page.content.map((item) => ({
    label: item.vehicleId,
    value: item.vehicleId,
    probability: item.defectProbability,
  })),
);
```

선택값 처리 권장:

1. 사용자가 선택한 차량이 있으면 그 `vehicleId`로 causes API 호출
2. 선택값이 없으면 예측 목록 첫 번째 차량을 기본 선택
3. WebSocket으로 예측 목록이 갱신되면 select option을 다시 계산
4. 현재 선택 차량이 새 목록에 없으면 첫 번째 차량으로 변경

## 에러와 재연결

권장 정책:

- WebSocket 연결 실패 시 3초 뒤 재연결
- 재연결 중에도 REST API는 기존 방식으로 사용 가능
- 메시지 파싱 실패는 무시하고 연결은 유지
- 화면 탭이 비활성화되어도 연결이 끊길 수 있으므로 `onclose`에서 재연결 처리

운영 환경에서 서버를 여러 worker/process로 띄우는 경우, 현재 구현은 같은 프로세스에 연결된 클라이언트에게만 브로드캐스트됩니다. 다중 worker에서 모든 클라이언트에 동일 알림을 보내야 하면 Redis Pub/Sub 같은 공용 브로드캐스트 채널을 추가해야 합니다.
