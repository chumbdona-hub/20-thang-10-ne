// Section 1.5 — "cảnh phim" toàn màn hình: đếm ngược, lyric SRT cỡ lớn, trái tim hạt 3D.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { SRT_TEXT } from "../data/lyrics";
import { audio } from "../lib/audio";
import { onFrame, prefersReducedMotion } from "../lib/loop";
import { mergeCuesForDisplay, parseSRT, type Cue } from "../lib/srt";
import { clamp, easeOutCubic } from "../lib/utils";
import { isLite } from "../lib/perf";

type Props = { onClose: () => void };
type Phase = "rotate" | "countdown" | "play";
type PrevCue = { cue: Cue; variant: number } | null;

const ENTER_VARIANTS = ["slam", "scatter", "flip", "mask", "track", "glitch", "zoom", "wave", "word", "elastic"];
const EXIT_VARIANTS = ["burst", "up", "fall", "dust", "whip"];
const CHARS = ["scatter", "flip", "wave", "elastic"];

const longestIndex = (words: string[]) =>
  words.reduce((best, word, index) => (word.replace(/[^\p{L}]/gu, "").length > words[best].replace(/[^\p{L}]/gu, "").length ? index : best), 0);

function splitWords(text: string) {
  const words = text.split(/\s+/);
  const key = longestIndex(words);
  return words.map((word, wi) => ({ word, wi, key: wi === key }));
}

