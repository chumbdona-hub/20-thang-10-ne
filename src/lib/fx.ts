// FX toàn trang: pháo hoa cánh hoa/trái tim, vệt lấp lánh theo con trỏ.
import { onFrame, isWeakDevice, prefersReducedMotion } from "./loop";
import { rand } from "./utils";

type Shape = "petal" | "heart" | "star" | "spark";
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  drag: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  shape: Shape;
};

const COLORS = ["#FF8FB1", "#FFC8DD", "#FFD9A8", "#D9C7FF", "#BDEEDC", "#FFF3D6", "#E4577F"];
let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let stopLoop: (() => void) | null = null;
let lastTrail = 0;
const weak = isWeakDevice();

function ensure() {
  if (canvas && context) return true;
  try {
    canvas = document.createElement("canvas");
    canvas.className = "fx-canvas";
    canvas.setAttribute("aria-hidden", "true");
    context = canvas.getContext("2d");
    if (!context) return false;
    document.body.appendChild(canvas);
    resize();
    window.addEventListener("resize", resize, { passive: true });
    return true;
  } catch {
    return false;
  }
}

function resize() {
  if (!canvas || !context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, weak ? 1.25 : 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function make(x: number, y: number, opts: BurstOptions, i: number): Particle {
  const angle = rand(0, Math.PI * 2);
  const speed = rand(opts.speedMin ?? 80, opts.speedMax ?? 380);
  const shapes = opts.shapes ?? ["petal", "heart", "spark", "star"];
  const colors = opts.colors ?? COLORS;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed * rand(0.5, 1),
    vy: Math.sin(angle) * speed * rand(0.5, 1) - (opts.lift ?? 60),
    g: opts.gravity ?? 190,
    drag: opts.drag ?? 0.985,
    life: 0,
    max: rand(1.1, 2.5) * (opts.lifeScale ?? 1),
    size: rand(4, opts.sizeMax ?? 13) * (opts.sizeScale ?? 1),
    rot: rand(0, Math.PI * 2),
    vr: rand(-5, 5),
    color: colors[i % colors.length] ?? "#FFC8DD",
    shape: shapes[i % shapes.length] ?? "petal",
  };
}

type BurstOptions = {
  count?: number;
  shapes?: Shape[];
  colors?: string[];
  speedMin?: number;
  speedMax?: number;
  gravity?: number;
  lift?: number;
  drag?: number;
  lifeScale?: number;
  sizeScale?: number;
  sizeMax?: number;
};

export function burst(x: number, y: number, options: BurstOptions = {}) {
  if (!ensure()) return;
  const reduce = prefersReducedMotion();
  const base = options.count ?? (reduce ? 8 : 42);
  const count = Math.min(reduce ? 14 : weak ? 40 : 90, base);
  for (let i = 0; i < count; i += 1) {
    particles.push(make(x, y, options, i));
    if (particles.length > 420) particles.shift();
  }
  if (!stopLoop) stopLoop = onFrame(draw);
}

export function petalRain(options: BurstOptions = {}) {
  const w = window.innerWidth;
  for (let i = 0; i < (options.count ?? 24); i += 1) {
    const x = rand(0, w);
    burst(x, rand(-40, window.innerHeight * 0.25), {
      ...options,
      count: 1,
      gravity: 120,
      speedMin: 20,
      speedMax: 90,
    });
  }
}

function heartPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.32);
  ctx.bezierCurveTo(-s * 0.1, s * 0.05, -s * 0.62, -s * 0.28, -s * 0.5, -s * 0.58);
  ctx.bezierCurveTo(-s * 0.4, -s * 0.85, -s * 0.06, -s * 0.82, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.06, -s * 0.82, s * 0.4, -s * 0.85, s * 0.5, -s * 0.58);
  ctx.bezierCurveTo(s * 0.62, -s * 0.28, s * 0.1, s * 0.05, 0, s * 0.32);
  ctx.closePath();
}

function draw(dt: number) {
  if (!context || !canvas) return;
  const ctx = context;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);
  const reduce = prefersReducedMotion();
  particles = particles.filter((p) => p.life < p.max);
  particles.forEach((p) => {
    p.life += dt;
    p.vx *= p.drag;
    p.vy = p.vy * p.drag + p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    const alpha = Math.max(0, Math.min(1, 1 - p.life / p.max));
    if (alpha <= 0) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = alpha * (reduce ? 0.6 : 1);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = weak ? 0 : 10;
    if (p.shape === "heart") {
      heartPath(ctx, p.size);
      ctx.fill();
    } else if (p.shape === "petal") {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === "star") {
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const a = (Math.PI / 5) * i * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? p.size * 0.6 : p.size * 0.26;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + Math.PI / 5) * r * 0.8, Math.sin(a + Math.PI / 5) * r * 0.8);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
  if (!particles.length) {
    stopLoop?.();
    stopLoop = null;
    ctx.clearRect(0, 0, w, h);
  }
}

/** Gọi một lần sau khi mở quà: vệt sáng nhỏ theo tay/chuột. */
export function enableSparkleTrail() {
  if (!ensure()) return () => undefined;
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const throttle = coarse ? 150 : 80;
  const onMove = (event: PointerEvent | TouchEvent) => {
    const now = performance.now();
    if (now - lastTrail < throttle) return;
    lastTrail = now;
    let x = 0;
    let y = 0;
    if ("touches" in event) {
      const touch = event.touches[0];
      if (!touch) return;
      x = touch.clientX;
      y = touch.clientY;
    } else {
      x = event.clientX;
      y = event.clientY;
    }
    burst(x, y, {
      count: prefersReducedMotion() ? 1 : coarse ? 2 : 3,
      speedMin: 5,
      speedMax: 32,
      gravity: -10,
      lifeScale: 0.55,
      sizeScale: 0.65,
      shapes: ["heart", "star", "spark"],
    });
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("touchmove", onMove);
  };
}
