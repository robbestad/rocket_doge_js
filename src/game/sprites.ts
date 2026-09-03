export type SheetMeta = {
  frames: number;
  fps: number;
};

export const SHEETS = {
  player: { frames: 8, fps: 10 },
  playerFly: { frames: 8, fps: 12 },
  crab: { frames: 8, fps: 8 },
  bluejay: { frames: 8, fps: 12 },
} as const satisfies Record<string, SheetMeta>;
