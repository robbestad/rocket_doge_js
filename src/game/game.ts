import type { Assets } from "./assets";
import { AudioBank } from "./audio";
import { aabb, hitbox } from "./collision";
import {
  BOOST_DRAIN,
  BOOST_MAX,
  BOOST_REGEN_AIR,
  BOOST_REGEN_GROUND,
  CEILING,
  CLOUD_PARALLAX,
  COIN_VALUE,
  FUEL_GAIN,
  GRAVITY,
  GROUND_H,
  GROUND_Y,
  H,
  HILL_PARALLAX,
  HS_KEY,
  IFRAMES,
  LIVES,
  MAX_FALL,
  MAX_RISE,
  PLAYER_X,
  PX_PER_POINT,
  SPEED_MAX,
  SPEED_RAMP,
  SPEED_START,
  THRUST,
  W,
  WOW,
} from "./constants";
import { Input } from "./input";
import { SHEETS } from "./sprites";
import type { Ent, Particle, Scene } from "./types";

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

const ENEMY: KindEnemy[] = [
  "crab",
  "bluejay",
  "mine",
  "skull",
  "meteor",
  "cat",
  "ufo",
];
type KindEnemy = "crab" | "bluejay" | "mine" | "skull" | "meteor" | "cat" | "ufo";

export class RocketDoge {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private assets: Assets;
  private input: Input;
  private audio = new AudioBank();
  private raf = 0;
  private last = 0;
  private running = false;

  private scene: Scene = "menu";
  private scroll = 0;
  private speed = SPEED_START;
  private score = 0;
  private coins = 0;
  private high = Number(localStorage.getItem(HS_KEY) || 0);
  private lives = LIVES;
  private boost = BOOST_MAX;
  private py = GROUND_Y - 72;
  private pvy = 0;
  private pw = 70;
  private ph = 72;
  private thrusting = false;
  private grounded = true;
  private iframes = 0;
  private shake = 0;
  private hint = 2.6;
  private time = 0;
  private spawnT = 0.6;
  private coinT = 1.2;
  private fuelT = 4;
  private heartT = 8;
  private lastCrab = -99;
  private lastMeteorUfo = -99;
  private ents: Ent[] = [];
  private parts: Particle[] = [];
  private hoverPlay = false;
  private hoverAgain = false;
  private hoverMenu = false;

  constructor(canvas: HTMLCanvasElement, assets: Assets) {
    this.canvas = canvas;
    this.assets = assets;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context missing");
    this.ctx = ctx;
    this.input = new Input(canvas);
    this.fitCanvas();
    window.addEventListener("resize", this.fitCanvas);
    this.seedClouds();
  }

  private fitCanvas = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  start() {
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.033, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.audio.stopAll();
    this.input.dispose();
    window.removeEventListener("resize", this.fitCanvas);
  }

  private resetRun() {
    this.scroll = 0;
    this.speed = SPEED_START;
    this.score = 0;
    this.coins = 0;
    this.lives = LIVES;
    this.boost = BOOST_MAX;
    this.py = GROUND_Y - 80;
    this.pvy = 0;
    this.thrusting = false;
    this.grounded = false;
    this.iframes = 1.6;
    this.shake = 0;
    this.hint = 2.6;
    this.time = 0;
    this.spawnT = 1.6;
    this.coinT = 1.1;
    this.fuelT = 3.5;
    this.heartT = 7;
    this.lastCrab = -99;
    this.lastMeteorUfo = -99;
    this.ents = [];
    this.parts = [];
    this.seedClouds();
  }

  private seedClouds() {
    for (let i = 0; i < 8; i++) {
      const large = Math.random() > 0.45;
      this.pushEnt(
        "cloud",
        rand(-80, W * 2.4),
        rand(12, 168),
        large ? 220 : 150,
        large ? 96 : 64,
        0,
        0,
        0,
        0,
        large,
      );
    }
  }

  private update(dt: number) {
    if (this.scene === "menu") {
      this.audio.setRocket(false);
      this.time += dt;
      this.scroll += 32 * dt;
      this.updateEnts(dt);
      this.updateMenu();
      return;
    }
    if (this.scene === "gameover") {
      this.audio.setRocket(false);
      this.updateGameover();
      return;
    }
    if (this.input.consumePause()) {
      this.scene = this.scene === "pause" ? "play" : "pause";
      this.audio.setMusic(this.scene === "pause" ? "pause" : "play");
    }
    if (this.scene === "pause") {
      this.audio.setRocket(false);
      return;
    }
    this.updatePlay(dt);
  }

