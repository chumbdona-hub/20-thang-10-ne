// Section 1.5 — "vũ trụ 20/10": tinh cầu ngọc trai + vòng chữ, lyric SRT, trái tim hạt tương tác.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { SRT_TEXT } from "../data/lyrics";
import { audio } from "../lib/audio";
import { onFrame, prefersReducedMotion } from "../lib/loop";
import { isLite } from "../lib/perf";
import { mergeCuesForDisplay, parseSRT, type Cue } from "../lib/srt";
import { clamp, easeOutCubic } from "../lib/utils";

type Props = { onClose: () => void };
type Phase = "rotate" | "gate" | "play";

const ENTER_VARIANTS = ["slam", "scatter", "flip", "mask", "track", "glitch", "zoom", "wave", "word", "elastic", "split", "haze"];
const EXIT_VARIANTS = ["burst", "up", "fall", "dust", "whip", "shatter"];
const CHARS = ["scatter", "flip", "wave", "elastic", "split"];
const RING_TEXT = "CHÚC MỪNG 20/10 ✦ 11B7 ✦ ";
const GATE_MS = 10000;

const ACCENTS: string[][] = [
  ["sau này"],
  ["nghẹn ngào"],
  ["mối tình đầu"],
  ["ngọt"],
  ["từng viết"],
  ["mặt trời"],
  ["đốt cháy"],
  ["thanh xuân"],
  ["phải đi"],
  ["một khi khác"],
  ["trong tim"],
  ["đừng quên"],
  ["lần đầu tiên"],
  ["yêu thương"],
];

const normWord = (value: string) => value.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");

function accentWords(text: string, cueIndex: number): Set<number> {
  const words = text.split(/\s+/);
  const flat = words.map(normWord);
  const phrases = ACCENTS[cueIndex] ?? [];
  for (const phrase of phrases) {
    const target = phrase.split(/\s+/).map(normWord).filter(Boolean);
    if (!target.length) continue;
    for (let start = 0; start + target.length <= flat.length; start += 1) {
      if (target.every((part, offset) => flat[start + offset] === part)) {
        return new Set(target.map((_, offset) => start + offset));
      }
    }
  }
  return new Set([0]);
}

function CueContent({ text, variant, cueIndex, exiting = false }: { text: string; variant: number; cueIndex: number; exiting?: boolean }) {
  const words = text.split(/\s+/).filter(Boolean);
  const keys = accentWords(text, cueIndex);
  const perChar = !exiting && CHARS.includes(ENTER_VARIANTS[variant % ENTER_VARIANTS.length]);
  const sizeClass = text.length > 36 ? " is-xlong" : text.length > 24 ? " is-long" : "";
  return (
    <p className={"cue-text" + sizeClass}>
      {words.map((word, wi) => (
        <Fragment key={`${wi}-${word}`}>
          <span className={"cue-word" + (keys.has(wi) ? " is-key" : "")} style={{ ["--wi" as string]: wi }}>
            {perChar ? (
              Array.from(word).map((char, ci) => (
                <span className="cue-char" key={ci} style={{ ["--ci" as string]: wi * 4 + ci }}>{char}</span>
              ))
            ) : (
              <span className="cue-piece">{word}</span>
            )}
          </span>
          {wi < words.length - 1 ? (wi === words.length - 2 ? "\u00A0" : " ") : ""}
        </Fragment>
      ))}
    </p>
  );
}

type ViewState = {
  tx: number;
  ty: number;
  rx: number;
  ry: number;
  zoom: number;
  dragging: boolean;
  lx: number;
  ly: number;
  pinch: boolean;
  pinchDist: number;
  pinchZoom: number;
  lastMove: number;
  vx: number;
};

type Interact = {
  attract: boolean;
  ax: number;
  ay: number;
  taps: Array<{ x: number; y: number; at: number }>;
  heartHit: number;
};

type HeartP = {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  phase: number;
  sx: number;
  sy: number;
  layer: number;
};

type UniverseProps = {
  timeRef: React.MutableRefObject<number>;
  lyricEnd: number;
  heartStart: number;
  heartDuration: number;
  active: boolean;
  viewRef: React.MutableRefObject<ViewState>;
  interactRef: React.MutableRefObject<Interact>;
  onDone: () => void;
};