function CueContent({ text, variant, exiting = false }: { text: string; variant: number; exiting?: boolean }) {
  const words = splitWords(text);
  const perChar = !exiting && CHARS.includes(ENTER_VARIANTS[variant % ENTER_VARIANTS.length]);
  return (
    <p className={`cue-text${text.length > 28 ? " is-long" : ""}`}>
      {words.map(({ word, wi, key }) => (
        <span className={`cue-word${key ? " is-key" : ""}`} key={`${wi}-${word}`} style={{ ["--wi" as string]: wi }}>
          {perChar ? (
            Array.from(word).map((char, ci) => (
              <span className="cue-char" key={ci} style={{ ["--ci" as string]: wi * 4 + ci }}>
                {char}
              </span>
            ))
          ) : (
            <span className="cue-piece">{word}</span>
          )}
          {wi < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}

type CanvasProps = {
  timeRef: React.MutableRefObject<number>;
  lyricEnd: number;
  heartStart: number;
  heartDuration: number;
  active: boolean;
  onDone: () => void;
};

function CinemaCanvas({ timeRef, lyricEnd, heartStart, heartDuration, active, onDone }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, x: 0, base: 0 });
  const dragRot = useRef(0);
  const doneRef = useRef(false);

  const particles = useMemo(() => {
    const lowPower = isLite();
    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || Math.min(window.innerWidth, window.innerHeight) < 700);
    const isWeak = lowPower;
    const count = lowPower ? 720 : isMobile ? 1050 : 1500;
    const heart: { x: number; y: number; z: number; size: number; color: string; seed: number }[] = [];
    for (let i = 0; i < count; i += 1) {
      const t = Math.random() * Math.PI * 2;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const shrink = 0.55 + Math.random() * 0.45;
      heart.push({
        x: x * shrink + (Math.random() - 0.5) * 0.7,
        y: y * shrink + (Math.random() - 0.5) * 0.7,
        z: (Math.random() - 0.5) * 3.4,
        size: 0.9 + Math.random() * 1.9,
        color: ["#FFD1E2", "#FF9FBE", "#FF7AA6", "#FFE3B5", "#F3C7FF"][i % 5],
        seed: Math.random() * Math.PI * 2,
      });
    }
    const stars = Array.from({ length: isWeak ? 52 : 84 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      s: 0.4 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
    }));
    const petals = Array.from({ length: isWeak ? 14 : 26 }, () => ({
      x: Math.random(),
      y: Math.random(),
      sx: 0.2 + Math.random(),
      sy: 0.35 + Math.random(),
      size: 3 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      color: ["#FFC1D7", "#FFE1ED", "#FFB3D1", "#E4D4FF"][Math.floor(Math.random() * 4)],
      phase: Math.random() * Math.PI * 2,
    }));
    const ringCount = isWeak ? 2 : 3;
    const dotsPerRing = isWeak ? 40 : 58;
    const orbit = Array.from({ length: ringCount }, (_, ring) =>
      Array.from({ length: dotsPerRing }, (_, i) => ({
        angle: (i / dotsPerRing) * Math.PI * 2,
        radius: 1 + ring * 0.12,
        tilt: ring * 0.65 + 0.4,
        speed: (ring % 2 === 0 ? 1 : -1) * (0.18 + ring * 0.05),
        size: 0.7 + (i % 4) * 0.35,
        ring,
      })),
    );
    const spiralCount = isWeak ? 38 : 72;
    const spiral = Array.from({ length: spiralCount }, (_, i) => ({
      offset: i / spiralCount,
      angle: (i / spiralCount) * Math.PI * 6,
      radius: 1.5 + (i % 9) * 0.12,
    }));
    return { heart, stars, petals, orbit, spiral, weak: isWeak, mobile: isMobile };
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = wrap.clientWidth || window.innerWidth;
    let height = wrap.clientHeight || window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, particles.weak ? 1.1 : particles.mobile ? 1.25 : 1.75);
    let bgGradient: CanvasGradient | null = null;
    let coreGradient: CanvasGradient | null = null;
    let heartGlow: CanvasGradient | null = null;
    const resize = () => {
      width = wrap.clientWidth || window.innerWidth;
      height = wrap.clientHeight || window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      // Cache gradient theo kích thước: tránh tạo mới mỗi khung hình.
      bgGradient = ctx.createRadialGradient(width / 2, height * 0.48, 10, width / 2, height * 0.5, Math.max(width, height) * 0.78);
      bgGradient.addColorStop(0, "rgba(72, 35, 88, 0.18)");
      bgGradient.addColorStop(0.55, "rgba(31, 15, 50, 0)");
      bgGradient.addColorStop(1, "rgba(18, 8, 32, 0.35)");

      coreGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width, height) * 0.55);
      coreGradient.addColorStop(0, "rgba(255, 208, 232, 1)");
      coreGradient.addColorStop(0.45, "rgba(255, 196, 226, 0.28)");
      coreGradient.addColorStop(1, "rgba(255, 208, 232, 0)");

      heartGlow = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.min(width, height) * 0.46);
      heartGlow.addColorStop(0, "rgba(255, 132, 177, 1)");
      heartGlow.addColorStop(0.55, "rgba(217, 112, 199, 0.34)");
      heartGlow.addColorStop(1, "rgba(140, 84, 200, 0)");
    };
    resize();
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 160);
    };
    window.addEventListener("resize", onResize, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(wrap);

    const onDown = (event: PointerEvent) => {
      drag.current = { active: true, x: event.clientX, base: dragRot.current };
    };
    const onMove = (event: PointerEvent) => {
      if (!drag.current.active) return;
      dragRot.current = drag.current.base + (event.clientX - drag.current.x) / Math.max(180, width) * 2.6;
    };
    const onUp = () => {
      drag.current.active = false;
    };
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    const heartPath = (x: number, y: number, s: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.3);
      ctx.bezierCurveTo(x - s * 0.12, y, x - s * 0.6, y - s * 0.28, x - s * 0.5, y - s * 0.58);
      ctx.bezierCurveTo(x - s * 0.4, y - s * 0.86, x - s * 0.06, y - s * 0.8, x, y - s * 0.48);
      ctx.bezierCurveTo(x + s * 0.06, y - s * 0.8, x + s * 0.4, y - s * 0.86, x + s * 0.5, y - s * 0.58);
      ctx.bezierCurveTo(x + s * 0.6, y - s * 0.28, x + s * 0.12, y, x, y + s * 0.3);
      ctx.closePath();
    };

    const draw = () => {
      const now = timeRef.current;
      const beatLength = 60 / CONFIG.song.bpm;
      const beatPos = ((now - CONFIG.song.beatOffset) % beatLength + beatLength) % beatLength;
      const kick = Math.exp(-beatPos * 7);
      ctx.clearRect(0, 0, width, height);

      // ---- nền: sao, cánh hoa, vệt sáng theo chiều sâu
      if (bgGradient) {
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
      }

      particles.stars.forEach((star) => {
        const twinkle = 0.32 + 0.55 * (0.5 + 0.5 * Math.sin(now * (1.2 + star.z) + star.phase));
        const depth = 0.35 + star.z;
        ctx.globalAlpha = twinkle * (0.4 + star.z * 0.5);
        ctx.fillStyle = star.z > 0.7 ? "#fff2d6" : "#fff8fd";
        ctx.beginPath();
        ctx.arc(star.x * width, (star.y + Math.sin(now * 0.06 + star.phase) * 0.01) * height, star.s * depth, 0, Math.PI * 2);
        ctx.fill();
      });

      particles.petals.forEach((petal) => {
        const drift = now * 0.02 * petal.sx;
        const px = ((petal.x + drift) % 1.12) * width - width * 0.06;
        const py = ((petal.y + now * 0.012 * petal.sy) % 1.12) * height - height * 0.06;
        ctx.save();
        ctx.globalAlpha = 0.16 + petal.size / 40 + kick * 0.06;
        ctx.translate(px, py);
        ctx.rotate(petal.rot + now * 0.22 + petal.phase);
        ctx.fillStyle = petal.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, petal.size * 0.5, petal.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (coreGradient) {
        ctx.globalAlpha = 0.24 + kick * 0.2;
        ctx.fillStyle = coreGradient;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }

      if (!activeRefValue.current || now < lyricEnd - 0.05) {
        ctx.globalAlpha = 1;
        return;
      }

      // ---- trái tim hạt
      const age = now - heartStart;
      const lastTwo = clamp((age - (heartDuration - 2)) / 2);
      const burst = clamp((age - (heartDuration - 0.32)) / 0.4);
      const centerX = width / 2;
      const centerY = height * 0.5;
      const baseScale = Math.min(width, height) / (particles.weak ? 24 : 22);
      const pulse = 1 + kick * 0.075 * (1 - lastTwo * 0.4);
      const heartScale = baseScale * pulse * (1 - lastTwo * 0.35 + burst * 1.6);
      const rotationY = age * 0.3 + dragRot.current * 0.9 + 0.35;

      if (!prefersReducedMotion() && !particles.weak) {
        ctx.globalCompositeOperation = "lighter";
      }

      if (heartGlow) {
        ctx.globalAlpha = 0.3 + kick * 0.28;
        ctx.fillStyle = heartGlow;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }

      // dòng xoắn ốc từ ngoài vào
      particles.spiral.forEach((dot) => {
        const progress = ((age * 0.16 + dot.offset) % 1);
        const radius = (1.5 - progress * 1.3) * baseScale * 1.65;
        const angle = dot.angle + age * (0.5 + lastTwo * 2.4);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.7;
        ctx.globalAlpha = (1 - progress) * 0.55 + 0.1;
        ctx.fillStyle = progress > 0.7 ? "#fff1c6" : "#ffc2dd";
        const s = (particles.weak ? 1.1 : 1.5) + (1 - progress) * 1.4;
        ctx.fillRect(x, y, s, s);
      });

      // bề mặt trái tim, xoay chậm theo trục Y
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);
      particles.heart.forEach((p, index) => {
        const form = clamp((age - 0.1 - (index % 40) * 0.004) / 0.9);
        const outward = 1 + lastTwo * 0.25 * Math.sin(p.seed + age);
        const x0 = p.x * heartScale * outward;
        const y0 = -p.y * heartScale * outward;
        const z0 = p.z * heartScale * 0.16;
        const rotatedX = x0 * cosY - z0 * sinY;
        const rotatedZ = x0 * sinY + z0 * cosY;
        const perspective = 1 + rotatedZ / (baseScale * 22);
        const targetX = centerX + rotatedX * perspective;
        const targetY = centerY + y0 * perspective;
        const scatterX = centerX + Math.cos(p.seed * 9.1 + index) * width * 0.6;
        const scatterY = centerY + Math.sin(p.seed * 5.7 + index) * height * 0.6;
        let x = scatterX + (targetX - scatterX) * easeOutCubic(form);
        let y = scatterY + (targetY - scatterY) * easeOutCubic(form);
        let alpha = easeOutCubic(form) * (0.55 + 0.4 * (0.5 + 0.5 * Math.sin(p.seed + age * 1.4)));
        if (lastTwo > 0) {
          const collapse = easeOutCubic(lastTwo) * 0.3;
          x += (centerX - x) * collapse;
          y += (centerY - y) * collapse;
          alpha *= 1 - lastTwo * 0.22;
        }
        if (burst > 0) {
          const angle = p.seed * 3 + age;
          x += Math.cos(angle) * burst * width * 0.7;
          y += Math.sin(angle) * burst * height * 0.7;
          alpha *= 1 - burst;
        }
        ctx.globalAlpha = clamp(alpha);
        ctx.fillStyle = p.color;
        const size = p.size * (particles.weak ? 0.9 : 1.2) * (0.65 + form * 0.35);
        if (particles.weak) {
          ctx.fillRect(x, y, size, size);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, size * 0.72, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // các vòng quỹ đạo nghiêng như vành nguyên tử
      particles.orbit.forEach((ring) => {
        ring.forEach((dot) => {
          const angle = dot.angle + age * dot.speed * (1 + lastTwo * 3.4);
          const radiusX = baseScale * (1.42 + dot.radius * 0.14) * (1 + kick * 0.04 + lastTwo * 0.2);
          const radiusY = radiusX * (0.32 + dot.ring * 0.06);
          const tilt = dot.tilt;
          const px = Math.cos(angle) * radiusX;
          const py = Math.sin(angle) * radiusY;
          const x = centerX + px * Math.cos(tilt) - py * Math.sin(tilt);
          const y = centerY + px * Math.sin(tilt) + py * Math.cos(tilt);
          ctx.globalAlpha = (0.35 + kick * 0.35) * (1 - lastTwo * 0.2);
          ctx.fillStyle = dot.ring === 1 ? "#ffe4ad" : dot.ring === 2 ? "#d8c5ff" : "#ffc4de";
          ctx.beginPath();
          ctx.arc(x, y, dot.size, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // các trái tim nhỏ bắn ra theo nhịp
      if (kick > 0.72 && !particles.weak) {
        ctx.globalAlpha = (kick - 0.72) * 1.8;
        ctx.fillStyle = "#ffd6e7";
        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2 + age;
          const dist = baseScale * (2.1 + i * 0.1);
          heartPath(centerX + Math.cos(angle) * dist, centerY + Math.sin(angle) * dist * 0.6, 8);
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      if (age > heartDuration + 0.15 && !doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    };

    const activeRefValue = { current: active };
    let frameAcc = 0;
    const stop = onFrame((dt) => {
      if (!active) return;
      frameAcc += dt;
      // Máy yếu: vẽ tối đa ~30fps, vẫn đủ mượt cho hạt và giảm tải GPU/CPU.
      const minStep = particles.mobile || particles.weak ? 1 / 30 : 1 / 60;
      if (frameAcc < minStep) return;
      frameAcc = 0;
      draw();
    });
    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerdown", onDown);
      observer?.disconnect();
      window.clearTimeout(resizeTimer);
      ctx.clearRect(0, 0, width, height);
    };
  }, [heartDuration, heartStart, lyricEnd, onDone, particles, timeRef]);

  return (
    <div className="cinema-canvas-wrap" ref={wrapRef} aria-hidden="true">
      <canvas className="cinema-canvas" ref={canvasRef} />
    </div>
  );
}

export default function Cinema({ onClose }: Props) {
  const rawCues = useMemo(() => parseSRT(SRT_TEXT), []);
  // Chỉ để hiển thị: gộp vài mốc vài chục ms thành câu đọc được.
  const cues = useMemo(() => mergeCuesForDisplay(rawCues), [rawCues]);
  const lyricEnd = rawCues.length ? rawCues[rawCues.length - 1].end : 53.867;
  const heartStart = lyricEnd;
  const heartDuration = CONFIG.song.heartDuration;
  // Tổng cảnh phim đúng 59 giây: 8.633s mở màn không chữ + lyric + tim đập tới hết.
  const total = Math.max(CONFIG.song.duration, heartStart + heartDuration);

  const initialLandscape =
    typeof window !== "undefined" ? window.matchMedia("(orientation: landscape)").matches || window.innerWidth > window.innerHeight : true;

  const [landscape, setLandscape] = useState(initialLandscape);
  const [forced, setForced] = useState(false);
  const [phase, setPhase] = useState<Phase>(() => (initialLandscape ? "countdown" : "rotate"));
  const [count, setCount] = useState(3);
  const [current, setCurrent] = useState<{ cue: Cue; index: number } | null>(null);
  const [prev, setPrev] = useState<PrevCue>(null);
  const [heartVisible, setHeartVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [opening, setOpening] = useState(false);

  const timeRef = useRef(0);
  const runningRef = useRef(false);
  const lastRef = useRef(0);
  const finishedRef = useRef(false);
  const songStarted = useRef(false);
  const pausedPhase = useRef<"play">("play");
  const cueIndexRef = useRef(-1);
  const prevTimer = useRef(0);
  const beatRef = useRef(-1);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const ready = landscape || forced;

  // Thanh tiến độ chạy theo đồng hồ thật (59s), không re-render React mỗi khung hình.
  useEffect(() => {
    if (phase !== "play") return;
    let acc = 0;
    return onFrame((dt) => {
      acc += dt;
      if (acc < 0.08) return;
      acc = 0;
      const bar = progressRef.current;
      if (bar) bar.style.transform = `scaleX(${clamp(timeRef.current / total).toFixed(4)})`;
    });
  }, [phase, total]);

  const cleanupEnvironment = useCallback(() => {
    document.body.classList.remove("no-scroll", "cinema-lock");
    try {
      audio.stopSong(0.7);
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
    audio.stopSong(0.8);
    audio.setMood("letter");
    audio.sfx("sparkle");
    window.setTimeout(() => {
      cleanupEnvironment();
      onClose();
    }, 620);
  }, [cleanupEnvironment, onClose]);

  const beginPlay = useCallback(() => {
    if (finishedRef.current) return;
    audio.resume();
    if (!songStarted.current) {
      songStarted.current = true;
      audio.setMood("cinema");
      audio.startSong();
    } else {
      audio.resumeSong();
    }
    lastRef.current = performance.now();
    runningRef.current = true;
    setOpening(true);
    setPhase("play");
    setCount(0);
    window.setTimeout(() => setOpening(false), 1150);
    if (timeRef.current === 0) audio.sfx("whoosh");
  }, []);

  useEffect(() => {
    const stop = onFrame(() => {
      if (phase !== "play" || !runningRef.current || document.hidden) return;
      const songTime = audio.hasSong ? audio.songTime() : null;
      if (songTime !== null && songTime >= 0 && songTime < 600) {
        timeRef.current = songTime;
      } else {
        // Đồng hồ nội bộ dùng thời gian thực, không dùng dt của rAF (có thể bị kẹp
        // khi máy lag, khiến "video" 59s chạy chậm hơn thực tế).
        const wall = performance.now();
        const delta = lastRef.current ? (wall - lastRef.current) / 1000 : 0;
        timeRef.current = Math.min(total + 2, timeRef.current + Math.max(0, Math.min(0.8, delta)));
      }
      lastRef.current = performance.now();
      const t = timeRef.current;
      if (t >= total) {
        runningRef.current = false;
        finish();
        return;
      }

      // đồng bộ lyric
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
            setPrev({ cue: cues[previous], variant: previous % EXIT_VARIANTS.length });
            window.clearTimeout(prevTimer.current);
            prevTimer.current = window.setTimeout(() => setPrev(null), 280);
          }
          setCurrent(nextIndex >= 0 ? { cue: cues[nextIndex], index: nextIndex } : null);
        }
      } else if (!heartVisible) {
        setHeartVisible(true);
        setCurrent(null);
        setPrev(null);
        audio.sfx("sparkle");
        audio.sfx("heartbeat");
      }

      // nhịp kick: vignette + punch nhẹ, không chớp mạnh
      const beatLength = 60 / CONFIG.song.bpm;
      const beat = Math.floor((t - CONFIG.song.beatOffset) / beatLength);
      if (beat !== beatRef.current) {
        beatRef.current = beat;
        if (heartVisible && beat % 2 === 0) audio.sfx("heartbeat");
        const stage = stageRef.current;
        if (stage) {
          stage.style.setProperty("--kick", "1");
          window.setTimeout(() => stage.style.setProperty("--kick", "0"), 140);
        }
      }
    });
    return stop;
  }, [cues, finish, heartVisible, lyricEnd, phase, total]);

  useEffect(() => {
    const onOrientation = () => {
      const next = window.matchMedia("(orientation: landscape)").matches || window.innerWidth > window.innerHeight;
      setLandscape(next);
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
      if (phase === "play") pausedPhase.current = "play";
      runningRef.current = false;
      audio.pauseSong();
      setPhase("rotate");
      return;
    }
    if (phase === "rotate") setPhase("countdown");
  }, [ready, phase, closing]);

  useEffect(() => {
    if (phase !== "countdown" || !ready || closing) return;
    setCount(3);
    audio.resume();
    audio.sfx("tick");
    const timers = [
      window.setTimeout(() => {
        setCount(2);
        audio.sfx("tick");
      }, 800),
      window.setTimeout(() => {
        setCount(1);
        audio.sfx("tick");
      }, 1600),
      window.setTimeout(() => {
        setCount(0);
        audio.sfx("chime");
        beginPlay();
      }, 2400),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [beginPlay, closing, phase, ready]);

  useEffect(() => {
    document.body.classList.add("no-scroll", "cinema-lock");
    const overlay = overlayRef.current;
    try {
      if (overlay && !document.fullscreenElement && overlay.requestFullscreen) {
        void overlay.requestFullscreen().catch(() => undefined);
      }
    } catch {
      /* trình duyệt không cho phép */
    }
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: string) => Promise<void>;
      };
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
      runningRef.current = false;
      cleanupEnvironment();
    };
  }, [cleanupEnvironment, finish]);

  const variantIndex = current ? current.index % ENTER_VARIANTS.length : 0;
  const palette = heartVisible ? 5 : current ? current.index % 6 : Math.min(5, Math.floor(timeRef.current / 1.6) % 5);

  return (
    <div
      className={`cinema${closing ? " is-closing" : ""}${forced ? " is-forced" : ""}${opening ? " is-opening" : ""}`}
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Cảnh phim âm nhạc dành tặng các bạn nữ 11B7"
    >
      <div className="cinema-rotate">
        <div className={`cinema-stage palette-${palette}${heartVisible ? " has-heart" : ""}`} ref={stageRef}>
          <div className="cinema-sky" aria-hidden="true" />
          {phase === "play" && (
            <CinemaCanvas
              timeRef={timeRef}
              lyricEnd={lyricEnd}
              heartStart={heartStart}
              heartDuration={heartDuration}
              active={!closing}
              onDone={finish}
            />
          )}
          <div className="cinema-vignette" aria-hidden="true" />
          {opening && <span className="cinema-flash" aria-hidden="true" />}
          <span className="cinema-shockwave" aria-hidden="true" />

          {phase === "play" && !heartVisible && (
            <div className={`cinema-prelude${current ? " is-hidden" : ""}`} aria-hidden="true">
              <span className="cinema-prelude__halo" />
              <span className="cinema-prelude__ring" />
              <span className="cinema-prelude__ring cinema-prelude__ring--two" />
              <span className="cinema-prelude__orb" />
              <span className="cinema-prelude__orb cinema-prelude__orb--two" />
            </div>
          )}

          {phase === "play" && heartVisible && (
            <div
              className="cinema-beatwords"
              aria-hidden="true"
              style={{ ["--beat" as string]: `${(60 / CONFIG.song.bpm).toFixed(3)}s` }}
            >
              <span>thương</span>
              <span>11B7</span>
              <span>rạng rỡ</span>
              <span>20·10</span>
              <span>dịu dàng</span>
              <span>xinh</span>
              <span className="cinema-beatwords__giant">♥</span>
            </div>
          )}

          {phase === "play" && !heartVisible && (
            <div className="cinema-lyrics" aria-live="polite" aria-atomic="true">
              {current && (
                <span
                  className="cinema-echo"
                  aria-hidden="true"
                  key={`echo-${current.index}`}
                  style={{ ["--beat" as string]: `${(60 / CONFIG.song.bpm).toFixed(3)}s` }}
                >
                  {current.cue.text}
                </span>
              )}
              {prev && (
                <div
                  className={`cinema-cue is-exiting cue-exit--${EXIT_VARIANTS[prev.variant]}`}
                  key={`prev-${prev.variant}`}
                >
                  <CueContent text={prev.cue.text} variant={prev.variant} exiting />
                </div>
              )}
              {current && (
                <div
                  className={`cinema-cue cue-enter--${ENTER_VARIANTS[variantIndex]}`}
                  key={`cue-${current.index}`}
                >
                  <CueContent text={current.cue.text} variant={variantIndex} />
                </div>
              )}
            </div>
          )}

          {phase === "countdown" && (
            <div className="cinema-countdown" aria-live="polite">
              <span className="cinema-countdown__caption">Sẵn sàng nha…</span>
              <span className="cinema-countdown__number" key={count}>
                {count > 0 ? count : "♡"}
              </span>
              <span className="cinema-countdown__ring" aria-hidden="true" />
            </div>
          )}

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
              <p className="cinema-portrait__text">
                Cảnh phim được làm cho màn hình ngang. Xoay máy rồi bọn tớ bắt đầu ngay.
              </p>
              <button type="button" className="cinema-portrait__fallback" onClick={() => setForced(true)}>
                Không xoay được? Bấm vào đây
              </button>
              <button type="button" className="cinema-portrait__skip" onClick={finish}>
                Bỏ qua bất ngờ này
              </button>
            </div>
          )}

          {phase === "play" && (
            <span className={`cinema-progress${heartVisible ? " is-heart" : ""}`} aria-hidden="true">
              <span ref={progressRef} />
            </span>
          )}
        </div>
      </div>

      <button type="button" className="cinema-skip" onClick={finish} aria-label="Bỏ qua cảnh phim">
        Bỏ qua <span aria-hidden="true">⏭</span>
      </button>
      {phase === "play" && heartVisible && (
        <p className="cinema-drag-hint" aria-hidden="true">
          kéo ngang để xoay trái tim
        </p>
      )}
    </div>
  );
}
