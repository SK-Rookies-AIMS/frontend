import { WatchyState, WatchyTheme } from "@/types/watchytype";

export interface SpritePosition {
    x: number;
    y: number;
}

export const FRAME_WIDTH = 307;
export const FRAME_HEIGHT = 512;

export const WATCHY_SPRITE: Record<
    WatchyTheme,
    Record<WatchyState, SpritePosition>
> = {
    navy: {
        NORMAL: { x: 0, y: 0 },
        WARNING: { x: 307, y: 0 },
        DANGER: { x: 614, y: 0 },
        CRITICAL: { x: 921, y: 0 },
        RESOLVED: { x: 1228, y: 0 },
    },

    blue: {
        NORMAL: { x: 0, y: 512 },
        WARNING: { x: 307, y: 512 },
        DANGER: { x: 614, y: 512 },
        CRITICAL: { x: 921, y: 512 },
        RESOLVED: { x: 1228, y: 512 },
    },
};