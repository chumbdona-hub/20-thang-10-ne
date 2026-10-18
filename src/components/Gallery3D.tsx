// Phòng triển lãm 3D: trụ ảnh xoay, kéo/vuốt có quán tính; khung trước mở lời chúc.
import { useEffect, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { audio } from "../lib/audio";
import { givenName } from "../lib/nameUtils";
import { isLite } from "../lib/perf";
import { useAlbum } from "../hooks/useAlbum";
import { makeGirlTarget, type WishTarget } from "../data/wishes";
import NameWish from "./NameWish";

export default function Gallery3D() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rotorRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);
  const [target, setTarget] = useState<WishTarget | null>(null);
  const rotation = useRef(0);
  const drag = useRef({ active: false, x: 0, startRot: 0, vx: 0, idle: 0 });
  const { items, settled } = useAlbum(CONFIG.girls, visible);
  const lite = isLite();
  const total = Math.max(1, CONFIG.girls.length);
  const angleStep = 360 / total;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    setVisible(true);
    if (typeof IntersectionObserver === "undefined") return;
    let inView = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        inView = entry.isIntersecting;
        if (inView) audio.sfx("swish");
      });
    }, { rootMargin: "180px", threshold: 0.05 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      inView = false;
    };
  }, []);

  useEffect(() => {
    const rotor = rotorRef.current;
    const stage = stageRef.current;
    if (!rotor || !stage) return;
    let raf = 0;
    let running = true;
    let last = 0;
    let frames = 0;
    const measure = () => {
      const width = stage.clientWidth || 360;
      const cardW = Math.max(108, Math.min(176, width * 0.3));
      const radius = Math.round((cardW / 2) / Math.tan(Math.PI / total));
      rotor.style.setProperty("--radius", radius + "px");
      rotor.style.setProperty("--card-w", cardW + "px");
    };
    measure();
    const loop = (time: number) => {
      if (!running) return;
      raf = window.requestAnimationFrame(loop);
      if (document.hidden) return;
      const dt = last ? Math.min(48, time - last) : 16;
      last = time;
      frames += 1;
      const state = drag.current;
      if (!state.active) {
        state.idle += dt;
        if (!state.vx && (state.idle > 2200 || total > 0)) rotation.current += dt * (lite ? 0.004 : 0.008);
        rotation.current += state.vx;
        state.vx *= 0.93;
        if (Math.abs(state.vx) < 0.004) state.vx = 0;
      }
      rotor.style.transform = "translateZ(calc(var(--radius) * -1)) rotateY(" + rotation.current.toFixed(3) + "deg)";
      const index = ((Math.round(-rotation.current / angleStep) % total) + total) % total;
      if (frames % 6 === 0) setActive(index);
    };
    raf = window.requestAnimationFrame(loop);
    const onResize = () => measure();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [angleStep, lite, total]);

  const onDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("button")) return;
    drag.current = { ...drag.current, active: true, x: event.clientX, startRot: rotation.current };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state.active) return;
    const dx = event.clientX - state.x;
    state.x = event.clientX;
    state.vx = dx * 0.18;
    rotation.current += dx * 0.28;
    state.idle = 0;
  };

  const onUp = () => {
    drag.current = { ...drag.current, active: false, idle: 0 };
  };

  const open = (event: React.MouseEvent<HTMLButtonElement>, name: string, index: number) => {
    event.stopPropagation();
    audio.resume();
    const front = ((Math.round(-rotation.current / angleStep) % total) + total) % total;
    if (index !== front) {
      audio.sfx("swish");
      rotation.current = -index * angleStep;
      drag.current.vx = 0;
      return;
    }
    audio.sfx("star");
    setTarget(makeGirlTarget(name));
  };

  return (
    <section className="section gallery3d" id="gallery" ref={sectionRef} data-theme-anchor data-mood="wishes" aria-labelledby="gallery-title">
      <div className="wrap">
        <header className="gallery3d__head">
          <span className="pill reveal"><span className="pill__dot" /> Triển lãm nhỏ</span>
          <h2 className="section-title reveal" id="gallery-title" style={{ ["--d" as string]: "0.06s" }}>
            Phòng triển lãm của 11B7 <span aria-hidden="true">🖼️</span>
          </h2>
          <p className="lead reveal" style={{ ["--d" as string]: "0.12s" }}>
            Vuốt để xoay phòng, chạm vào khung đang ở phía trước để mở lời chúc. Ảnh thật sẽ tự xuất hiện khi được thêm vào.
          </p>
        </header>

        <div
          className="gallery3d__stage"
          ref={stageRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
        >
          <div className="gallery3d__ambient" aria-hidden="true" />
          <div className="gallery3d__floor" aria-hidden="true" />
          <div className="gallery3d__camera">
            <div className="gallery3d__rotor" ref={rotorRef}>
              {CONFIG.girls.map((name, index) => {
                const item = items.find((entry) => entry.name === name);
                const photoUrl = item && item.photo ? item.photo.url || "" : "";
                return (
                  <button
                    type="button"
                    className={"gallery-frame" + (index === active ? " is-front" : "") + (Math.abs(index - active) > total / 2 ? " is-back" : "")}
                    key={name}
                    style={{ transform: "rotateY(" + index * angleStep + "deg) translateZ(var(--radius))" }}
                    onClick={(event) => open(event, name, index)}
                    aria-label={"Xem khung ảnh của " + name}
                  >
                    <span className="gallery-frame__inner">
                      {photoUrl ? (
                        <img src={photoUrl} alt={name} loading="lazy" decoding="async" draggable={false} />
                      ) : (
                        <span className="gallery-frame__placeholder">
                          <span aria-hidden="true">✿</span>
                          <strong>{(name.trim().split(/\s+/).pop() || name).charAt(0)}</strong>
                        </span>
                      )}
                      <span className="gallery-frame__shine" aria-hidden="true" />
                    </span>
                    <span className="gallery-frame__label">{givenName(name)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {!settled && <p className="gallery3d__hint">đang treo ảnh lên tường…</p>}
          <p className="gallery3d__front-name script">{givenName(CONFIG.girls[active] || "11B7")}</p>
        </div>
      </div>
      {target && <NameWish target={target} onClose={() => setTarget(null)} />}
    </section>
  );
}
