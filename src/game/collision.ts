import type { Ent } from "./types";

export function aabb(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  b: Ent,
): boolean {
  return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}

export function hitbox(e: Ent): { x: number; y: number; w: number; h: number } {
  const inset = e.kind === "mine" || e.kind === "meteor" ? 0.18 : 0.22;
  const ix = e.w * inset;
  const iy = e.h * inset;
  return { x: e.x + ix, y: e.y + iy, w: e.w - ix * 2, h: e.h - iy * 2 };
}