function UniverseCanvas({ timeRef, lyricEnd, heartStart, heartDuration, active, viewRef, interactRef, onDone }: UniverseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  const data = useMemo(() => {
    const lite = isLite();
    const mobile = typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || Math.min(window.innerWidth, window.innerHeight) < 700);
    const heartCount = lite ? 980 : mobile ? 1350 : 1900;
    const glowCount = lite ? 130 : mobile ? 190 : 260;
    const palette = ["#FFFFFF", "#FFE7F2", "#FFB9D6", "#FF7FAE", "#DDB6FF"];

    const outline: HeartP[] = [];
    const glow: HeartP[] = [];
    const addHeart = (count: number, layer: number) => {
      for (let i = 0; i < count; i += 1) {
        const t = (i / count) * Math.PI * 2;
        const hx = 16 * Math.sin(t) ** 3;
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const thickness = layer === 0 ? (Math.random() - 0.5) * 1.4 : (Math.random() - 0.5) * 3.2;
        const scale = 1 + thickness / 14;
        const nx = hx * scale;
        const ny = hy * scale;
        const edge = Math.min(1, Math.hypot(nx / 16, ny / 14));
        (layer === 0 ? outline : glow).push({
          x: nx,
          y: ny,
          z: (Math.random() - 0.5) * (layer === 0 ? 3.4 : 6),
          size: layer === 0 ? 0.85 + Math.random() * 1.7 : 2.0 + Math.random() * 3.4,
          color: palette[clamp(Math.floor(edge * palette.length), 0, palette.length - 1)],
          phase: Math.random() * Math.PI * 2,
          sx: (Math.random() - 0.5) * 1.4,
          sy: (Math.random() - 0.5) * 0.5,
          layer,
        });
      }
    };
    addHeart(heartCount, 0);
    addHeart(glowCount, 1);

    const orbit = Array.from({ length: lite ? 3 : 4 }, (_, ring) => {
      const dots = lite ? 40 : 58;
      return Array.from({ length: dots }, (_, i) => ({
        angle: (i / dots) * Math.PI * 2,
        ring,
        tilt: ring * 0.55 + 0.35,
        speed: (ring % 2 === 0 ? 1 : -1) * (0.2 + ring * 0.05),
        size: 0.6 + (i % 4) * 0.3,
        color: ["#FFD6E8", "#FFE8B4", "#E0C6FF", "#FFB3D1"][ring % 4],
      }));
    });

    const spiralCount = lite ? 42 : 76;
    const spiral = Array.from({ length: spiralCount }, (_, i) => ({
      offset: i / spiralCount,
      angle: (i / spiralCount) * Math.PI * 5,
      speed: 0.16 + (i % 5) * 0.01,
    }));

    const dustCount = lite ? 34 : 64;
    const dust = Array.from({ length: dustCount }, () => ({
      x: (Math.random() - 0.5) * 1.1,
      y: 0.18 + Math.random() * 0.1,
      vy: 0.04 + Math.random() * 0.1,
      drift: (Math.random() - 0.5) * 0.06,
      size: 0.5 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
    }));

    const stars = Array.from({ length: lite ? 90 : mobile ? 150 : 240 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      size: 0.3 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      color: ["#FFFFFF", "#FFEAF5", "#DCE9FF", "#FFF3D0"][Math.floor(Math.random() * 4)],
    }));

    const hearts = Array.from({ length: 34 }, () => ({
      x: (Math.random() - 0.5) * 1.2,
      y: 0.2 + Math.random() * 0.8,
      speed: 0.02 + Math.random() * 0.05,
      size: 2 + Math.random() * 4,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.2 + Math.random() * 0.5,
    }));

    // Hạt tương tác quanh tay: hút khi giữ, đẩy khi chạm.
    const interactive = Array.from({ length: lite ? 40 : 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: 0,
      vy: 0,
      size: 0.6 + Math.random() * 1.3,
    }));

    return { outline, glow, orbit, spiral, dust, stars, hearts, interactive, lite, mobile, palette };
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = wrap.clientWidth || window.innerWidth;
    let height = wrap.clientHeight || window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, data.lite ? 1.15 : data.mobile ? 1.35 : 1.75);
    let baseGradient: CanvasGradient | null = null;
    let coreGlow: CanvasGradient | null = null;
    const resize = () => {
      width = wrap.clientWidth || window.innerWidth;
      height = wrap.clientHeight || window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      baseGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width, height) * 0.6);
      baseGradient.addColorStop(0, "rgba(255, 214, 236, 0.18)");
      baseGradient.addColorStop(0.55, "rgba(168, 120, 220, 0.05)");
      baseGradient.addColorStop(1, "rgba(30, 10, 50, 0)");
      coreGlow = ctx.createRadialGradient(width / 2, height * 0.5, 0, width / 2, height * 0.5, Math.min(width, height) * 0.3);
      coreGlow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      coreGlow.addColorStop(0.16, "rgba(255, 220, 238, 0.75)");
      coreGlow.addColorStop(0.42, "rgba(255, 160, 205, 0.28)");
      coreGlow.addColorStop(1, "rgba(255, 150, 205, 0)");
    };
    resize();
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 180);
    };
    window.addEventListener("resize", onResize, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(wrap);

    const reduce = prefersReducedMotion();
    const heartPath = (cx: number, cy: number, s: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.32);
      ctx.bezierCurveTo(cx - s * 0.14, cy + s * 0.02, cx - s * 0.62, cy - s * 0.26, cx - s * 0.5, cy - s * 0.58);
      ctx.bezierCurveTo(cx - s * 0.38, cy - s * 0.88, cx - s * 0.06, cy - s * 0.8, cx, cy - s * 0.46);
      ctx.bezierCurveTo(cx + s * 0.06, cy - s * 0.8, cx + s * 0.38, cy - s * 0.88, cx + s * 0.5, cy - s * 0.58);
      ctx.bezierCurveTo(cx + s * 0.62, cy - s * 0.26, cx + s * 0.14, cy + s * 0.02, cx, cy + s * 0.32);
      ctx.closePath();
    };

    const draw = () => {
      const now = timeRef.current;
      const beatLength = 60 / CONFIG.song.bpm;
      const beatPos = (((now - CONFIG.song.beatOffset) % beatLength) + beatLength) % beatLength;
      const kick = Math.exp(-beatPos * 7);
      const heartAge = now - heartStart;
      const inHeart = heartAge > -0.05;
      const lastTwo = clamp((heartAge - (heartDuration - 2)) / 2);
      const explode = clamp((heartAge - (heartDuration - 0.35)) / 0.45);
      const userRot = viewRef.current.ry * (Math.PI / 180);

      ctx.clearRect(0, 0, width, height);

      if (!data.lite && baseGradient) {
        ctx.fillStyle = baseGradient;
        ctx.fillRect(0, 0, width, height);
      }

      // ---- sao nền
      data.stars.forEach((star) => {
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * (1.1 + star.z) + star.phase));
        ctx.globalAlpha = twinkle * (0.45 + star.z * 0.5);
        ctx.fillStyle = star.color;
        const sx = star.x * width;
        const sy = ((star.y + now * 0.002 * (0.4 + star.z)) % 1) * height;
        const size = star.size * (0.6 + star.z);
        if (data.lite) ctx.fillRect(sx, sy, size, size);
        else {
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // sao băng thỉnh thoảng
      const shoot = Math.floor(now / 7);
      const shootPos = (now % 7) / 7;
      if (shootPos > 0.82) {
        const p = (shootPos - 0.82) / 0.18;
        const sx = width * (0.18 + (shoot % 3) * 0.22) + p * width * 0.45;
        const sy = height * 0.14 + p * height * 0.34;
        const gradient = ctx.createLinearGradient(sx, sy, sx - 90, sy - 42);
        gradient.addColorStop(0, "rgba(255,255,255,0.9)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 90, sy - 42);
        ctx.stroke();
      }

      const centerX = width / 2;
      const centerY = height * 0.5;

      // ---- tương tác hạt quanh tay
      const interact = interactRef.current;
      data.interactive.forEach((p, index) => {
        const px = p.x * width;
        const py = p.y * height;
        if (interact.attract) {
          const dx = interact.ax - px;
          const dy = interact.ay - py;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 260) {
            p.vx += (dx / dist) * 0.22;
            p.vy += (dy / dist) * 0.22;
          }
        }
        interact.taps.forEach((tap) => {
          const age = (performance.now() - tap.at) / 1000;
          if (age > 1.2) return;
          const dx = px - tap.x;
          const dy = py - tap.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 120) {
            const force = (1 - age / 1.2) * (120 - dist) * 0.0016;
            p.vx += (dx / dist) * force * 60;
            p.vy += (dy / dist) * force * 60;
          }
        });
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -0.02) p.x = -0.02;
        if (p.x > 1.02) p.x = 1.02;
        if (p.y < -0.02) p.y = -0.02;
        if (p.y > 1.02) p.y = 1.02;
        ctx.globalAlpha = 0.18 + (index % 5) * 0.05;
        ctx.fillStyle = data.palette[index % data.palette.length];
        const s = p.size;
        ctx.fillRect(p.x * width, p.y * height, s, s);
      });
      interactRef.current.taps = interactRef.current.taps.filter((tap) => performance.now() - tap.at < 1300);
      ctx.globalAlpha = 1;

      // ---- trái tim nhỏ hồng bay lên rải rác (cả lúc lyric)
      {
        data.hearts.forEach((h) => {
          const y = (h.y - (heartAge * h.speed) % 1.4) * height;
          const x = width * (0.5 + h.x * 0.5) + Math.sin(now * 0.7 + h.sway) * 16;
          ctx.globalAlpha = h.alpha * (0.5 + 0.5 * Math.sin(now + h.sway));
          ctx.fillStyle = "#FFB4D3";
          const size = h.size;
          heartPath(x, y, size);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      if (!inHeart) return;

      const age = Math.max(0, heartAge);
      const baseScale = Math.min(width / 34, height / (data.lite ? 31 : 29));
      const tapBoost = clamp(1 - (performance.now() - interactRef.current.heartHit) / 600);
      const pulse = 1 + kick * 0.1 * (1 - lastTwo * 0.35) + tapBoost * 0.14 + Math.sin(age * 1.8) * 0.012;
      const scale = baseScale * pulse * (1 - lastTwo * 0.4 + explode * 2.2);
      const rotationY = age * 0.28 + userRot;
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);

      if (!reduce) ctx.globalCompositeOperation = "lighter";

      if (!data.lite) {
        const glow = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, Math.min(width, height) * 0.5);
        glow.addColorStop(0, "rgba(255, 130, 178, 0.24)");
        glow.addColorStop(0.6, "rgba(210, 120, 210, 0.09)");
        glow.addColorStop(1, "rgba(140, 90, 200, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      // dải sáng đứng xuyên tâm
      const streak = ctx.createLinearGradient(centerX, centerY - baseScale * 3.2, centerX, centerY + baseScale * 2.6);
      streak.addColorStop(0, "rgba(255,255,255,0)");
      streak.addColorStop(0.4, "rgba(255, 236, 247, 0.22)");
      streak.addColorStop(0.5, "rgba(255, 255, 255, 0.42)");
      streak.addColorStop(0.62, "rgba(255, 208, 234, 0.18)");
      streak.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = streak;
      ctx.fillRect(centerX - baseScale * 0.045, centerY - baseScale * 3.2, baseScale * 0.09, baseScale * 5.8);

      // lớp glow phía sau (hạt lớn, mờ)
      data.glow.forEach((p) => {
        const form = clamp((age - 0.1) / 1.2);
        const x = p.x * scale;
        const z = p.z * scale * 0.12;
        const rx = x * cosY - z * sinY;
        const alpha = form * (0.11 + kick * 0.09) * (0.6 + 0.4 * Math.sin(p.phase + age * 1.2));
        ctx.globalAlpha = clamp(alpha);
        ctx.fillStyle = p.color;
        const s = p.size * (data.lite ? 1.4 : 2.1);
        ctx.fillRect(centerX + rx, centerY - p.y * scale, s, s);
      });

      // bề mặt trái tim, hạt nhỏ li ti
      data.outline.forEach((p, index) => {
        const form = clamp((age - 0.04 - (index % 30) * 0.008) / 0.85);
        const edgeBurst = 1 + lastTwo * 0.12 * Math.sin(p.phase + age * 2);
        const x0 = p.x * scale * edgeBurst;
        const y0 = -p.y * scale * edgeBurst;
        const z0 = p.z * scale * (1.2 + explode * 2.2);
        const rx = x0 * cosY - z0 * sinY;
        const rz = x0 * sinY + z0 * cosY;
        const perspective = 1 + rz / (scale * 30);
        // Bụi tan từ giữa khi bắt đầu, rồi hút về đúng nét.
        const sx = centerX + p.sx * width * (1 - form);
        const sy = centerY + p.sy * height * (1 - form);
        let x = sx + (centerX + rx * perspective - sx) * easeOutCubic(form);
        let y = sy + (centerY + y0 * perspective - sy) * easeOutCubic(form);
        let alpha = easeOutCubic(form) * (0.72 + 0.28 * (0.5 + 0.5 * Math.sin(p.phase + age * 1.6)));
        if (explode > 0) {
          const angle = p.phase * 3 + age * 1.2;
          x += Math.cos(angle) * explode * width * 0.72;
          y += Math.sin(angle) * explode * height * 0.72;
          alpha *= 1 - explode;
        }
        ctx.globalAlpha = clamp(alpha);
        ctx.fillStyle = p.color;
        const s = p.size * (0.9 + form * 0.4) * (data.lite ? 0.9 : 1.15);
        ctx.fillRect(x, y, s, s);
      });

      // vòng quỹ đạo
      data.orbit.forEach((ring) => {
        ring.forEach((dot) => {
          const angle = dot.angle + age * dot.speed * (1 + lastTwo * 3.6);
          const radiusX = baseScale * (1.62 + dot.ring * 0.13) * (1 + kick * 0.035 + lastTwo * 0.22);
          const radiusY = radiusX * (0.3 + dot.ring * 0.055);
          const px = Math.cos(angle) * radiusX;
          const py = Math.sin(angle) * radiusY;
          const tilt = dot.tilt;
          const x = centerX + px * Math.cos(tilt) - py * Math.sin(tilt);
          const y = centerY + px * Math.sin(tilt) + py * Math.cos(tilt);
          ctx.globalAlpha = (0.32 + kick * 0.4) * (1 - lastTwo * 0.2);
          ctx.fillStyle = dot.color;
          ctx.fillRect(x, y, dot.size, dot.size);
        });
      });

      // dòng xoắn ốc
      data.spiral.forEach((dot) => {
        const progress = (age * dot.speed + dot.offset) % 1;
        const radius = (1.7 - progress * 1.5) * baseScale * 1.5;
        const angle = dot.angle + age * (0.55 + lastTwo * 2.6);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.72;
        ctx.globalAlpha = (1 - progress) * 0.55 + 0.08;
        ctx.fillStyle = progress > 0.72 ? "#FFF1C6" : "#FFC2DD";
        const s = (data.lite ? 1 : 1.4) + (1 - progress) * 1.2;
        ctx.fillRect(x, y, s, s);
      });

      // bụi trời rơi từ đáy tim
      data.dust.forEach((d) => {
        const fall = ((age * d.vy + d.y) % 1);
        const x = centerX + d.x * baseScale * 2.2 + Math.sin(age * 0.8 + d.phase) * 8 + d.drift * width * fall;
        const y = centerY + baseScale * 1.05 + fall * height * 0.32;
        ctx.globalAlpha = (1 - fall) * 0.55;
        ctx.fillStyle = "#FFE7F2";
        ctx.fillRect(x, y, d.size, d.size);
      });

      // quả cầu sáng ở tâm
      if (coreGlow && !data.lite) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = coreGlow;
        ctx.fillRect(centerX - baseScale * 2, centerY - baseScale * 2, baseScale * 4, baseScale * 4);
      }
      const coreRadius = baseScale * (0.16 + kick * 0.025);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "#FFF7FC";
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // nhịp: vài trái tim nhỏ bắn ra
      if (kick > 0.7 && !data.lite) {
        ctx.globalAlpha = (kick - 0.7) * 1.6;
        ctx.fillStyle = "#FFD6E8";
        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2 + age;
          heartPath(centerX + Math.cos(angle) * baseScale * 2.1, centerY + Math.sin(angle) * baseScale * 1.2, 7);
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      if (heartAge > heartDuration + 0.1 && !doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    };

    let acc = 0;
    const stop = onFrame((dt) => {
      if (!active) return;
      acc += dt;
      const minStep = reduce ? 1 / 20 : data.lite ? 1 / 26 : data.mobile ? 1 / 30 : 1 / 60;
      if (acc < minStep) return;
      acc = 0;
      draw();
    });
    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      observer?.disconnect();
      ctx.clearRect(0, 0, width, height);
    };
  }, [data, heartDuration, heartStart, active, interactRef, lyricEnd, onDone, timeRef, viewRef]);

  return (
    <div className="cinema-canvas-wrap" ref={wrapRef} aria-hidden="true">
      <canvas className="cinema-canvas" ref={canvasRef} />
    </div>
  );
}

