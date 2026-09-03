export type Scene = "menu" | "play" | "pause" | "gameover";

export type Kind =
  | "crab"
  | "bluejay"
  | "mine"
  | "skull"
  | "meteor"
  | "cat"
  | "ufo"
  | "coin"
  | "fuel"
  | "heart"
  | "cloud"
  | "text";

export type Ent = {
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  life: number;
  phase: number;
  baseY: number;
  waiting: number;
  text?: string;
  large?: boolean;
  rot: number;
  dead: boolean;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};
