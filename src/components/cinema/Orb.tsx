// Quả cầu "trái tim" của cảnh phim: thân ngọc trai nhiều lớp, aura, vòng sóng nhạc,
// thiên hà xoáy, quỹ đạo + vệ tinh, tia sáng, sóng xung kích và phản ứng với lyric.
// Vẽ bằng Canvas 2D để chạy ổn trên mọi máy (không bắt buộc WebGL), có dự phòng CSS.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { audio } from "../../lib/audio";
import { onFrame, isWeakDevice } from "../../lib/loop";
import { isLite } from "../../lib/perf";
import { clamp } from "../../lib/utils";

export type OrbPhase = "intro" | "lyric" | "heart" | "finale";

export type OrbApi = {
  onCue: (index: number) => void;
  update?: () => void;
  setPhase: (phase: OrbPhase) => void;
  setPalette: (index: number) => void;
  emitText: () => void;
  absorbText: () => void;
  pointer: (x: number, y: number, type: "tap" | "hold" | "release" | "move") => void;
  dim: () => void;
  dispose: () => void;
};

type Palette = { light: string; mid: string; edge: string; rim: string; accent: string; moonA: string; moonB: string; moonC: string };

const PALETTES: Palette[] = [
  { light: "#fff6fb", mid: "#ffc3e0", edge: "#b483e6", rim: "#ffd9ef", accent: "#ffe6a8", moonA: "#ffd0e5", moonB: "#d9c4ff", moonC: "#ffefbf" },
  { light: "#fffbf2", mid: "#ffd9a8", edge: "#e78fb6", rim: "#ffe8c6", accent: "#ffb8d8", moonA: "#ffe0b6", moonB: "#ffc2df", moonC: "#e6d2ff" },
  { light: "#f4fffa", mid: "#a8ecd4", edge: "#7f9fe6", rim: "#ccfff0", accent: "#ffe6a8", moonA: "#c8f7e5", moonB: "#b8d6ff", moonC: "#ffecc4" },
  { light: "#fdf8ff", mid: "#d5bcff", edge: "#8d78cf", rim: "#eadcff", accent: "#ffd0e8", moonA: "#e0ccff", moonB: "#ffc6e2", moonC: "#fff0c2" },
  { light: "#fffaff", mid: "#ff9fc6", edge: "#a05cc0", rim: "#ffd7ea", accent: "#ffe2a0", moonA: "#ffb7d4", moonB: "#e3c4ff", moonC: "#fff0bd" },
  { light: "#fffdf4", mid: "#ffdca8", edge: "#d98fb0", rim: "#fff0d0", accent: "#ffe0a8", moonA: "#ffedc2", moonB: "#ffd4e6", moonC: "#d9d0ff" },
];

type Props = { active: boolean; phase: OrbPhase; reduced?: boolean };

type GalaxyP = {
  arm: number;
  angle: number;
  radius: number;
  z: number;
  size: number;
  color: number;
  speed: number;
};

function makeGalaxy(count: number): GalaxyP[] {
  const list: GalaxyP[] = [];
  for (let i = 0; i < count; i += 1) {
    const arm = i % 3;
    const t = i / count;
    list.push({
      arm,
      angle: t * Math.PI * 2.6 + arm * 2.1,
      radius: 0.95 + t * 1.65 + Math.random() * 0.22,
      z: (Math.random() - 0.5) * 0.5,
      size: 0.6 + Math.random() * 1.8,
      color: i % 5,
      speed: 0.5 + Math.random() * 0.8,
    });
  }
  return list;
}

