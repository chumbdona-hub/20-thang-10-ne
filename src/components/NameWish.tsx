// Màn hình lời chúc: tên viết bằng hạt, tinh cầu + vòng quay, phong thư mở thành thiệp.
import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "../lib/audio";
import { burst, petalRain } from "../lib/fx";
import { onFrame, prefersReducedMotion } from "../lib/loop";
import { isLite } from "../lib/perf";
import { fitText } from "../lib/text";
import { type WishTarget } from "../data/wishes";
import { MiniFlower, Rose } from "./art/FlowerArt";

type Props = { target: WishTarget; onClose: () => void };

export default function NameWish({ target, onClose }: Props) {
  const isTeacher = target.kind === "teacher";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wishIndex, setWishIndex] = useState(0);
  const [cardOpen, setCardOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [bloom, setBloom] = useState(isTeacher ? "pending" : "done");
  const pointer = useRef({ x: 0, y: 0, active: false, last: 0 });
  const historyPushed = useRef(false);
  const closingRef = useRef(false);

  const wish = target.wishes[wishIndex % target.wishes.length] ?? target.wishes[0] ?? "";

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    audio.sfx("pop");
    if (historyPushed.current) {
      historyPushed.current = false;
      try {
        window.history.back();
      } catch {
        /* bỏ qua */
      }
    }
    onClose();
  }, [onClose]);

  // Khóa cuộn + nút Back của điện thoại.
  useEffect(() => {
    document.body.classList.add("no-scroll", "wish-open");
    try {
      window.history.pushState({ wishOverlay: true }, "");
      historyPushed.current = true;
    } catch {
      /* trình duyệt chặn history, dùng nút × */
    }
    const onPop = () => {
      historyPushed.current = false;
      if (!closingRef.current) {
        closingRef.current = true;
        onClose();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    if (isTeacher) {
      window.setTimeout(() => audio.sfx("teacher"), 220);
      window.setTimeout(() => setBloom("done"), 2100);
    } else {
      window.setTimeout(() => audio.sfx("found"), 260);
    }
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll", "wish-open");
    };
  }, [close, isTeacher, onClose]);

  // Tên viết bằng hạt: render chữ ẩn → lấy mẫu điểm ảnh → bay về đúng nét chữ.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const lite = isLite();
    const reduce = prefersReducedMotion();
    let width = wrap.clientWidth || window.innerWidth;
    let height = wrap.clientHeight || 200;
    const ratio = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.6);

    type P = { tx: number; ty: number; x: number; y: number; vx: number; vy: number; size: number; color: string; phase: number };
    let particles: P[] = [];

    const palette = isTeacher
      ? ["#FFF8E0", "#FFE1A0", "#FFC46B", "#FF9EBC", "#FFD98A"]
      : ["#FFFFFF", "#FFD3E7", "#FF9FC4", "#FF6E9F", "#D9AEFF"];

    const sample = () => {
      width = wrap.clientWidth || window.innerWidth;
      height = wrap.clientHeight || 200;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const off = document.createElement("canvas");
      off.width = Math.max(320, Math.floor(width));
      off.height = Math.max(140, Math.floor(height));
      const octx = off.getContext("2d");
      if (!octx) return;
      const maxWidth = Math.min(width * 0.92, 680);
      const startSize = Math.min(104, Math.max(42, Math.floor(width * 0.15)));
      const fitted = fitText(octx, target.name, maxWidth, 2, startSize, 700, '"Dancing Script", "Baloo 2", cursive');
      const lineHeight = fitted.size * 1.06;
      octx.clearRect(0, 0, off.width, off.height);
      octx.fillStyle = "#ffffff";
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.font = `700 ${fitted.size}px "Dancing Script", "Baloo 2", cursive`;
      fitted.lines.forEach((line, index) => {
        octx.fillText(line, off.width / 2, off.height / 2 + (index - (fitted.lines.length - 1) / 2) * lineHeight);
      });
      const data = octx.getImageData(0, 0, off.width, off.height).data;
      const step = lite ? 4 : 3;
      const found: P[] = [];
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          const alpha = data[(y * off.width + x) * 4 + 3];
          if (alpha < 128) continue;
          const nx = x / off.width - 0.5;
          const ny = y / off.height - 0.5;
          const edge = Math.min(1, Math.abs(nx) * 1.7 + Math.abs(ny) * 0.9);
          found.push({
            tx: x,
            ty: y,
            x: Math.random() * off.width,
            y: Math.random() * off.height,
            vx: 0,
            vy: 0,
            size: 1.15 + Math.random() * (lite ? 1.2 : 1.8),
            color: palette[Math.min(palette.length - 1, Math.floor(edge * palette.length))] ?? palette[0],
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
      particles = reduce ? found.map((p) => ({ ...p, x: p.tx, y: p.ty })) : found;
    };

    sample();
    let fontTimer = 0;
    let disposed = false;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(() => {
          fontTimer = window.setTimeout(() => {
            if (!disposed) sample();
          }, 60);
        })
        .catch(() => undefined);
    }
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(sample, 220);
    };
    window.addEventListener("resize", onResize, { passive: true });

    let acc = 0;
    const stop = onFrame((dt) => {
      acc += dt;
      const step = lite ? 1 / 30 : 1 / 45;
      if (acc < step) return;
      acc = 0;
      ctx.clearRect(0, 0, width, height);
      const active = pointer.current.active ? pointer.current : null;
      particles.forEach((p, index) => {
        if (!active && !reduce) {
          const spring = 0.055;
          p.vx += (p.tx - p.x) * spring;
          p.vy += (p.ty - p.y) * spring;
          p.vx *= 0.86;
          p.vy *= 0.86;
          p.x += p.vx;
          p.y += p.vy;
        }
        if (active) {
          const dx = p.x - pointer.current.x;
          const dy = p.y - pointer.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 90) {
            const push = (90 - dist) / 90;
            p.x += (dx / dist) * push * 14;
            p.y += (dy / dist) * push * 14;
          }
          p.vx *= 0.9;
          p.vy *= 0.9;
        }
        const twinkle = 0.72 + 0.28 * Math.sin(p.phase + performance.now() * 0.0016);
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = p.color;
        const size = p.size * (index % 7 === 0 ? 1.7 : 1);
        ctx.fillRect(p.x, p.y, size, size);
        if (index % 11 === 0) {
          ctx.globalAlpha = 0.16;
          ctx.fillRect(p.x - size, p.y - size, size * 3, size * 3);
        }
      });
      ctx.globalAlpha = 1;
    });

    return () => {
      disposed = true;
      stop();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(fontTimer);
      ctx.clearRect(0, 0, width, height);
    };
  }, [target.name, isTeacher]);

  // Gõ lời chúc khi thiệp mở.
  useEffect(() => {
    if (!cardOpen) {
      setTyped("");
      return;
    }
    setTyped("");
    let index = 0;
    let tickCounter = 0;
    const timer = window.setInterval(() => {
      index = Math.min(wish.length, index + 1);
      setTyped(wish.slice(0, index));
      tickCounter += 1;
      if (tickCounter % 7 === 0) audio.sfx("letter-tick");
      if (index >= wish.length) window.clearInterval(timer);
    }, 22);
    return () => window.clearInterval(timer);
  }, [cardOpen, wish, wishIndex]);

  const openLetter = () => {
    audio.resume();
    audio.sfx("envelope");
    audio.sfx("page");
    setCardOpen(true);
  };

  const nextWish = () => {
    audio.sfx("page");
    setWishIndex((value) => (value + 1) % Math.max(1, target.wishes.length));
  };

  const sendLove = () => {
    audio.resume();
    audio.sfx("sparkle");
    audio.sfx("chime");
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([16, 40, 18]);
      } catch {
        /* bỏ qua */
      }
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const colors = isTeacher
      ? ["#FFE6A6", "#FFD27A", "#FFC1D4", "#FFF7DE", "#FFB67A"]
      : ["#FFD9E6", "#FFB3D1", "#FFF0B8", "#D9C7FF", "#FFFFFF"];
    burst(w * 0.5, h * 0.52, { count: 64, colors, speedMax: 430, lift: 180, sizeMax: 15 });
    petalRain({ count: 18, colors, lifeScale: 1.3, sizeScale: 1.1 });
    window.setTimeout(() => burst(w * 0.28, h * 0.42, { count: 34, colors, speedMax: 300 }), 160);
    window.setTimeout(() => burst(w * 0.74, h * 0.46, { count: 34, colors, speedMax: 300 }), 300);
  };

  const onPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      active: event.type !== "pointerup" && event.type !== "pointercancel" && event.type !== "pointerleave",
      last: performance.now(),
    };
    if (pointer.current.active) {
      audio.sfx("star");
    }
  };


  return (
    <div
      className={`wish-overlay${isTeacher ? " is-teacher" : ""}${cardOpen ? " is-reading" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Lời chúc dành cho ${target.name}`}
    >
      <div className="wish-sky" aria-hidden="true">
        <div className="wish-nebula wish-nebula--one" />
        <div className="wish-nebula wish-nebula--two" />
        <div className="wish-nebula wish-nebula--three" />
        {Array.from({ length: 46 }, (_, i) => (
          <span
            key={i}
            className="wish-sky__star"
            style={{
              left: `${(i * 43 + 7) % 97}%`,
              top: `${(i * 61 + 11) % 93}%`,
              animationDelay: `${(i % 9) * 0.5}s`,
              width: `${1 + (i % 3) * 0.7}px`,
              height: `${1 + (i % 3) * 0.7}px`,
            }}
          />
        ))}
      </div>

      <button type="button" className="wish-close" onClick={close} aria-label="Đóng lời chúc">
        ×
      </button>

      <div className="wish-window" ref={wrapRef}>
        <header className="wish-head">
          <p className="wish-kicker script">{isTeacher ? "Kính gửi cô" : "Chúc mừng 20/10"}</p>
          <span className="wish-head__date">20 · 10 · 11B7</span>
        </header>

        <div className="wish-name-stage">
          <canvas
            ref={canvasRef}
            className="wish-name-canvas"
            onPointerDown={onPointer}
            onPointerMove={onPointer}
            onPointerUp={onPointer}
            onPointerCancel={onPointer}
            onPointerLeave={onPointer}
          />
          <span className="sr-only">{`${isTeacher ? "Cô Hoàng Thị Hoa" : target.name}`}</span>
        </div>

        <div className={`wish-orbitals${isTeacher ? " is-gold" : ""}`} aria-hidden="true">
          <span className="wish-pearl" />
          <span className="wish-orbit wish-orbit--a">
            <span>11B7 ✦ 20/10 ✦ chúc mừng ✦ 11B7 ✦ 20/10 ✦</span>
          </span>
          <span className="wish-orbit wish-orbit--b">
            <span>yêu thương ✦ rạng rỡ ✦ 11B7 ✦ yêu thương ✦</span>
          </span>
          <span className="wish-orbit wish-orbit--c">
            <span>thật nhiều niềm vui ✦ 20·10 ✦</span>
          </span>
          {Array.from({ length: 7 }, (_, i) => (
            <span className="wish-heart" key={i} style={{ ["--i" as string]: i }}>
              ♥
            </span>
          ))}
        </div>

        {isTeacher && bloom !== "done" && (
          <div className="wish-bouquet" aria-hidden="true">
            <span className="wish-bouquet__rose">
              <Rose />
            </span>
            <MiniFlower variant="daisy" className="wish-bouquet__a" />
            <MiniFlower variant="tulip" className="wish-bouquet__b" />
            <MiniFlower variant="sunflower" className="wish-bouquet__c" />
            <span className="wish-bouquet__note script">Kính tặng cô 🌷</span>
          </div>
        )}

        <div className="wish-actions">
          {!cardOpen ? (
            <button type="button" className="wish-mail-btn" onClick={openLetter}>
              <span aria-hidden="true">💌</span>
              {isTeacher ? "Kính mời cô mở thư" : "Mở thư"}
            </button>
          ) : (
            <p className="wish-hint script">thư đã mở, đọc chậm thôi nhé…</p>
          )}
          <button type="button" className="wish-flower-btn" onClick={sendLove}>
            <span aria-hidden="true">💗</span> Gửi yêu thương
          </button>
        </div>
      </div>

      {cardOpen && (
        <div className="wish-card-backdrop" onClick={close} />
      )}
      {cardOpen && (
        <article
          className="wish-letter-card"
          role="dialog"
          aria-label={`Thiệp chúc mừng dành cho ${target.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          <span className="wish-letter-card__heart" aria-hidden="true">♡</span>
          <p className="wish-letter-card__title script">
            {isTeacher ? "Kính chúc cô" : "Chúc mừng 20/10 ♡"}
          </p>
          <p className="wish-letter-card__to">
            {isTeacher ? "Cô Hoàng Thị Hoa" : target.name}
          </p>
          <div className="wish-letter-card__body" aria-live="polite">
            {typed.split(" ").map((word, wi, all) => (
              <span className="w" key={`${wi}-${word}`}>
                {word}
                {wi < all.length - 1 ? " " : ""}
              </span>
            ))}
            {typed.length < wish.length && <span className="wish-caret" aria-hidden="true" />}
          </div>
          <p className="wish-letter-card__sign">{target.signature}</p>
          <div className="wish-letter-card__actions">
            <button type="button" className="wish-letter-card__again" onClick={nextWish}>
              ↺ Lời chúc khác
            </button>
            <button type="button" className="wish-letter-card__send" onClick={sendLove}>
              Gửi yêu thương 💗
            </button>
            <button type="button" className="wish-letter-card__close" onClick={close}>
              Đóng thiệp ×
            </button>
          </div>
        </article>
      )}
    </div>
  );
}
