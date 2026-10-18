// Section 1 — intro 20/10 với hoa 3D SVG, gấu nhỏ, bướm và thiệp mời xem "cảnh phim".
import { useCallback, useRef, useState } from "react";
import { audio } from "../lib/audio";
import { burst } from "../lib/fx";
import { clamp } from "../lib/utils";
import { Balloon, Butterfly, MiniFlower, Rose, Teddy } from "./art/FlowerArt";

type Props = { onOpenCinema: () => void };

export default function Hero({ onOpenCinema }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const flowerRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, spin: 0, moved: 0 });
  const [pressed, setPressed] = useState(false);

  const setTilt = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    if (!stage || !tilt || drag.current.active) return;
    const rect = stage.getBoundingClientRect();
    const nx = clamp((event.clientX - rect.left) / rect.width, 0, 1) - 0.5;
    const ny = clamp((event.clientY - rect.top) / rect.height, 0, 1) - 0.5;
    tilt.style.setProperty("--ry", `${(nx * 14).toFixed(2)}deg`);
    tilt.style.setProperty("--rx", `${(-ny * 10).toFixed(2)}deg`);
  }, []);

  const resetTilt = useCallback(() => {
    const tilt = tiltRef.current;
    if (!tilt) return;
    tilt.style.setProperty("--ry", "0deg");
    tilt.style.setProperty("--rx", "0deg");
  }, []);

  const boing = useCallback((clientX?: number, clientY?: number) => {
    audio.resume();
    audio.sfx("boing");
    audio.sfx("sparkle");
    const flower = flowerRef.current;
    const rect = flower?.getBoundingClientRect();
    const x = clientX ?? (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
    const y = clientY ?? (rect ? rect.top + rect.height * 0.36 : window.innerHeight / 2);
    burst(x, y, {
      count: 26,
      shapes: ["petal", "heart", "spark"],
      colors: ["#FF9DBB", "#FFD0E0", "#FFF1C9", "#D9C7FF"],
      speedMax: 240,
      lift: 30,
      gravity: 80,
      sizeMax: 12,
    });
    setPressed(true);
    window.setTimeout(() => setPressed(false), 520);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { active: true, startX: event.clientX, spin: drag.current.spin, moved: 0 };
    (event.currentTarget as HTMLDivElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const delta = event.clientX - drag.current.startX;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(delta));
    drag.current.spin = drag.current.spin + 0;
    const spin = drag.current.spin + delta * 0.6;
    const scene = event.currentTarget;
    scene.style.setProperty("--spin", `${spin.toFixed(2)}deg`);
    scene.dataset.spin = String(spin);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const moved = drag.current.moved;
    const spin = Number(event.currentTarget.dataset.spin ?? drag.current.spin);
    drag.current = { active: false, startX: 0, spin, moved: 0 };
    const scene = event.currentTarget;
    scene.style.setProperty("--spin", `${(spin % 360).toFixed(2)}deg`);
    if (moved < 8) boing(event.clientX, event.clientY);
  };

  return (
    <section className="hero" id="intro" data-theme-anchor data-mood="hero" aria-labelledby="hero-title">
      <div className="hero__arch" aria-hidden="true" />
      <div className="hero-shell">
        <div className="hero-copy">
          <span className="pill hero-eyebrow hero-in hero-in--1">
            <span className="pill__dot" /> 20 · 10 · Ngày của những cô gái
          </span>
          <p className="hero-hi script hero-in hero-in--2">Chúc mừng</p>
          <h1 className="hero-title hero-in hero-in--3" id="hero-title">
            <span className="hero-title__glint">20</span>
            <span className="hero-title__slash">/</span>
            <span className="hero-title__glint">10</span>
          </h1>
          <p className="hero-sub hero-in hero-in--4">
            Gửi các cô gái xinh đẹp của lớp <em>11B7</em> 💐
          </p>
          <a className="hero-scroll" href="#letter" aria-label="Cuộn xuống phần lá thư">
            <span>Cuộn xuống nhé</span>
            <span className="hero-scroll__arrow" aria-hidden="true">↓</span>
          </a>
        </div>

        <div
          className="hero-visual hero-in hero-in--4"
          ref={stageRef}
          onPointerMove={setTilt}
          onPointerLeave={resetTilt}
        >
          <span className="flower-float flower-float--daisy" aria-hidden="true">
            <MiniFlower variant="daisy" />
          </span>
          <span className="flower-float flower-float--tulip" aria-hidden="true">
            <MiniFlower variant="tulip" />
          </span>
          <span className="flower-float flower-float--sun" aria-hidden="true">
            <MiniFlower variant="sunflower" />
          </span>
          <span className="flower-float flower-float--bud" aria-hidden="true">
            <MiniFlower variant="bud" />
          </span>
          <Balloon className="balloon--one" color="#FF9DBB" />
          <Balloon className="balloon--two" color="#D9C7FF" />
          <span className="hero-butterfly" aria-hidden="true">
            <Butterfly />
          </span>
          <span className="hero-teddy" aria-hidden="true">
            <Teddy />
          </span>

          <div className="hero-flower-tilt" ref={tiltRef}>
            <div
              className={`rose-scene${pressed ? " is-pressed" : ""}`}
              ref={flowerRef}
              role="button"
              tabIndex={0}
              aria-label="Bông hoa 3D. Kéo sang hai bên để xoay, chạm để hoa rung và bung cánh."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  boing();
                }
              }}
            >
              <Rose bloomKey={pressed ? 1 : 0} />
            </div>
          </div>
          <span className="hero-flower-hint" aria-hidden="true">
            kéo để xoay hoa ↔
          </span>
        </div>
      </div>

      <div className="hero-invite-row">
        <aside className="invite-card hero-in hero-in--6" aria-label="Lời mời xem màn hình ngang">
          <span className="invite-stamp" aria-hidden="true">💌</span>
          <div className="invite-copy">
            <p className="invite-kicker">Một chút bất ngờ · xem bằng loa ngoài nha</p>
            <h2 className="invite-title">Có một bất ngờ dành cho các bạn 💌</h2>
            <p className="invite-text">
              Bọn tớ làm hẳn một &ldquo;cảnh phim&rdquo; nhỏ. Xoay ngang máy, đeo tai nghe và xem
              cùng nhau nhé.
            </p>
          </div>
          <button type="button" className="btn btn--primary" onClick={onOpenCinema}>
            Xem ngay <span className="btn__icon" aria-hidden="true">→</span>
          </button>
        </aside>
      </div>

      <div className="boundary-clouds" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