const Orb = forwardRef<OrbApi, Props>(function Orb({ active, phase, reduced = false }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const engine = useRef({
    phase: phase as OrbPhase,
    palette: 0,
    current: PALETTES[0],
    next: PALETTES[0],
    mix: 1,
    bounce: 0,
    flash: 0,
    dimUntil: 0,
    holding: false,
    holdStart: 0,
    charge: 0,
    emit: -1,
    absorb: -1,
    tap: -1,
    tapX: 0,
    tapY: 0,
    px: -9999,
    py: -9999,
    pointerActive: false,
    shocks: [0, 0, 0],
    shockPower: [0, 0, 0],
    shockIndex: 0,
    finaleStart: 0,
    events: 0,
    elapsed: 0,
    fadeIn: 0,
    disposed: false,
  });

  useImperativeHandle(ref, () => ({
    onCue(index: number) {
      const s = engine.current;
      s.bounce = 1;
      s.flash = 1;
      s.dimUntil = performance.now() + 280;
      s.palette = ((index % PALETTES.length) + PALETTES.length) % PALETTES.length;
      s.current = s.next;
      s.next = PALETTES[s.palette];
      s.mix = 0;
      s.shocks[s.shockIndex % 3] = 0.001;
      s.shockPower[s.shockIndex % 3] = 1;
      s.shockIndex += 1;
    },
    setPhase(next: OrbPhase) {
      const s = engine.current;
      if (next === "finale" && s.phase !== "finale") s.finaleStart = performance.now();
      s.phase = next;
    },
    update() {
      /* engine tự chạy vòng rAF chung; API giữ để tương thích */
    },
    setPalette(index: number) {
      const s = engine.current;
      s.palette = ((index % PALETTES.length) + PALETTES.length) % PALETTES.length;
      s.current = s.next;
      s.next = PALETTES[s.palette];
      s.mix = 0;
    },
    emitText() {
      const s = engine.current;
      s.emit = 0;
      s.flash = 0.8;
      s.bounce = 0.7;
      s.shocks[s.shockIndex % 3] = 0.001;
      s.shockPower[s.shockIndex % 3] = 0.8;
      s.shockIndex += 1;
    },
    absorbText() {
      const s = engine.current;
      s.absorb = 0;
      s.flash = 0.5;
    },
    pointer(x: number, y: number, type: "tap" | "hold" | "release" | "move") {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const s = engine.current;
      s.events += 1;
      s.px = x - rect.left;
      s.py = y - rect.top;
      if (type === "move") {
        s.pointerActive = true;
        return;
      }
      if (type === "tap") {
        s.tap = 0;
        s.tapX = s.px;
        s.tapY = s.py;
        s.flash = 1;
        s.bounce = 1.2;
        s.shocks[s.shockIndex % 3] = 0.001;
        s.shockPower[s.shockIndex % 3] = 1.1;
        s.shockIndex += 1;
      } else if (type === "hold") {
        s.holding = true;
        s.holdStart = performance.now();
      } else if (type === "release") {
        if (s.holding) {
          s.holding = false;
          s.charge = 0;
          s.flash = 1.2;
          s.bounce = 1.4;
          s.shocks[s.shockIndex % 3] = 0.001;
          s.shockPower[s.shockIndex % 3] = 1.8;
          s.shockIndex += 1;
        }
      }
    },
    dim() {
      engine.current.dimUntil = performance.now() + 280;
    },
    dispose() {
      engine.current.disposed = true;
    },
  }));

  useEffect(() => {
    engine.current.phase = phase;
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setFallback(true);
      return;
    }
    const lite = isLite() || isWeakDevice() || reduced;
    setFallback(false);
    const state = engine.current;
    state.disposed = false;
    const ratio = Math.min(window.devicePixelRatio || 1, lite ? 1.15 : 1.6);
    let width = wrap.clientWidth || window.innerWidth;
    let height = wrap.clientHeight || window.innerHeight;
    let baseR = 1;
    let gal = makeGalaxy(lite ? 150 : 320);
    const galaxyCount = gal.length;
    const bars = lite ? 32 : 64;
    const barSeedCount = bars;
    const rayCount = 14;
    const barSeed = new Float32Array(bars);
    for (let i = 0; i < bars; i += 1) barSeed[i] = Math.random() * Math.PI * 2;
    let tier = lite ? 2 : 0;
    let fpsAcc = 0;
    let fpsFrames = 0;
    let lowSince = 0;

    // gradient cache (local space, tâm 0,0)
    let bodyGrad: CanvasGradient | null = null;
    let rimGrad: CanvasGradient | null = null;
    let auraInner: CanvasGradient | null = null;
    let auraMid: CanvasGradient | null = null;
    let auraOuter: CanvasGradient | null = null;
    let splash: CanvasGradient | null = null;
    let paletteKey = "";

    const buildGradients = () => {
      const p = state.current;
      const key = p.mid + p.light + Math.round(baseR);
      if (key === paletteKey) return;
      paletteKey = key;
      try {
        bodyGrad = ctx.createRadialGradient(-baseR * 0.32, -baseR * 0.38, baseR * 0.05, 0, 0, baseR * 1.04);
        bodyGrad.addColorStop(0, p.light);
        bodyGrad.addColorStop(0.2, p.mid);
        bodyGrad.addColorStop(0.52, p.mid);
        bodyGrad.addColorStop(0.8, p.rim);
        bodyGrad.addColorStop(1, p.edge);

        rimGrad = ctx.createRadialGradient(0, 0, baseR * 0.72, 0, 0, baseR * 1.12);
        rimGrad.addColorStop(0, "rgba(255,255,255,0)");
        rimGrad.addColorStop(0.7, "rgba(255,255,255,0.22)");
        rimGrad.addColorStop(1, "rgba(255,255,255,0)");

        const mkAura = (radius: number, inner: string, outer: string) => {
          const g = ctx.createRadialGradient(0, 0, baseR * 0.6, 0, 0, radius);
          g.addColorStop(0, inner);
          g.addColorStop(0.55, outer);
          g.addColorStop(1, "rgba(255,255,255,0)");
          return g;
        };
        auraInner = mkAura(baseR * 1.55, "rgba(255,236,248,0.4)", "rgba(255,168,214,0.16)");
        auraMid = mkAura(baseR * 2.2, "rgba(255,205,236,0.2)", "rgba(208,168,255,0.1)");
        auraOuter = mkAura(baseR * 3.1, "rgba(255,190,232,0.09)", "rgba(146,186,255,0.05)");

        splash = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 0.9);
        splash.addColorStop(0, "rgba(255,255,255,0.9)");
        splash.addColorStop(0.5, "rgba(255,214,238,0.32)");
        splash.addColorStop(1, "rgba(255,214,238,0)");
      } catch {
        bodyGrad = null;
      }
    };

    const resize = () => {
      width = wrap.clientWidth || window.innerWidth;
      height = wrap.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      baseR = clamp(height * 0.11, 46, 130);
      paletteKey = "";
      buildGradients();
    };
    resize();
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 180);
    };
    window.addEventListener("resize", onResize, { passive: true });

    const dotPool = Array.from({ length: 8 }, () => ({ x: 0, y: 0, size: 0, color: "#fff", depth: 0 }));
    let frontCount = 0;
    const moonColors = ["#ffffff", "#ffffff", "#ffffff"];
    const moonPool = Array.from({ length: 3 }, () => ({ x: 0, y: 0, size: 0, color: "#fff" }));
    const ringConfigs = [
      { tilt: -0.36, radius: 1.42, speed: 0.55, color: "#fff", alpha: 1 },
      { tilt: 0.52, radius: 1.72, speed: -0.4, color: "#fff", alpha: 1 },
      { tilt: 0.06, radius: 1.98, speed: 0.3, color: "#fff", alpha: 1 },
    ];
    const swirls = [
      { radius: 0.52, width: 0.28, speed: 0.26, alpha: 0.3, color: "#fff" },
      { radius: 0.72, width: 0.16, speed: -0.34, alpha: 0.22, color: "#fff" },
      { radius: 0.34, width: 0.12, speed: 0.52, alpha: 0.26, color: "#fff" },
    ];

    const spawnShock = (power: number) => {
      state.shocks[state.shockIndex % 3] = 0.001;
      state.shockPower[state.shockIndex % 3] = power;
      state.shockIndex += 1;
    };

    const draw = () => {
      const now = performance.now();
      const levels = audio.levels();
      const bass = levels.bass;
      const mid = levels.mid;
      const high = levels.high;
      const kick = levels.beat;
      const s = state;
      const phaseNow = s.phase;
      const inHeart = phaseNow === "heart" || phaseNow === "finale";
      const cx = width / 2;
      const cy = height / 2;

      // palette interpolation ~150ms
      if (s.mix < 1) {
        s.mix = Math.min(1, s.mix + 0.13);
        const a = s.current;
        const b = s.next;
        const blend = (x: string, y: string) => {
          const pa = parseInt(x.slice(1), 16);
          const pb = parseInt(y.slice(1), 16);
          const ar = (pa >> 16) & 255;
          const ag = (pa >> 8) & 255;
          const ab = pa & 255;
          const br = (pb >> 16) & 255;
          const bg = (pb >> 8) & 255;
          const bb = pb & 255;
          const r = Math.round(ar + (br - ar) * s.mix);
          const g = Math.round(ag + (bg - ag) * s.mix);
          const bl = Math.round(ab + (bb - ab) * s.mix);
          return "rgb(" + r + "," + g + "," + bl + ")";
        };
        s.current = {
          light: blend(a.light, b.light),
          mid: blend(a.mid, b.mid),
          edge: blend(a.edge, b.edge),
          rim: blend(a.rim, b.rim),
          accent: blend(a.accent, b.accent),
          moonA: a.moonA,
          moonB: a.moonB,
          moonC: a.moonC,
        };
        buildGradients();
      }

      if (kick > 0.82 && !inHeart && tier < 2) spawnShock(0.6);

      const dim = now < s.dimUntil ? 0.72 : 1;
      const brightness = (0.66 + kick * 0.16 + s.flash * 0.28) * dim;
      const charge = s.holding ? Math.min(1, (now - s.holdStart) / 350) : 0;
      s.charge += (charge - s.charge) * 0.18;
      const bounce = s.bounce;
      s.bounce *= 0.9;
      s.flash *= 0.92;
      s.fadeIn = Math.min(1, s.fadeIn + 0.035);

      let coreScale = 1 + bass * 0.07 + bounce * 0.1 + s.charge * 0.26 + Math.sin(now * 0.0016) * 0.012;
      let alpha = s.fadeIn * (inHeart ? 0.9 : 1);
      const heartFactor = inHeart ? 0.42 : 1;
      if (phaseNow === "finale") {
        const sinceFinale = s.finaleStart ? (now - s.finaleStart) / 2000 : 0;
        // 70% đầu: sáng dần đến cực đại; 30% cuối: tắt nhanh cùng cú nổ của trái tim.
        const burstLight = sinceFinale < 0.7 ? 1 + sinceFinale * 0.9 : clamp(1 - (sinceFinale - 0.7) / 0.3, 0, 1);
        coreScale *= 1.25 + sinceFinale * 0.35;
        alpha *= burstLight;
      }
      if (phaseNow === "heart") {
        coreScale *= 0.62;
      }

      ctx.clearRect(0, 0, width, height);
      if (alpha <= 0.01) return;

      // ---------- quầng sáng 3 lớp ----------
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(coreScale * (1 + bass * 0.08), coreScale * (1 + bass * 0.08));
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp(alpha * brightness * 0.9);
      if (auraOuter) {
        ctx.fillStyle = auraOuter;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 3.1, 0, Math.PI * 2);
        ctx.fill();
      }
      if (auraMid) {
        ctx.globalAlpha = clamp(alpha * brightness * 0.8);
        ctx.fillStyle = auraMid;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (auraInner) {
        ctx.globalAlpha = clamp(alpha * brightness * (0.75 + s.flash * 0.25));
        ctx.fillStyle = auraInner;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 1.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ---------- tia sáng ----------
      if (tier < 2 && !inHeart) {
        const rayAlpha = alpha * (0.1 + kick * 0.1 + s.flash * 0.08) * dim;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalCompositeOperation = "lighter";
        ctx.rotate(s.elapsed * 0.05);
        for (let i = 0; i < rayCount; i += 1) {
          const a = (i / rayCount) * Math.PI * 2;
          const len = baseR * (1.4 + (i % 4) * 0.22 + kick * 0.18);
          ctx.save();
          ctx.rotate(a);
          ctx.globalAlpha = clamp(rayAlpha * (i % 3 === 0 ? 1 : 0.55));
          ctx.fillStyle = i % 2 === 0 ? s.current.rim : s.current.accent;
          ctx.beginPath();
          ctx.moveTo(baseR * 0.9, 0);
          ctx.lineTo(len, -baseR * 0.035);
          ctx.lineTo(len, baseR * 0.035);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      // ---------- sóng xung kích ----------
      for (let i = 0; i < s.shocks.length; i += 1) {
        if (!s.shocks[i]) continue;
        s.shocks[i] += 0.022;
        if (s.shocks[i] >= 1) {
          s.shocks[i] = 0;
          continue;
        }
        const progress = s.shocks[i];
        const r = baseR * (1 + progress * 2.1);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = clamp((1 - progress) * 0.55 * (s.shockPower[i] || 1) * dim);
        ctx.strokeStyle = "#fff2fa";
        ctx.lineWidth = 1.6 + (1 - progress) * 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha *= 0.5;
        ctx.strokeStyle = s.current.rim;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.04, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // ---------- thiên hà xoáy ----------
      const galaxySpeed = 0.28 + mid * 0.75 + (s.holding ? 0.4 : 0);
      const galCx = s.px - cx;
      const galCy = s.py - cy;
      const radiusBase = baseR * coreScale;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalCompositeOperation = "lighter";
      const visibleCount = tier >= 4 ? Math.floor(galaxyCount * 0.55) : galaxyCount;
      for (let i = 0; i < visibleCount; i += 1) {
        const p = gal[i];
        const angle = p.angle + s.elapsed * galaxySpeed * p.speed * (1 / (0.6 + p.radius * 0.4));
        const orbitR = radiusBase * p.radius;
        let x = Math.cos(angle) * orbitR;
        let y = Math.sin(angle) * orbitR * 0.42 + p.z * radiusBase * 0.5;
        // lực đẩy nhẹ khi chạm gần
        if (s.pointerActive || s.tap >= 0) {
          const dx = x - galCx;
          const dy = y - galCy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < radiusBase * 1.5) {
            const push = (1 - dist / (radiusBase * 1.5)) * (s.holding ? -14 : 16);
            x += (dx / dist) * push;
            y += (dy / dist) * push;
          }
        }
        const twinkle = 0.45 + 0.55 * Math.sin(p.arm + s.elapsed * 1.6 + i);
        const colorIndex = p.color;
        ctx.fillStyle = colorIndex === 0 ? "#ffffff" : colorIndex === 1 ? s.current.light : colorIndex === 2 ? s.current.mid : colorIndex === 3 ? s.current.rim : s.current.moonB;
        ctx.globalAlpha = clamp(alpha * (0.2 + twinkle * 0.5) * dim * (inHeart ? heartFactor : 1));
        const size = p.size * (tier >= 3 ? 0.8 : 1);
        ctx.fillRect(x, y, size, size);
      }
      ctx.restore();

      // ---------- quỹ đạo + vệ tinh + mặt trăng ----------
      frontCount = 0;
      ringConfigs[0].color = s.current.rim;
      ringConfigs[1].color = s.current.accent;
      ringConfigs[2].color = s.current.moonB;
      ringConfigs.forEach((ring, ri) => {
        const rx = radiusBase * ring.radius;
        const ry = rx * 0.36;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.tilt);
        ctx.globalAlpha = clamp(alpha * (0.16 + kick * 0.14) * dim * (inHeart ? 0.55 : 1));
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        // gợn sóng theo kick: vẽ cung sáng ngắn
        if (kick > 0.4) {
          const start = s.elapsed * 1.4 + ri;
          ctx.globalAlpha = clamp(alpha * kick * 0.45 * dim * (inHeart ? 0.6 : 1));
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, start, start + 0.6);
          ctx.stroke();
        }
        const satellites = tier < 3 ? 2 : 1;
        for (let k = 0; k < satellites; k += 1) {
          const ang = s.elapsed * ring.speed * (ri % 2 === 0 ? 1 : -1) + k * Math.PI + ri;
          const sx = Math.cos(ang) * rx;
          const sy = Math.sin(ang) * ry;
          const depth = Math.sin(ang);
          const size = baseR * (ri === 0 ? 0.035 : 0.028) * (0.8 + high * 0.4);
          const wx = cx + sx * Math.cos(ring.tilt) - sy * Math.sin(ring.tilt);
          const wy = cy + sx * Math.sin(ring.tilt) + sy * Math.cos(ring.tilt);
          if (depth < 0) {
            ctx.restore();
            // vẽ phía sau thân cầu ngay tại đây bằng vòng riêng
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = clamp(alpha * 0.55 * dim);
            ctx.fillStyle = ring.color;
            ctx.beginPath();
            ctx.arc(wx, wy, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(ring.tilt);
          } else {
            if (frontCount < dotPool.length) {
              const dot = dotPool[frontCount];
              dot.x = wx;
              dot.y = wy;
              dot.size = size;
              dot.color = ring.color;
              dot.depth = depth;
              frontCount += 1;
            }
          }
        }
        ctx.restore();
      });

      // mặt trăng nhỏ (3 quả cầu nhiều màu)
      const moons = moonColors;
      moons[0] = s.current.moonA;
      moons[1] = s.current.moonB;
      moons[2] = s.current.moonC;
      let moonFrontCount = 0;
      moons.forEach((color, i) => {
        const orbit = radiusBase * (2.15 + i * 0.14);
        const ang = s.elapsed * (0.32 + i * 0.08) + i * 2.2;
        const mx = cx + Math.cos(ang) * orbit;
        const my = cy + Math.sin(ang) * orbit * 0.3;
        const size = baseR * (0.05 + (i % 2) * 0.012);
        const front = Math.sin(ang) > 0 && !inHeart;
        if (front) {
          if (moonFrontCount < moonPool.length) {
            const moon = moonPool[moonFrontCount];
            moon.x = mx;
            moon.y = my;
            moon.size = size;
            moon.color = color;
            moonFrontCount += 1;
          }
        }
        else {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = clamp(alpha * 0.5 * dim);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(mx, my, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // ---------- vòng sóng nhạc ----------
      const barsNow = tier >= 3 ? 32 : bars;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s.elapsed * 0.22);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < barsNow; i += 1) {
        const seed = barSeed[i % barSeedCount];
        const band = levels.bands ? levels.bands[Math.floor((i / barsNow) * 8)] || 0 : mid;
        const energy = tier >= 3 ? Math.min(1, band * 0.8 + kick * 0.3) : Math.min(1, band * 0.9 + kick * 0.35 + 0.12 * Math.sin(s.elapsed * 3 + seed));
        const ang = (i / barsNow) * Math.PI * 2;
        const r0 = radiusBase * 1.18;
        const len = radiusBase * (0.07 + energy * 0.34);
        const x1 = Math.cos(ang) * r0;
        const y1 = Math.sin(ang) * r0;
        const x2 = Math.cos(ang) * (r0 + len);
        const y2 = Math.sin(ang) * (r0 + len);
        ctx.globalAlpha = clamp(alpha * (0.18 + energy * 0.46) * dim);
        ctx.strokeStyle = i % 5 === 0 ? s.current.accent : i % 3 === 0 ? s.current.rim : "#ffffff";
        ctx.lineWidth = 1.4 + energy * 1.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (barsNow <= 32) {
          ctx.fillStyle = "#fff6fb";
          ctx.globalAlpha = clamp(alpha * energy * 0.6);
          ctx.fillRect(x2 - 1, y2 - 1, 2, 2);
        }
      }
      ctx.restore();

      // ---------- thân quả cầu ngọc trai ----------
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(coreScale, coreScale);
      ctx.globalAlpha = clamp(alpha);
      ctx.globalCompositeOperation = "source-over";
      if (bodyGrad) {
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, baseR, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = s.current.mid;
        ctx.beginPath();
        ctx.arc(0, 0, baseR, 0, Math.PI * 2);
        ctx.fill();
      }

      // dải màu trôi xoáy trên bề mặt (3 lớp)
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 0.985, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalCompositeOperation = "lighter";
      swirls[0].color = s.current.light;
      swirls[1].color = s.current.rim;
      swirls[2].color = s.current.accent;
      swirls.forEach((swirl, i) => {
        const start = s.elapsed * swirl.speed + i * 2.1;
        ctx.globalAlpha = clamp(alpha * swirl.alpha * (0.8 + bass * 0.5));
        ctx.strokeStyle = swirl.color;
        ctx.lineWidth = baseR * swirl.width;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * swirl.radius, start, start + Math.PI * 1.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, baseR * swirl.radius * 0.82, start + Math.PI * 1.2, start + Math.PI * 1.72);
        ctx.stroke();
      });
      // gợn bề mặt tại điểm chạm gần
      if (s.px > 0 && s.py > 0) {
        const lx = s.px - cx;
        const ly = s.py - cy;
        const distToOrb = Math.sqrt(lx * lx + ly * ly);
        if (distToOrb < baseR * 1.75) {
          const angle = Math.atan2(ly, lx);
          const strength = clamp(1 - distToOrb / (baseR * 1.75));
          ctx.globalAlpha = clamp(alpha * strength * 0.55);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, baseR * (0.86 + Math.sin(s.elapsed * 4) * 0.02), angle - 0.24, angle + 0.24);
          ctx.stroke();
          ctx.globalAlpha = clamp(alpha * strength * 0.3);
          ctx.beginPath();
          ctx.arc(0, 0, baseR * 0.7, angle - 0.16, angle + 0.16);
          ctx.stroke();
        }
      }

      // hạt sáng nhỏ trên bề mặt
      for (let i = 0; i < 10; i += 1) {
        const a = s.elapsed * (0.3 + i * 0.02) + i * 1.7;
        const rr = baseR * (0.35 + ((i * 37) % 50) / 100);
        ctx.globalAlpha = clamp(alpha * (0.25 + 0.3 * Math.sin(s.elapsed * 2 + i)) * dim);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, Math.sin(a * 0.8) * rr * 0.85, Math.max(1, baseR * 0.012), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // viền Fresnel + cao quang
      if (rimGrad) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = clamp(alpha * (0.44 + kick * 0.24));
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 1.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp(alpha * (0.12 + s.flash * 0.14));
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(-baseR * 0.34, -baseR * 0.4, baseR * 0.3, baseR * 0.19, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = clamp(alpha * (0.12 + kick * 0.08));
      ctx.beginPath();
      ctx.ellipse(-baseR * 0.18, -baseR * 0.52, baseR * 0.1, baseR * 0.055, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // ---------- điện hoa ----------
      if (tier < 1 && kick > 0.72) {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = s.current.accent;
        ctx.lineWidth = 1.2;
        for (let a = 0; a < 2; a += 1) {
          const start = s.elapsed * 1.7 + a * 2.4;
          ctx.globalAlpha = clamp(alpha * (kick - 0.7) * 1.4);
          ctx.beginPath();
          for (let i = 0; i <= 7; i += 1) {
            const angle = start + i * 0.055;
            const radius = baseR * (0.96 + (i % 2 === 0 ? 0.05 : -0.04));
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();

      // ---------- vệ tinh phía trước (che khuất đúng thứ tự) ----------
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < frontCount; i += 1) {
        const dot = dotPool[i];
        ctx.globalAlpha = clamp(alpha * 0.22 * dim);
        ctx.fillStyle = dot.color;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size * 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = clamp(alpha * 0.86);
        ctx.fillStyle = "#fffdfa";
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < moonFrontCount; i += 1) {
        const moon = moonPool[i];
        ctx.globalAlpha = clamp(alpha * 0.26 * dim);
        ctx.fillStyle = moon.color;
        ctx.beginPath();
        ctx.arc(moon.x, moon.y, moon.size * 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = clamp(alpha * 0.8);
        ctx.fillStyle = "#fffdfa";
        ctx.beginPath();
        ctx.arc(moon.x, moon.y, moon.size * 0.62, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ---------- phát chữ / hút chữ ----------
      if (s.emit >= 0 || s.absorb >= 0) {
        const outward = s.emit >= 0;
        if (outward) s.emit += 0.03;
        else s.absorb += 0.022;
        const progress = outward ? s.emit : s.absorb;
        if (progress >= 1) {
          if (outward) s.emit = -1;
          else s.absorb = -1;
        } else {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < 18; i += 1) {
            const angle = (i / 18) * Math.PI * 2 + s.elapsed * 0.4;
            const dist = outward ? baseR * (0.6 + progress * 3.4) : baseR * (3.8 * (1 - progress) + 0.4);
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist * 0.5;
            ctx.globalAlpha = clamp(alpha * (1 - progress) * 0.75);
            ctx.fillStyle = i % 3 === 0 ? s.current.accent : "#ffffff";
            const size = Math.max(0.8, baseR * 0.018);
            ctx.fillRect(px, py, size, size);
          }
          ctx.restore();
          if (!outward && progress > 0.72) s.flash = Math.max(s.flash, 0.7);
        }
      }

      // ---------- điểm chạm ----------
      if (s.tap >= 0) {
        s.tap += 0.04;
        if (s.tap >= 1) s.tap = -1;
        else {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = clamp(alpha * (1 - s.tap) * 0.8);
          ctx.strokeStyle = s.current.rim;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(s.tapX, s.tapY, baseR * 0.2 + s.tap * baseR * 1.2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          for (let i = 0; i < 7; i += 1) {
            const ang = (i / 7) * Math.PI * 2 + s.tap * 2;
            const dist = baseR * (0.2 + s.tap * 0.9);
            ctx.fillRect(s.tapX + Math.cos(ang) * dist, s.tapY + Math.sin(ang) * dist, 2, 2);
          }
          ctx.restore();
        }
      }
      s.pointerActive = false;
      if (wrap) {
        wrap.dataset.tier = String(tier);
        wrap.dataset.events = String(s.events);
        wrap.dataset.phase = phaseNow;
        const diameter = Math.round(baseR * coreScale * 2);
        wrap.dataset.orbSize = String(diameter);
      }
    };

    let acc = 0;
    const stop = onFrame((dt) => {
      if (!active || state.disposed) return;
      state.elapsed += dt;
      // đo fps: tụt < 35fps liên tục 2s thì hạ cấp dần
      fpsAcc += dt;
      fpsFrames += 1;
      if (fpsAcc >= 2) {
        const fps = fpsFrames / fpsAcc;
        if (fps < 35) {
          if (!lowSince) lowSince = 1;
          if (tier < 4) tier += 1;
        } else {
          lowSince = 0;
        }
        fpsAcc = 0;
        fpsFrames = 0;
      }
      acc += dt;
      const minStep = lite || tier >= 3 ? 1 / 30 : 1 / 60;
      if (acc < minStep) return;
      acc = 0;
      try {
        draw();
      } catch {
        state.phase = "finale";
      }
    });

    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      try {
        ctx.clearRect(0, 0, width, height);
        canvas.width = 0;
        canvas.height = 0;
      } catch {
        /* bỏ qua */
      }
      bodyGrad = null;
      rimGrad = null;
      auraInner = null;
      auraMid = null;
      auraOuter = null;
      splash = null;
      gal = [];
      state.disposed = true;
    };
  }, [active, reduced]);

  return (
    <div className="cinema-orb" ref={wrapRef} aria-hidden="true">
      <canvas className="cinema-orb__canvas" ref={canvasRef} />
      {fallback && (
        <div className={`cinema-orb__fallback${phase === "heart" ? " is-heart" : ""}`}>
          <span className="cinema-orb__fallback-aura" />
          <span className="cinema-orb__fallback-ring" />
          <span className="cinema-orb__fallback-pearl" />
          <span className="cinema-orb__fallback-ring cinema-orb__fallback-ring--two" />
        </div>
      )}
    </div>
  );
});

export default Orb;
export { PALETTES as ORB_PALETTES };
