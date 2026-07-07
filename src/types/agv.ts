export type AgvStatus =
    | "WAITING"
    | "MOVING"
    | "UNLOADING"
    | "RETURNING";

export type ProcessCode =
    | "PRESS"
    | "BODY"
    | "PAINT"
    | "ASSEMBLY"
    | "INSPECTION";

export interface AgvOperationResponse {
    agvId: number;

    eventId: string | null;

    carMasterId: number | null;

    agvStatus: AgvStatus;

    currentProcess: ProcessCode;

    targetProcess: ProcessCode | null;

    progressRate: number;

    delaySeconds: number;

    startedAt: string | null;

    expectedArrivalTime: string | null;

    routeCode: string;

    laneNo: number;

    updatedAt: string;
}