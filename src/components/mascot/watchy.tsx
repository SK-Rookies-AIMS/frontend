import sprite from "@/components/mascot/watchy/watchy-sprite.png";
import {
  FRAME_WIDTH,
  FRAME_HEIGHT,
  WATCHY_SPRITE,
} from "@/components/mascot/watchy/sprite";

import type {
  WatchyState,
  WatchyTheme,
} from "@/types/watchytype";

interface Props {
  state: WatchyState;
  theme?: WatchyTheme;
  width?: number;
}

export default function Watchy({
  state,
  theme = "blue",
  width = 200,
}: Props) {
  const pos = WATCHY_SPRITE[theme][state];

  const scale = width / FRAME_WIDTH;

  return (
    <div
      style={{
        width,
        height: FRAME_HEIGHT * scale,

        backgroundImage: `url(${sprite})`,
        backgroundRepeat: "no-repeat",

        backgroundPosition: `-${pos.x * scale}px -${pos.y * scale}px`,

        backgroundSize: `${1536 * scale}px ${1024 * scale}px`,
      }}
    />
  );
}