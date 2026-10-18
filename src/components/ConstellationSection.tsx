// Section 3.5 — Chòm sao 11B7: 16 ngôi sao nối thành trái tim, chạm để mở lời chúc.
import { useEffect, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { makeGirlTarget, type WishTarget } from "../data/wishes";
import { audio } from "../lib/audio";
import { burst } from "../lib/fx";
import { givenName } from "../lib/nameUtils";
import { clamp } from "../lib/utils";
import NameWish from "./NameWish";
import { usePhoto } from "../hooks/usePhoto";

const STARS = CONFIG.girls.map((name, index) => {
  const t = (index / CONFIG.girls.length) * Math.PI * 2;
  const x = 16 * Math.sin(t) ** 3;
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return {
    name,
    // Chuẩn hóa vào khoảng 12–88% để nhãn tên không chạm mép.
    left: 12 + ((x + 16) / 32) * 76,
    top: 14 + ((12 - y) / 29) * 72,
    twinkle: (index % 7) * 0.4,
  };
});

function StarPhoto({ name }: { name: string }) {
  const { ok, photo } = usePhoto(name, "thumb");
  if (!ok || !photo?.url) return <span className="constellation-star__core" aria-hidden="true" />;
  return (
    <span className="constellation-star__photo" aria-hidden="true">
      <img src={photo.url} alt="" loading="lazy" decoding="async" draggable={false} />
    </span>
  );
}

export default function ConstellationSection({ onOverlayChange }: { onOverlayChange?: (open: boolean) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<WishTarget | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef({ active: false, x: 0, y: 0, rx: 0, ry: 0 });
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    onOverlayChange?.(!!target);
    document.body.classList.toggle("no-scroll", !!target);
  }, [onOverlayChange, target]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const apply = () => {
      el.style.setProperty("--rx", `${drag.current.rx.toFixed(2)}deg`);
      el.style.setProperty("--ry", `${drag.current.ry.toFixed(2)}deg`);
    };
    const down = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("button")) return;
      drag.current = { ...drag.current, active: true, x: event.clientX, y: event.clientY };
      el.setPointerCapture?.(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      drag.current.ry = clamp(drag.current.ry + dx * 0.22, -16, 16);
      drag.current.rx = clamp(drag.current.rx - dy * 0.14, -12, 12);
      drag.current.x = event.clientX;
      drag.current.y = event.clientY;
      apply();
    };
    const up = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      drag.current.rx = 0;
      drag.current.ry = 0;
      el.style.transition = "transform 1.1s cubic-bezier(0.16,1,0.3,1)";
      apply();
      window.setTimeout(() => {
        if (el) el.style.transition = "";
      }, 1150);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const open = (name: string, event: React.MouseEvent<HTMLButtonElement>) => {
    audio.resume();
    audio.sfx("star");
    audio.sfx("chime");
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(14);
      } catch {
        /* bỏ qua */
      }
    }
    const rect = event.currentTarget.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, {
      count: 16,
      shapes: ["star", "spark", "heart"],
      speedMax: 180,
      gravity: 20,
      sizeScale: 0.75,
    });
    setSelected(name);
    window.setTimeout(() => setTarget(makeGirlTarget(name)), 220);
  };

  return (
    <section className="section constellation" id="constellation" ref={sectionRef} data-theme-anchor data-mood="wishes" aria-labelledby="constellation-title">
      <div className="wrap">
        <header className="constellation-head">
          <span className="pill reveal constellation-pill"><span className="pill__dot" /> 02.5 · Chòm sao của lớp</span>
          <h2 className="section-title reveal" id="constellation-title" style={{ ["--d" as string]: "0.06s" }}>
            Chòm sao <span className="script constellation-script">11B7</span>
          </h2>
          <p className="lead reveal" style={{ ["--d" as string]: "0.12s" }}>
            Mười sáu ngôi sao, mỗi bạn một vì tinh tú. Chạm vào một ngôi sao để nhận lá thư riêng — hoặc kéo nhẹ để xoay cả bầu trời.
          </p>
        </header>

        <div className="constellation-stage reveal reveal--scale" style={{ ["--d" as string]: "0.14s" }}>
          <div className="constellation-sky" aria-hidden="true">
            {Array.from({ length: 48 }, (_, i) => (
              <span
                key={i}
                style={{
                  left: `${(i * 37 + 9) % 98}%`,
                  top: `${(i * 53 + 5) % 94}%`,
                  animationDelay: `${(i % 9) * 0.4}s`,
                  width: `${1 + (i % 3) * 0.6}px`,
                  height: `${1 + (i % 3) * 0.6}px`,
                }}
              />
            ))}
            <span className="constellation-shooting" />
            <span className="constellation-shooting constellation-shooting--two" />
          </div>

          <div className="constellation-rotor" ref={stageRef}>
            <svg className="constellation-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                points={STARS.map((star) => `${star.left},${star.top}`).join(" ")}
                fill="none"
                stroke="rgba(255, 221, 240, 0.5)"
                strokeWidth="0.25"
                strokeDasharray="1.4 1.2"
              />
            </svg>
            {STARS.map((star, index) => (
              <button
                type="button"
                className={`constellation-star${selected === star.name ? " is-active" : ""}`}
                key={star.name}
                style={{
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  ["--delay" as string]: `${star.twinkle}s`,
                  ["--i" as string]: index,
                }}
                onClick={(event) => open(star.name, event)}
                aria-label={`Mở lời chúc dành cho ${star.name}`}
              >
                <StarPhoto name={star.name} />
                <span className="constellation-star__halo" aria-hidden="true" />
                <span className="constellation-star__name">
                  {givenName(star.name)}
                </span>
              </button>
            ))}
            <span className="constellation-heart" aria-hidden="true">♡</span>
          </div>

          <p className="constellation-hint">
            <span aria-hidden="true">✨</span> Chạm vào một ngôi sao để đọc thư
          </p>
        </div>
      </div>

      {target && <NameWish target={target} onClose={() => setTarget(null)} />}
    </section>
  );
}
