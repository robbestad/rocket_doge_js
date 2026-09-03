import { H, W } from "./constants";

export class Input {
  thrusting = false;
  pointerX = 0;
  pointerY = 0;
  justPressed = false;
  pauseQueued = false;
  confirmQueued = false;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    canvas.addEventListener("pointermove", this.onMove);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  dispose() {
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    this.canvas.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  consumePress() {
    const v = this.justPressed;
    this.justPressed = false;
    return v;
  }

  consumePause() {
    const v = this.pauseQueued;
    this.pauseQueued = false;
    return v;
  }

  consumeConfirm() {
    const v = this.confirmQueued;
    this.confirmQueued = false;
    return v;
  }

  private map(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.pointerX = ((e.clientX - r.left) / r.width) * W;
    this.pointerY = ((e.clientY - r.top) / r.height) * H;
  }

  private onDown = (e: PointerEvent) => {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.map(e);
    this.thrusting = true;
    this.justPressed = true;
  };

  private onUp = () => {
    this.thrusting = false;
  };

  private onMove = (e: PointerEvent) => {
    this.map(e);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (!this.thrusting) this.justPressed = true;
      this.thrusting = true;
      this.confirmQueued = true;
    }
    if (e.code === "KeyP" || e.code === "Escape") {
      this.pauseQueued = true;
    }
    if (e.code === "Enter") {
      this.justPressed = true;
      this.confirmQueued = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") this.thrusting = false;
  };
}