  private playBtn() {
    return { x: W / 2 - 140, y: 360, w: 280, h: 88 };
  }
  private againBtn() {
    return { x: W / 2 - 140, y: 300, w: 280, h: 80 };
  }
  private menuBtn() {
    return { x: W / 2 - 90, y: 400, w: 180, h: 44 };
  }
  private hitBtn(b: { x: number; y: number; w: number; h: number }) {
    const { pointerX: x, pointerY: y } = this.input;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  private updateMenu() {
    const b = this.playBtn();
    this.hoverPlay = this.hitBtn(b);
    const confirm = this.input.consumeConfirm();
    const press = this.input.consumePress();
    if (press || confirm) this.audio.unlock();
    if (confirm || (press && this.hoverPlay)) {
      this.resetRun();
      this.scene = "play";
      this.audio.setMusic("play");
    } else if (press) {
      this.audio.setMusic("menu");
    }
  }

  private updateGameover() {
    this.hoverAgain = this.hitBtn(this.againBtn());
    this.hoverMenu = this.hitBtn(this.menuBtn());
    const confirm = this.input.consumeConfirm();
    const press = this.input.consumePress();
    if (confirm || (press && this.hoverAgain)) {
      this.resetRun();
      this.scene = "play";
      this.audio.setMusic("play");
    } else if (press && this.hoverMenu) {
      this.scroll = 0;
      this.ents = [];
      this.seedClouds();
      this.scene = "menu";
      this.audio.setMusic("menu");
    }
  }

  private updatePlay(dt: number) {
    this.time += dt;
    this.hint = Math.max(0, this.hint - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.shake *= Math.pow(0.04, dt);

    const t = Math.min(1, this.scroll / (SPEED_START * SPEED_RAMP));
    this.speed = SPEED_START + (SPEED_MAX - SPEED_START) * t;
    this.scroll += this.speed * dt;
    this.score = Math.floor(this.scroll / PX_PER_POINT) + this.coins * COIN_VALUE;

    const wantThrust = this.input.thrusting && this.boost > 0.5;
    this.thrusting = wantThrust;
    this.audio.setRocket(wantThrust);

    if (wantThrust) {
      this.boost = Math.max(0, this.boost - BOOST_DRAIN * dt);
      this.pvy += THRUST * dt;
      this.spawnExhaust();
      if (Math.random() > 0.992) this.floatText(PLAYER_X + 40, this.py, pick(WOW));
    } else {
      this.pvy += GRAVITY * dt;
      const regen = this.grounded ? BOOST_REGEN_GROUND : BOOST_REGEN_AIR;
      this.boost = Math.min(BOOST_MAX, this.boost + regen * dt);
    }
    this.pvy = clamp(this.pvy, MAX_RISE, MAX_FALL);
    this.py += this.pvy * dt;
    this.grounded = this.py + this.ph >= GROUND_Y - 1;
    if (this.grounded) {
      this.py = GROUND_Y - this.ph;
      this.pvy = Math.min(0, this.pvy);
    }
    if (this.py < CEILING) {
      this.py = CEILING;
      this.pvy = Math.max(0, this.pvy);
    }

    this.spawnT -= dt;
    this.coinT -= dt;
    this.fuelT -= dt;
    this.heartT -= dt;
    if (this.spawnT <= 0) this.spawnEnemy();
    if (this.coinT <= 0) this.spawnCoins();
    if (this.fuelT <= 0) this.spawnFuel();
    if (this.heartT <= 0) this.spawnHeart();

    this.updateEnts(dt);
    this.updateParts(dt);
    this.collide();
  }

  private interval() {
    const u = Math.min(1, this.scroll / 22000);
    return 0.85 - 0.5 * u;
  }

  private unlocked(): KindEnemy[] {
    const s = this.scroll;
    const list: KindEnemy[] = ["crab", "bluejay"];
    if (s > 4000) list.push("mine");
    if (s > 7000) list.push("skull");
    if (s > 11000) list.push("meteor");
    if (s > 15000) list.push("cat");
    if (s > 19000) list.push("ufo");
    return list;
  }

  private spawnEnemy() {
    const live = this.ents.filter((e) => ENEMY.includes(e.kind as KindEnemy) && !e.dead);
    this.spawnT = this.interval() + rand(0, 0.25);
    if (live.length >= 5) return;

    let kind = pick(this.unlocked());
    if (kind === "crab" && this.time - this.lastCrab < 1.2) kind = "bluejay";
    if (
      (kind === "meteor" || kind === "ufo") &&
      this.time - this.lastMeteorUfo < 1.5
    ) {
      kind = pick(["bluejay", "mine", "skull"] as KindEnemy[]);
    }

    const x = this.scroll + W + 40;
    if (kind === "crab") {
      this.lastCrab = this.time;
      this.pushEnt("crab", x, GROUND_Y - 52, 72, 50, -50, 0);
    } else if (kind === "bluejay") {
      const y = rand(40, GROUND_Y - 160);
      this.pushEnt("bluejay", x, y, 78, 58, -40, 0, y);
      if (this.scroll > 3500 && y + 180 < GROUND_Y - 80 && Math.random() > 0.45) {
        this.pushEnt("bluejay", x + 70, y + 160, 78, 58, -40, 0, y + 160);
      }
    } else if (kind === "mine") {
      this.pushEnt("mine", x, rand(70, GROUND_Y - 120), 58, 58, 0, 0);
    } else if (kind === "skull") {
      if (this.scroll > 24000 && Math.random() > 0.7) this.tunnel();
      else this.pushEnt("skull", x, rand(50, GROUND_Y - 130), 70, 60, 0, 0, 0, 0.55);
    } else if (kind === "meteor") {
      this.lastMeteorUfo = this.time;
      this.pushEnt("meteor", x + rand(0, 80), -40, 70, 70, -220, 280);
    } else if (kind === "cat") {
      this.pushEnt("cat", x, rand(50, GROUND_Y - 200), 70, 100, -30, 0);
    } else if (kind === "ufo") {
      this.lastMeteorUfo = this.time;
      this.pushEnt("ufo", x, this.py, 96, 58, -70, 0);
    }
  }

  private tunnel() {
    const gap = rand(80, GROUND_Y - 200);
    const x = this.scroll + W + 20;
    for (let i = 0; i < 4; i++) {
      this.pushEnt("skull", x + i * 46, 36, 64, 54, 0, 0, 0, 0.35);
      this.pushEnt("skull", x + i * 46, gap + 140, 64, 54, 0, 0, 0, 0.35);
    }
  }

  private spawnCoins() {
    this.coinT = rand(1.4, 2.4);
    const x = this.scroll + W + 30;
    const y = rand(50, GROUND_Y - 110);
    const form = Math.floor(Math.random() * 3);
    if (form === 0) {
      for (let i = 0; i < 5; i++) this.pushEnt("coin", x + i * 32, y, 28, 28);
    } else if (form === 1) {
      this.pushEnt("coin", x, y, 28, 28);
      this.pushEnt("coin", x - 22, y + 22, 28, 28);
      this.pushEnt("coin", x + 22, y + 22, 28, 28);
      this.pushEnt("coin", x, y + 44, 28, 28);
    } else {
      for (let i = 0; i < 5; i++) {
        this.pushEnt("coin", x + i * 32, y, 28, 28);
        this.pushEnt("coin", x + i * 32, y - 28, 28, 28);
      }
    }
  }

  private spawnFuel() {
    this.fuelT = rand(7, 12);
    this.pushEnt("fuel", this.scroll + W + 40, rand(40, 180), 52, 36);
  }

  private spawnHeart() {
    this.heartT = rand(9, 16);
    this.pushEnt("heart", this.scroll + W + 50, rand(50, GROUND_Y - 140), 36, 34);
  }

  private pushEnt(
    kind: Ent["kind"],
    x: number,
    y: number,
    w: number,
    h: number,
    vx = 0,
    vy = 0,
    baseY = y,
    waiting = 0,
    large = false,
  ) {
    this.ents.push({
      kind,
      x,
      y,
      w,
      h,
      vx,
      vy,
      life: 1,
      phase: rand(0, Math.PI * 2),
      baseY,
      waiting,
      large,
      rot: 0,
      dead: false,
    });
  }

  private floatText(x: number, y: number, text: string) {
    this.ents.push({
      kind: "text",
      x: x + this.scroll,
      y,
      w: 40,
      h: 20,
      vx: 0,
      vy: -70,
      life: 1.6,
      phase: 0,
      baseY: y,
      waiting: 0,
      text,
      rot: 0,
      dead: false,
    });
  }

  private spawnExhaust() {
    for (let i = 0; i < 2; i++) {
      this.parts.push({
        x: PLAYER_X + 6,
        y: this.py + this.ph * 0.62,
        vx: -rand(80, 180),
        vy: rand(-40, 40),
        life: rand(0.18, 0.35),
        max: 0.35,
        size: rand(3, 7),
        color: Math.random() > 0.5 ? "#ffb347" : "#ff5a1f",
      });
    }
  }

  private updateEnts(dt: number) {
    for (const e of this.ents) {
      if (e.dead) continue;
      e.phase += dt;
      if (e.kind === "cloud") {
        if (e.x - this.scroll * CLOUD_PARALLAX < -340) {
          e.x += W * 2.6 + rand(40, 200);
          e.y = rand(12, 168);
        }
        continue;
      }
      if (e.kind === "bluejay") {
        e.y = e.baseY + Math.cos(e.phase * 3.2) * 28;
        e.x += e.vx * dt;
      } else if (e.kind === "crab") {
        e.y = GROUND_Y - e.h;
        e.x += e.vx * dt;
      } else if (e.kind === "mine") {
        const s = 1 + Math.sin(e.phase * 4) * 0.06;
        e.w = 58 * s;
        e.h = 58 * s;
      } else if (e.kind === "skull") {
        if (e.waiting > 0) {
          e.waiting -= dt;
          e.x += this.speed * dt * 0.15;
        } else {
          e.vx = Math.min(-420, e.vx - 900 * dt);
          e.x += e.vx * dt;
        }
      } else if (e.kind === "meteor") {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.rot += dt * 2.4;
      } else if (e.kind === "cat") {
        e.y = e.baseY + Math.sin(e.phase * 1.6) * 22;
        e.x += e.vx * dt;
      } else if (e.kind === "ufo") {
        const target = this.py + this.ph * 0.2;
        e.y += (target - e.y) * Math.min(1, 1.6 * dt);
        e.x += e.vx * dt;
      } else if (e.kind === "fuel" || e.kind === "heart") {
        e.y = e.baseY + Math.sin(e.phase * 3.2) * 10;
      } else if (e.kind === "text") {
        e.y += e.vy * dt;
        e.life -= dt;
        if (e.life <= 0) e.dead = true;
      } else {
        e.x += e.vx * dt;
      }
      if (e.x < this.scroll - 220 || e.y > H + 80) e.dead = true;
    }
    this.ents = this.ents.filter((e) => !e.dead);
  }

  private updateParts(dt: number) {
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  private collide() {
    const px = PLAYER_X + this.pw * 0.22;
    const py = this.py + this.ph * 0.2;
    const pw = this.pw * 0.56;
    const ph = this.ph * 0.62;
    for (const e of this.ents) {
      if (e.dead) continue;
      if (e.kind === "cloud" || e.kind === "text") continue;
      const hb = hitbox(e);
      const sx = hb.x - this.scroll;
      if (!aabb(px, py, pw, ph, { ...e, x: sx, y: hb.y, w: hb.w, h: hb.h })) continue;
      if (e.kind === "coin") {
        e.dead = true;
        this.coins += 1;
        this.audio.playCoin();
        this.floatText(PLAYER_X + 20, this.py, "+10");
      } else if (e.kind === "fuel") {
        e.dead = true;
        this.boost = Math.min(BOOST_MAX, this.boost + FUEL_GAIN);
        this.audio.playPickup();
        this.floatText(PLAYER_X + 20, this.py, "MUCH BOOST");
      } else if (e.kind === "heart") {
        e.dead = true;
        this.audio.playPickup();
        if (this.lives < LIVES) {
          this.lives += 1;
          this.floatText(PLAYER_X + 20, this.py, "much heart");
        } else {
          this.coins += 2;
          this.floatText(PLAYER_X + 20, this.py, "wow +20");
        }
      } else {
        this.hit();
      }
    }
  }

  private hit() {
    if (this.iframes > 0) return;
    this.lives -= 1;
    this.iframes = IFRAMES;
    this.shake = 10;
    if (this.lives <= 0) {
      this.audio.playDeath();
      this.audio.setRocket(false);
      this.audio.setMusic("menu");
      if (this.score > this.high) {
        this.high = this.score;
        localStorage.setItem(HS_KEY, String(this.high));
      }
      this.scene = "gameover";
    } else {
      this.audio.playCrash();
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    this.drawWorld();
    this.drawClouds();
    if (this.scene === "menu") this.drawMenu();
    else {
      this.drawPlay();
      if (this.scene === "pause") this.drawPause();
      if (this.scene === "gameover") this.drawGameover();
    }
    ctx.restore();
  }

  private drawWorld() {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#7ec8ff");
    g.addColorStop(0.55, "#c8ecff");
    g.addColorStop(1, "#e7f7c8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const hills = this.assets.hills;
    const hillH = 236;
    const hillW = hills.width * (hillH / hills.height);
    const period = hillW;
    let hx = -((this.scroll * HILL_PARALLAX) % period);
    if (hx > 0) hx -= period;
    for (let x = hx; x < W; x += period) {
      ctx.drawImage(hills, x, GROUND_Y - hillH + 10, hillW, hillH);
    }

    const ground = this.assets.ground;
    const gw = ground.width * ((GROUND_H + 6) / ground.height);
    let gx = -((this.scroll) % gw);
    if (gx > 0) gx -= gw;
    for (let x = gx; x < W; x += gw) {
      ctx.drawImage(ground, x, GROUND_Y - 8, gw, GROUND_H + 10);
    }
  }

  private drawSprite(
    img: HTMLImageElement,
    x: number,
    y: number,
    h: number,
    rot = 0,
    alpha = 1,
  ) {
    const ctx = this.ctx;
    const w = (img.width / img.height) * h;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (rot) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(rot);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
    return w;
  }

  private drawSheet(
    img: HTMLImageElement,
    frames: number,
    fps: number,
    x: number,
    y: number,
    h: number,
    alpha = 1,
  ) {
    const cellW = img.width / frames;
    const cellH = img.height;
    const frame = Math.floor(this.time * fps) % frames;
    const destW = (cellW / cellH) * h;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, frame * cellW, 0, cellW, cellH, x, y, destW, h);
    ctx.restore();
    return destW;
  }

  private drawClouds() {
    for (const e of this.ents) {
      if (e.kind !== "cloud") continue;
      const img = e.large ? this.assets.cloudLarge : this.assets.cloudSmall;
      this.drawSprite(img, e.x - this.scroll * CLOUD_PARALLAX, e.y, e.h, 0, 0.9);
    }
  }

  private drawPlay() {
    const ctx = this.ctx;
    for (const p of this.parts) {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }

    for (const e of this.ents) {
      if (e.kind === "cloud" || e.kind === "text") continue;
      const sx = e.x - this.scroll;
      if (sx < -120 || sx > W + 120) continue;
      if (e.kind === "crab") {
        this.drawSheet(this.assets.crab, SHEETS.crab.frames, SHEETS.crab.fps, sx, e.y, e.h);
      } else if (e.kind === "bluejay") {
        this.drawSheet(
          this.assets.bluejay,
          SHEETS.bluejay.frames,
          SHEETS.bluejay.fps,
          sx,
          e.y,
          e.h,
        );
      } else {
        const img =
          e.kind === "mine"
            ? this.assets.spikeMine
            : e.kind === "skull"
              ? this.assets.roboskull
              : e.kind === "meteor"
                ? this.assets.meteor
                : e.kind === "cat"
                  ? this.assets.balloonCat
                  : e.kind === "ufo"
                    ? this.assets.ufo
                    : e.kind === "fuel"
                      ? this.assets.fuel
                      : e.kind === "heart"
                        ? this.assets.heart
                        : this.assets.coin;
        const rot = e.kind === "meteor" ? e.rot : e.kind === "coin" ? e.phase * 3 : 0;
        this.drawSprite(img, sx, e.y, e.h, rot);
      }
    }

    const blink = this.iframes > 0 && Math.floor(this.iframes * 12) % 2 === 0;
    const flying = this.thrusting;
    const pImg = flying ? this.assets.playerFly : this.assets.player;
    const meta = flying ? SHEETS.playerFly : SHEETS.player;
    const cellW = pImg.width / meta.frames;
    const destW = (cellW / pImg.height) * this.ph;
    const px = flying ? PLAYER_X - destW * 0.22 : PLAYER_X;
    this.pw = 70;
    this.drawSheet(pImg, meta.frames, meta.fps, px, this.py, this.ph, blink ? 0.35 : 1);

    ctx.font = "700 18px ui-rounded, 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    for (const e of this.ents) {
      if (e.kind !== "text" || !e.text) continue;
      ctx.globalAlpha = Math.max(0, e.life / 1.6);
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#1a1208";
      ctx.lineWidth = 4;
      const tx = e.x - this.scroll;
      ctx.strokeText(e.text, tx, e.y);
      ctx.fillText(e.text, tx, e.y);
      ctx.globalAlpha = 1;
    }

    this.drawHud();
    if (this.hint > 0) {
      ctx.globalAlpha = Math.min(1, this.hint);
      ctx.font = "700 22px ui-rounded, 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#1a1208";
      ctx.fillText("Hold  ·  tap  ·  space   to fly", W / 2, 210);
      ctx.globalAlpha = 1;
    }
  }

  private drawHud() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(16, 14, 180, 16);
    ctx.fillStyle = "#ff3333";
    ctx.fillRect(18, 16, (176 * this.boost) / BOOST_MAX, 12);
    ctx.font = "700 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "#1a1208";
    ctx.textAlign = "left";
    ctx.fillText("BOOST", 16, 12);

    for (let i = 0; i < LIVES; i++) {
      this.heart(210 + i * 28, 22, i < this.lives);
    }

    ctx.font = "800 20px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 4;
    const label = `Score  ${this.score}`;
    ctx.strokeText(label, W - 18, 32);
    ctx.fillText(label, W - 18, 32);
  }

  private heart(x: number, y: number, on: boolean) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = on ? "#ff3355" : "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.bezierCurveTo(x, y - 2, x - 12, y - 2, x - 12, y + 6);
    ctx.bezierCurveTo(x - 12, y + 14, x, y + 18, x, y + 22);
    ctx.bezierCurveTo(x, y + 18, x + 12, y + 14, x + 12, y + 6);
    ctx.bezierCurveTo(x + 12, y - 2, x, y - 2, x, y + 6);
    ctx.fill();
    ctx.restore();
  }

  private drawMenu() {
    const ctx = this.ctx;
    const title = this.assets.title;
    const tw = 440;
    const th = (title.height / title.width) * tw;
    ctx.drawImage(title, (W - tw) / 2, 36, tw, th);

    ctx.font = "700 18px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#1a1208";
    ctx.fillText(`Best  ${this.high}`, W / 2, 330);

    const b = this.playBtn();
    const s = this.hoverPlay ? 1.04 : 1;
    const bw = b.w * s;
    const bh = b.h * s;
    ctx.drawImage(this.assets.btnPlay, b.x - (bw - b.w) / 2, b.y - (bh - b.h) / 2, bw, bh);

    ctx.font = "700 15px ui-sans-serif, system-ui, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(26,18,8,0.85)";
    ctx.fillStyle = "#fff8e8";
    ctx.strokeText("hold / tap / space  ·  P to pause", W / 2, 462);
    ctx.fillText("hold / tap / space  ·  P to pause", W / 2, 462);
  }

  private drawPause() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(20,14,8,0.45)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "800 42px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Paused", W / 2, H / 2);
    ctx.font = "600 16px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("P / Esc to resume", W / 2, H / 2 + 36);
  }

  private drawGameover() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(20,14,8,0.5)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "800 40px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("much dead", W / 2, 160);
    ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`Score  ${this.score}`, W / 2, 210);
    ctx.font = "600 16px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`Best  ${this.high}`, W / 2, 240);

    const a = this.againBtn();
    const s = this.hoverAgain ? 1.04 : 1;
    ctx.drawImage(
      this.assets.btnAgain,
      a.x - (a.w * s - a.w) / 2,
      a.y - (a.h * s - a.h) / 2,
      a.w * s,
      a.h * s,
    );

    const m = this.menuBtn();
    ctx.fillStyle = this.hoverMenu ? "#fcaf54" : "#fff";
    ctx.font = "800 18px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("MENU", m.x + m.w / 2, m.y + 30);
  }
}
