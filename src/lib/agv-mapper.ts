import { AgvOperationResponse } from "@/types/agv";

export interface ProcessFlowAgv {
    id: string;
    agvId: number;

    routeIndex: number;
    laneIndex: number;

    progress: number;

    status:
    | "WAITING"
    | "MOVING"
    | "UNLOADING"
    | "RETURNING";

    eventId?: string;
    carMasterId?: number;

    startedAt?: string | null;
    expectedArrivalTime?: string | null;
}

const ROUTE_INDEX: Record<string, number> = {
    PRESS_BODY: 0,
    BODY_PAINT: 1,
    PAINT_ASSEMBLY: 2,
    ASSEMBLY_INSPECTION: 3,
};

function clamp(value: number) {
    return Math.max(0, Math.min(1, value));
}

export function toProcessFlowAgvs(
    dtos: AgvOperationResponse[] = [],
    now: number = Date.now()
): ProcessFlowAgv[] {

    return dtos.map(dto => {

        let progress = dto.progressRate / 100;

        if (
            dto.startedAt &&
            dto.expectedArrivalTime &&
            dto.agvStatus !== "WAITING"
        ) {

            const started =
                new Date(dto.startedAt).getTime();

            const expected =
                new Date(dto.expectedArrivalTime).getTime();

            if (expected > started) {

                progress =
                    (now - started) /
                    (expected - started);
            }
        }

        progress = clamp(progress);

        if (dto.agvStatus === "WAITING") {
            progress = 0;
        }

        if (dto.agvStatus === "RETURNING") {
            progress = 1 - progress;
        }

        if (dto.agvStatus === "UNLOADING") {
            progress = 1;
        }

        return {

            id: `AGV-${dto.agvId}`,

            agvId: dto.agvId,

            routeIndex:
                ROUTE_INDEX[dto.routeCode] ?? 0,

            laneIndex:
                dto.laneNo - 1,

            progress,

            status: dto.agvStatus,

            eventId: dto.eventId ?? undefined,

            carMasterId:
                dto.carMasterId ?? undefined,

            startedAt:
                dto.startedAt,

            expectedArrivalTime:
                dto.expectedArrivalTime,
        };
    });

}