export default function Cinema({ onClose }: Props) {
  const rawCues = useMemo(() => parseSRT(SRT_TEXT), []);
  const cues = useMemo(() => mergeCuesForDisplay(rawCues), [rawCues]);
  const lyricEnd = rawCues.length ? rawCues[rawCues.length - 1].end : 46.033;
  const heartStart = lyricEnd;
  const heartDuration = CONFIG.song.heartDuration;
  const total = Math.max(CONFIG.song.duration, heartStart + heartDuration);

  const initialLandscape =
    typeof window !== "undefined" ? window.matchMedia("(orientation: landscape)").matches || window.innerWidth > window.innerHeight : true;

  const [landscape, setLandscape] = useState(initialLandscape);
  const [forced, setForced] = useState(false);
  const [phase, setPhase] = useState<Phase>(() => (initialLandscape ? "gate" : "rotate"));
  const [current, setCurrent] = useState<{ cue: Cue; index: number } | null>(null);
  const [prev, setPrev] = useState<{ cue: Cue; variant: number; index: number } | null>(null);
  const [heartVisible, setHeartVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [opening, setOpening] = useState(false);
  const [gateHint, setGateHint] = useState("Chạm vào tinh cầu");
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; heart: boolean }>>([]);

  const timeRef = useRef(0);
  const runningRef = useRef(false);
  const lastRef = useRef(0);
  const finishedRef = useRef(false);
  const startedRef = useRef(false);
  const cueIndexRef = useRef(-1);
  const prevTimer = useRef(0);
  const progressRef = useRef<HTMLSpanElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const autoTimer = useRef(0);
  const hintTimer = useRef(0);
  const ready = landscape || forced;

  const viewRef = useRef<ViewState>({
    rx: 0, ry: 0, tx: 0, ty: 0, zoom: 1, dragging: false, lx: 0, ly: 0, pinch: false, pinchDist: 0, pinchZoom: 1, lastMove: 0, vx: 0,
  });
  const interactRef = useRef<Interact>({ attract: false, ax: 0, ay: 0, taps: [], heartHit: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const longPress = useRef(0);
  const tapStart = useRef({ x: 0, y: 0, at: 0, moved: 0 });

  useEffect(() => {
    // Cổng tinh cầu không phát nhạc; chỉ khi chạm mới bắt đầu.
    if (phase !== "play") audio.setBed(0);
  }, [phase]);

  const cleanupEnvironment = useCallback(() => {
    document.body.classList.remove("no-scroll", "cinema-lock");
    try {
      audio.stopSong(0.8);
      audio.setMood("letter");
    } catch {
      /* im lặng */
    }
    try {
      if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen();
    } catch {
      /* không hỗ trợ */
    }
    try {
      const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
      orientation?.unlock?.();
    } catch {
      /* không hỗ trợ */
    }
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    runningRef.current = false;
    setClosing(true);
    audio.stopSong(0.9);
    audio.setBed(0.5);
    audio.setMood("letter");
    audio.sfx("sparkle");
    window.setTimeout(() => {
      cleanupEnvironment();
      onClose();
    }, 620);
  }, [cleanupEnvironment, onClose]);

  // Vào cảnh phim: cử chỉ chạm ở đây mở khoá âm thanh iPhone và bắt đầu song.mp3.
  const start = useCallback(() => {
    if (finishedRef.current || startedRef.current) return;
    startedRef.current = true;
    window.clearTimeout(autoTimer.current);
    try {
      audio.init();
      audio.resume();
      if (!audio.isStarted) audio.init();
      audio.setMood("cinema");
      audio.setBed(0.12);
      audio.startSong();
    } catch {
      /* không có audio vẫn chạy cảnh */
    }
    timeRef.current = 0;
    lastRef.current = performance.now();
    runningRef.current = true;
    setOpening(true);
    setPhase("play");
    window.setTimeout(() => setOpening(false), 1100);
    audio.sfx("whoosh");
    audio.sfx("sparkle");
    try {
      const orientation = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      if (orientation && typeof orientation.requestPermission === "function") {
        void orientation.requestPermission().catch(() => undefined);
      }
    } catch {
      /* không hỗ trợ */
    }
  }, []);

  // Tự bắt đầu sau 10 giây, nhưng KHÔNG mở khoá audio nếu không có cử chỉ.
  useEffect(() => {
    if (phase !== "gate" || !ready || closing) return;
    setGateHint("Chạm vào tinh cầu");
    hintTimer.current = window.setTimeout(() => setGateHint("Sắp tự bắt đầu…"), GATE_MS - 2500);
    autoTimer.current = window.setTimeout(() => {
      if (phase === "gate") {
        setGateHint("Đang bắt đầu…");
        start();
      }
    }, GATE_MS);
    return () => {
      window.clearTimeout(autoTimer.current);
      window.clearTimeout(hintTimer.current);
    };
  }, [closing, phase, ready, start]);

  // Đồng hồ: ưu tiên audio.currentTime; thiếu file thì chạy theo thời gian thực.
  useEffect(() => {
    const stop = onFrame(() => {
      if (phase !== "play" || !runningRef.current || document.hidden) return;
      const songTime = audio.hasSong ? audio.songTime() : null;
      if (songTime !== null && songTime >= 0 && songTime < 600) timeRef.current = songTime;
      else {
        const wall = performance.now();
        const delta = lastRef.current ? (wall - lastRef.current) / 1000 : 0;
        timeRef.current = Math.min(total + 2, timeRef.current + clamp(delta, 0, 0.8));
      }
      lastRef.current = performance.now();
      const t = timeRef.current;
      if (t >= total) {
        runningRef.current = false;
        finish();
        return;
      }

      if (t < lyricEnd) {
        let nextIndex = -1;
        for (let i = 0; i < cues.length; i += 1) {
          if (t >= cues[i].start && t < cues[i].end) {
            nextIndex = i;
            break;
          }
        }
        if (nextIndex !== cueIndexRef.current) {
          const previous = cueIndexRef.current;
          cueIndexRef.current = nextIndex;
          if (previous >= 0) {
            setPrev({ cue: cues[previous], variant: previous % EXIT_VARIANTS.length, index: previous });
            window.clearTimeout(prevTimer.current);
            prevTimer.current = window.setTimeout(() => setPrev(null), 300);
          }
          setCurrent(nextIndex >= 0 ? { cue: cues[nextIndex], index: nextIndex } : null);
        }
      } else if (!heartVisible) {
        setHeartVisible(true);
        setCurrent(null);
        setPrev(null);
        audio.sfx("heartbeat");
        audio.sfx("sparkle");
      }
      if (progressRef.current) {
        progressRef.current.style.transform = "scaleX(" + clamp(t / total).toFixed(4) + ")";
      }
    });
    return stop;
  }, [cues, finish, heartVisible, lyricEnd, phase, total]);

  // Camera: kéo để xoay, tự trả về khi lyric; tim xoay tự do/chậm dần.
  useEffect(() => {
    const stop = onFrame((dt) => {
      const view = viewRef.current;
      const heart = heartVisible;
      const idle = performance.now() - view.lastMove;
      if (!view.dragging) {
        if (heart) {
          if (idle > 2000) view.ry += dt * 7;
        } else {
          view.rx += (0 - view.rx) * Math.min(1, dt * 3.4);
          view.ry += (0 - view.ry) * Math.min(1, dt * 3.4);
        }
        view.zoom += (1 - view.zoom) * Math.min(1, dt * 3);
      }
      const camera = cameraRef.current;
      if (camera) {
        camera.style.transform =
          "perspective(900px) rotateX(" + (view.rx + view.tx).toFixed(2) + "deg) rotateY(" + (view.ry + view.ty).toFixed(2) + "deg) scale(" +
          (view.zoom * 1.06).toFixed(3) + ")";
      }
    });
    return stop;
  }, [heartVisible]);

  const vibrate = (pattern: number | number[]) => {
    try {
      if ("vibrate" in navigator) navigator.vibrate(pattern);
    } catch {
      /* bỏ qua */
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "play") return;
    if (event.target instanceof Element && event.target.closest("button, [role='button'], a")) return;
    const view = viewRef.current;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      view.pinch = true;
      view.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      view.pinchZoom = view.zoom;
      return;
    }
    tapStart.current = { x: event.clientX, y: event.clientY, at: performance.now(), moved: 0 };
    view.dragging = true;
    view.lx = event.clientX;
    view.ly = event.clientY;
    interactRef.current.ax = event.clientX;
    interactRef.current.ay = event.clientY;
    window.clearTimeout(longPress.current);
    longPress.current = window.setTimeout(() => {
      interactRef.current.attract = true;
      interactRef.current.ax = event.clientX;
      interactRef.current.ay = event.clientY;
      audio.sfx("sparkle");
    }, 350);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const view = viewRef.current;
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (view.pinch && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      view.zoom = clamp(view.pinchZoom * (dist / (view.pinchDist || dist)), 0.8, 1.4);
      return;
    }
    if (!view.dragging) return;
    const dx = event.clientX - view.lx;
    const dy = event.clientY - view.ly;
    view.lx = event.clientX;
    view.ly = event.clientY;
    view.lastMove = performance.now();
    view.vx = dx;
    tapStart.current.moved += Math.abs(dx) + Math.abs(dy);
    const limitY = heartVisible ? 45 : 20;
    const limitX = heartVisible ? 180 : 35;
    view.ry = clamp(view.ry + dx * 0.25, -limitX, limitX);
    view.rx = clamp(view.rx - dy * 0.18, -limitY, limitY);
    if (interactRef.current.attract) {
      interactRef.current.ax = event.clientX;
      interactRef.current.ay = event.clientY;
    }
  };

  const addRipple = (clientX: number, clientY: number) => {
    const id = Date.now() + Math.random();
    const rect = stageRef.current?.getBoundingClientRect();
    const x = rect ? clientX - rect.left : clientX;
    const y = rect ? clientY - rect.top : clientY;
    setRipples((list) => [...list.slice(-2), { id, x, y, heart: heartVisible }]);
    window.setTimeout(() => setRipples((list) => list.filter((item) => item.id !== id)), 950);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const view = viewRef.current;
    window.clearTimeout(longPress.current);
    interactRef.current.attract = false;
    pointers.current.delete(event.pointerId);
    tapStart.current.moved += Math.abs(event.clientX - tapStart.current.x) > 6 ? 1 : 0;
    if (pointers.current.size < 2) view.pinch = false;
    view.dragging = pointers.current.size > 0;
    const isTap = performance.now() - tapStart.current.at < 340 && tapStart.current.moved < 8;
    if (isTap && phase === "play") {
      const x = event.clientX;
      const y = event.clientY;
      addRipple(x, y);
      interactRef.current.taps.push({ x, y, at: performance.now() });
      audio.sfx("pop");
      vibrate(12);
      if (heartVisible) {
        const rect = stageRef.current?.getBoundingClientRect();
        if (rect) {
          const midX = rect.left + rect.width / 2;
          const midY = rect.top + rect.height / 2;
          if (Math.hypot(x - midX, y - midY) < Math.min(rect.width, rect.height) * 0.35) interactRef.current.heartHit = performance.now();
        }
        audio.sfx("heartbeat");
      }
    }
    view.lastMove = performance.now();
  };

  // Nghiêng máy: parallax rất nhẹ, chỉ khi có quyền (iOS cần xin quyền trong cử chỉ).
  useEffect(() => {
    if (phase !== "play") return;
    const onTilt = (event: DeviceOrientationEvent) => {
      const view = viewRef.current;
      if (view.dragging) return;
      const gamma = typeof event.gamma === "number" ? event.gamma : 0;
      const beta = typeof event.beta === "number" ? event.beta : 0;
      view.ty = clamp(gamma * 0.35, -6, 6);
      view.tx = clamp((beta - 45) * -0.16, -4, 4);
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, [phase]);

  useEffect(() => {
    const onOrientation = () => {
      setLandscape(window.matchMedia("(orientation: landscape)").matches || window.innerWidth > window.innerHeight);
    };
    window.addEventListener("resize", onOrientation, { passive: true });
    window.addEventListener("orientationchange", onOrientation, { passive: true });
    return () => {
      window.removeEventListener("resize", onOrientation);
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, []);

  useEffect(() => {
    if (finishedRef.current || closing) return;
    if (!ready) {
      runningRef.current = false;
      audio.pauseSong();
      setPhase("rotate");
      return;
    }
    if (phase === "rotate") {
      if (startedRef.current && !finishedRef.current) {
        runningRef.current = true;
        lastRef.current = performance.now();
        audio.resumeSong();
        setPhase("play");
      } else {
        setPhase("gate");
      }
    }
  }, [ready, phase, closing]);

  useEffect(() => {
    document.body.classList.add("no-scroll", "cinema-lock");
    const overlay = overlayRef.current;
    try {
      if (overlay && !document.fullscreenElement && overlay.requestFullscreen) void overlay.requestFullscreen().catch(() => undefined);
    } catch {
      /* trình duyệt không cho phép */
    }
    try {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
      void orientation?.lock?.("landscape").catch(() => undefined);
    } catch {
      /* không hỗ trợ */
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(prevTimer.current);
      window.clearTimeout(autoTimer.current);
      window.clearTimeout(longPress.current);
      window.clearTimeout(hintTimer.current);
      runningRef.current = false;
      cleanupEnvironment();
    };
  }, [cleanupEnvironment, finish]);

  const variantIndex = current ? current.index % ENTER_VARIANTS.length : 0;
  const palette = heartVisible ? 5 : current ? current.index % 6 : 0;
  const ringChars = RING_TEXT.split("");

  return (
    <div
      className={"cinema" + (closing ? " is-closing" : "") + (forced ? " is-forced" : "") + (opening ? " is-opening" : "")}
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Cảnh phim âm nhạc dành tặng các bạn nữ 11B7"
    >
      <div className="cinema-rotate">
        <div
          className={"cinema-stage palette-" + palette + (heartVisible ? " has-heart" : "")}
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="cinema-universe" aria-hidden="true">
            <span className="cinema-nebula cinema-nebula--a" />
            <span className="cinema-nebula cinema-nebula--b" />
            <span className="cinema-nebula cinema-nebula--c" />
            <span className="cinema-nebula cinema-nebula--d" />
            <span className="cinema-depth-stars" />
          </div>

          <div className="cinema-camera" ref={cameraRef}>
            {phase === "play" && (
              <UniverseCanvas
                timeRef={timeRef}
                lyricEnd={lyricEnd}
                heartStart={heartStart}
                heartDuration={heartDuration}
                active={!closing}
                viewRef={viewRef}
                interactRef={interactRef}
                onDone={finish}
              />
            )}
          </div>

          <div className="cinema-vignette" aria-hidden="true" />
          {opening && <span className="cinema-flash" aria-hidden="true" />}
          {opening && (
            <span className="cinema-pearl-burst" aria-hidden="true">
              {Array.from({ length: 26 }, (_, i) => (
                <i key={i} style={{ ["--i" as string]: i }} />
              ))}
            </span>
          )}
          <span className="cinema-shockwave" aria-hidden="true" />
          <div className="cinema-ripples" aria-hidden="true">
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className={"cinema-ripple" + (ripple.heart ? " is-heart" : "")}
                style={{ left: ripple.x, top: ripple.y }}
              />
            ))}
          </div>

          {phase === "gate" && (
            <div className="cinema-gate">
              <div
                className="gate-sphere-wrap"
                role="button"
                tabIndex={0}
                onClick={start}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    start();
                  }
                }}
                aria-label="Chạm vào tinh cầu để bắt đầu cảnh phim"
              >
                <span className="gate-glow" aria-hidden="true" />
                <span className="gate-sphere" aria-hidden="true">
                  <span className="gate-sphere__shine" />
                </span>
                {[0, 1, 2].map((ring) => (
                  <span className={"gate-ring gate-ring--" + ring} key={ring} aria-hidden="true">
                    {ringChars.map((char, index) => (
                      <span
                        key={index}
                        className="gate-ring__char"
                        style={{
                          ["--a" as string]: (index / ringChars.length) * 360,
                          ["--r" as string]: 0.52 + ring * 0.13,
                        }}
                      >
                        {char === " " ? "\u00A0" : char}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
              <span className="gate-hit">
                <span className="gate-hint">{gateHint}</span>
                <span className="gate-hint__note">hoặc chờ vài giây, cảnh phim sẽ tự mở</span>
              </span>
            </div>
          )}

          {phase === "play" && (
            <div className="cinema-anchor" aria-hidden="true">
              <span className="cinema-anchor__glow" />
              <span className="cinema-anchor__pearl" />
              <span className="cinema-anchor__ring" />
            </div>
          )}

          {phase === "play" && !heartVisible && current && (
            <span className="cinema-cue-sweep" aria-hidden="true" key={"sweep-" + current.index} />
          )}

          {phase === "play" && !heartVisible && (
            <div className="cinema-lyrics" aria-live="polite" aria-atomic="true">
              {current && (
                <span className="cinema-echo" aria-hidden="true" key={"echo-" + current.index} style={{ ["--beat" as string]: (60 / CONFIG.song.bpm).toFixed(3) + "s" }}>
                  {current.cue.text}
                </span>
              )}
              {prev && (
                <div className={"cinema-cue is-exiting cue-exit--" + EXIT_VARIANTS[prev.variant % EXIT_VARIANTS.length]} key={"prev-" + prev.index}>
                  <CueContent text={prev.cue.text} variant={prev.variant} cueIndex={prev.index} exiting />
                </div>
              )}
              {current && (
                <div className={"cinema-cue cue-enter--" + ENTER_VARIANTS[variantIndex]} key={"cue-" + current.index}>
                  <CueContent text={current.cue.text} variant={variantIndex} cueIndex={current.index} />
                </div>
              )}
            </div>
          )}

          {phase === "play" && heartVisible && (
            <>
              <div className="heart-rings" aria-hidden="true">
                {[0, 1, 2].map((ring) => (
                  <span className={"heart-ring heart-ring--" + ring} key={ring}>
                    {RING_TEXT.split("").map((char, index) => (
                      <span
                        key={index}
                        className="heart-ring__char"
                        style={{
                          ["--a" as string]: (index / RING_TEXT.length) * 360,
                          ["--rr" as string]: 0.9 + ring * 0.16,
                        }}
                      >
                        {char === " " ? "\u00A0" : char}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
              <div className="cinema-love-notes" aria-hidden="true"><span>♡</span><span>✿</span><span>♡</span><span>✦</span><span>♡</span></div>
            </>
          )}

          {phase === "play" && heartVisible && <p className="cinema-touch-hint">Chạm vào tinh cầu ♡</p>}
          {phase === "play" && <div className="cinema-letterbox" aria-hidden="true" />}

          {phase === "rotate" && (
            <div className="cinema-portrait">
              <span className="cinema-portrait__kicker">Một cảnh phim nhỏ xinh</span>
              <div className="cinema-phone" aria-hidden="true">
                <svg viewBox="0 0 120 120" role="presentation">
                  <rect x="38" y="16" width="44" height="78" rx="10" fill="none" stroke="currentColor" strokeWidth="3" />
                  <rect x="45" y="26" width="30" height="54" rx="4" fill="currentColor" opacity="0.18" />
                  <circle cx="60" cy="86" r="2.6" fill="currentColor" />
                  <path d="M86 76 C 100 64 104 48 96 34" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 7" />
                  <path d="M100 44 l-4-11 11 3Z" fill="currentColor" />
                </svg>
              </div>
              <p className="cinema-portrait__title">Xoay ngang điện thoại để xem nhé 📱↪️</p>
              <p className="cinema-portrait__text">Cảnh phim được làm cho màn hình ngang. Xoay máy rồi bọn tớ bắt đầu ngay.</p>
              <button type="button" className="cinema-portrait__fallback" onClick={() => setForced(true)}>Không xoay được? Bấm vào đây</button>
              <button type="button" className="cinema-portrait__skip" onClick={finish}>Bỏ qua bất ngờ này</button>
            </div>
          )}

          {phase === "play" && (
            <span className={"cinema-progress" + (heartVisible ? " is-heart" : "")} aria-hidden="true">
              <span ref={progressRef} />
            </span>
          )}
        </div>
      </div>

      <button type="button" className="cinema-skip" onClick={finish} aria-label="Bỏ qua cảnh phim">
        Bỏ qua <span aria-hidden="true">⏭</span>
      </button>
      {phase === "play" && heartVisible && <p className="cinema-drag-hint" aria-hidden="true">kéo để xoay · chạm để thả tim</p>}
    </div>
  );
}
