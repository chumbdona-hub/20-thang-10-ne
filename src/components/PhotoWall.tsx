// Bức tường kỷ niệm: polaroid rơi vào khi cuộn tới, kéo được bằng Pointer Events.
import { useEffect, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { audio } from "../lib/audio";
import { givenName } from "../lib/nameUtils";
import { useAlbum } from "../hooks/useAlbum";
import { makeGirlTarget, type WishTarget } from "../data/wishes";
import NameWish from "./NameWish";

const SAMPLE = CONFIG.girls.slice(0, 6);
const TAPES = ["#ffd7e4", "#ffeec4", "#e3d6ff", "#cdeedd", "#ffd9c7", "#d7e9ff"];
const ROT = [-4.5, 3.2, -2.4, 5.1, -5.4, 2.1, 4.3, -3.6, 1.6, -1.8, 3.8, -4.8, 2.8, -2.9, 4.9, -3.9];

export default function PhotoWall() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<WishTarget | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragRef = useRef({ active: false, name: "", startX: 0, startY: 0, dx: 0, dy: 0, moved: 0, grabbing: false });

  const { settled, available } = useAlbum(CONFIG.girls, visible);
  const shown = settled && available.length ? available : [];
  const fallback = !settled || !available.length;
  const cards = fallback ? SAMPLE.map((name) => ({ name, photo: null })) : shown.map((item) => ({ name: item.name, photo: item.photo }));

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setVisible(true);
          audio.sfx("photo-in");
        });
      },
      { rootMargin: "220px 0px", threshold: 0.06 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const down = (event: React.PointerEvent<HTMLButtonElement>, name: string) => {
    dragRef.current = { active: true, name, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, moved: 0, grabbing: false };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const move = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragRef.current;
    if (!state.active) return;
    state.dx = event.clientX - state.startX;
    state.dy = event.clientY - state.startY;
    state.moved = Math.max(state.moved, Math.abs(state.dx) + Math.abs(state.dy));
    if (!state.grabbing && state.moved > 10) {
      state.grabbing = true;
      setDragging(state.name);
    }
    if (!state.grabbing) return;
    const card = event.currentTarget as HTMLElement;
    card.style.transform = "translate3d(" + state.dx + "px," + (state.dy * 0.35) + "px,0) rotate(" + state.dx * 0.05 + "deg) scale(1.05)";
  };

  const up = (event: React.PointerEvent<HTMLButtonElement>, name: string) => {
    const state = dragRef.current;
    const card = event.currentTarget as HTMLElement;
    card.style.transform = "";
    dragRef.current = { ...state, active: false };
    setDragging(null);
    if (state.moved < 6) {
      audio.resume();
      audio.sfx("star");
      setTarget(makeGirlTarget(name));
    } else {
      audio.sfx("swish");
    }
  };

  return (
    <section className="section photo-wall" id="photo-wall" ref={sectionRef} data-theme-anchor data-mood="girls" aria-labelledby="photo-wall-title">
      <div className="wrap">
        <header className="photo-wall__head">
          <span className="pill reveal"><span className="pill__dot" /> Kỷ niệm của lớp</span>
          <h2 className="section-title reveal" id="photo-wall-title" style={{ ["--d" as string]: "0.06s" }}>
            Bức tường kỷ niệm <span aria-hidden="true">📌</span>
          </h2>
          <p className="lead reveal" style={{ ["--d" as string]: "0.12s" }}>
            Những tấm ảnh nhỏ xinh được ghim lại cho ngày 20/10. Kéo nhẹ để xê dịch, chạm để mở lá thư riêng.
          </p>
        </header>

        <div className={`photo-wall__board${fallback ? " is-sample" : ""}`}>
          <span className="photo-wall__pin" aria-hidden="true" />
          <div className="photo-wall__grid">
            {cards.map((card, index) => (
              <button
                type="button"
                className={"polaroid" + (dragging === card.name ? " is-dragging" : "")}
                key={card.name + "-" + index}
                style={{ ["--rot" as string]: ROT[index % ROT.length] + "deg", ["--delay" as string]: (index % 8) * 0.08 + "s", ["--tape" as string]: TAPES[index % TAPES.length] }}
                onPointerDown={(event) => down(event, card.name)}
                onPointerMove={move}
                onPointerUp={(event) => up(event, card.name)}
                onPointerCancel={(event) => up(event, card.name)}
                aria-label={`Mở lời chúc của ${card.name}`}
              >
                <span className="polaroid__tape" aria-hidden="true" />
                <span className="polaroid__photo">
                  <PhotoSlot name={card.name} src={card.photo ? card.photo.url || "" : ""} />
                </span>
                <span className="polaroid__caption">
                  <span className="polaroid__name">{givenName(card.name)}</span>
                  <span className="polaroid__date">20 · 10</span>
                </span>
              </button>
            ))}
          </div>
          {!settled && <p className="photo-wall__loading">đang rửa ảnh…</p>}
          {settled && !available.length && (
            <p className="photo-wall__hint">
              <span aria-hidden="true">📷</span> Ảnh sẽ được ghim lên đây ngay khi cả lớp gửi đủ — tạm thời là những tấm thiệp chờ.
            </p>
          )}
        </div>
      </div>
      {target && <NameWish target={target} onClose={() => setTarget(null)} />}
    </section>
  );
}

function PhotoSlot({ name, src }: { name: string; src: string }) {
  const initials = (name.trim().split(/\s+/).pop() || name).charAt(0);
  if (!src) {
    return (
      <span className="photo-slot photo-slot--empty" aria-label={name}>
        <span className="photo-slot__flower" aria-hidden="true">✿</span>
        <span className="photo-slot__initial" aria-hidden="true">{initials}</span>
      </span>
    );
  }
  return (
    <span className="photo-slot" aria-label={name}>
      <img src={src} alt={name} loading="lazy" decoding="async" draggable={false} />
    </span>
  );
}
