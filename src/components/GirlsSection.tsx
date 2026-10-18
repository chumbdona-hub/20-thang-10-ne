// Section 3 — 16 thẻ tên. Mỗi thẻ mở một lời nhắn riêng và GIỮ NGUYÊN cho tới khi
// người xem bấm "Gấp lại" — không tự đóng, không phụ thuộc backface-visibility của trình duyệt.
import { useEffect, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { audio } from "../lib/audio";
import { burst } from "../lib/fx";
import { createBag, firstName, initialsOf, type ShuffleBag } from "../lib/utils";

const STICKERS = ["🌸", "🌷", "✨", "🦋", "🌼", "💗", "🫧", "🌙", "🍓", "🧁", "🎀", "🪐", "🌻", "☁️", "💌", "⭐"];
const TONES = ["rose", "butter", "lilac", "mint", "peach", "sky"] as const;
const FLIP_MS = 560;
const SWAP_MS = 250;

function GirlCard({ name, index }: { name: string; index: number }) {
  const [open, setOpen] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [message, setMessage] = useState<string>(CONFIG.messages[index % CONFIG.messages.length]);
  const bagRef = useRef<ShuffleBag<string> | null>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  if (!bagRef.current) bagRef.current = createBag<string>(CONFIG.messages);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const centerOf = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  const openCard = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (open || flipping) return;
    const next = bagRef.current?.next();
    if (next) setMessage(next);
    audio.resume();
    audio.sfx("sparkle");
    audio.sfx("wish-arrive", index);
    const { x, y } = centerOf(event.currentTarget);
    burst(x, y, {
      count: 16,
      shapes: ["heart", "petal", "spark"],
      speedMax: 200,
      gravity: 90,
      sizeScale: 0.8,
    });
    setFlipping(true);
    timers.current.push(
      window.setTimeout(() => setOpen(true), SWAP_MS),
      window.setTimeout(() => setFlipping(false), FLIP_MS),
    );
  };

  const closeCard = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!open || flipping) return;
    audio.sfx("pop");
    const { x, y } = centerOf(event.currentTarget);
    burst(x, y, {
      count: 8,
      shapes: ["petal", "star"],
      speedMax: 120,
      gravity: 60,
      sizeScale: 0.6,
    });
    setFlipping(true);
    timers.current.push(
      window.setTimeout(() => setOpen(false), SWAP_MS),
      window.setTimeout(() => setFlipping(false), FLIP_MS),
    );
  };

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (flipping) return;
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width;
    const ny = (event.clientY - rect.top) / rect.height;
    el.style.setProperty("--ty", `${((nx - 0.5) * 10).toFixed(2)}deg`);
    el.style.setProperty("--tx", `${((0.5 - ny) * 10).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(nx * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(ny * 100).toFixed(1)}%`);
  };

  const reset = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.setProperty("--ty", "0deg");
    el.style.setProperty("--tx", "0deg");
  };

  const label = firstName(name);
  const rest = name.slice(0, Math.max(0, name.lastIndexOf(" ")));

  return (
    <div
      className={`girl-card reveal ${open ? "is-open" : ""} ${flipping && !open ? "is-closing" : ""} ${flipping ? "is-flipping" : ""} tone-${TONES[index % TONES.length]}`}
      style={{ ["--d" as string]: `${Math.min(index, 11) * 0.055}s` }}
    >
      <div
        className="girl-tilt"
        ref={tiltRef}
        onPointerMove={onMove}
        onPointerLeave={reset}
        onPointerCancel={reset}
      >
        <div className="girl-inner">
          {!open ? (
            <button
              type="button"
              className="girl-face girl-face--front"
              onClick={openCard}
              aria-label={`${name}. Mở lời nhắn dành cho bạn`}
              aria-expanded={false}
            >
              <span className="girl-sheen" aria-hidden="true" />
              <span className="girl-sparkle girl-sparkle--a" aria-hidden="true">✦</span>
              <span className="girl-sparkle girl-sparkle--b" aria-hidden="true">✧</span>
              <span className="girl-sticker" aria-hidden="true">
                {STICKERS[index % STICKERS.length]}
              </span>
              <span className="girl-avatar">
                <span className="girl-avatar__halo" aria-hidden="true" />
                <span className="girl-avatar__initials">{initialsOf(name)}</span>
                <span className="girl-avatar__flower" aria-hidden="true">✿</span>
              </span>
              <span className="girl-name">
                {rest && <span className="girl-name__rest">{rest} </span>}
                <strong>{label}</strong>
              </span>
              <span className="girl-tag">cô gái {String(index + 1).padStart(2, "0")}</span>
              <span className="girl-open">
                mở lời nhắn <span aria-hidden="true">→</span>
              </span>
            </button>
          ) : (
            <div className="girl-face girl-face--back" aria-live="polite">
              <span className="girl-back__kicker">Một chút thương từ 11B7</span>
              <span className="girl-back__quote" aria-hidden="true">“</span>
              <span className="girl-back__msg">{message}</span>
              <span className="girl-back__heart" aria-hidden="true">💗</span>
              <span className="girl-back__for">
                gửi <strong>{label}</strong> · thương lắm
              </span>
              <button type="button" className="girl-back__close" onClick={closeCard}>
                Đọc xong rồi, gấp lại ↺
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GirlsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const chimed = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || chimed.current) return;
        chimed.current = true;
        audio.sfx("chime");
      },
      { threshold: 0.16 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="section girls-section"
      id="girls"
      ref={sectionRef}
      data-theme-anchor
      data-mood="girls"
      aria-labelledby="girls-title"
    >
      <span className="section-watermark section-watermark--right" aria-hidden="true">
        16
      </span>
      <div className="wrap">
        <header className="girls-header">
          <span className="pill reveal">
            <span className="pill__dot" /> 02 · Danh sách các bạn nữ
          </span>
          <h2 className="section-title reveal" id="girls-title" style={{ ["--d" as string]: "0.06s" }}>
            Những cô gái của 11B7 <span className="girls-title__emoji" aria-hidden="true">🌸</span>
          </h2>
          <p className="lead reveal" style={{ ["--d" as string]: "0.12s" }}>
            Mười sáu cái tên, mười sáu kiểu rạng rỡ. Chạm vào một tấm thẻ để nhận lời nhắn riêng
            mà bọn tớ đã giấu ở mặt sau nhé.
          </p>
          <p className="girls-readhint reveal" style={{ ["--d" as string]: "0.14s" }}>
            <span aria-hidden="true">⏳</span> Lời nhắn sẽ ở yên đó cho tới khi bạn bấm “Gấp lại” —
            đọc xong, chụp màn hình cũng được nha.
          </p>
          <div className="girls-divider reveal" aria-hidden="true" style={{ ["--d" as string]: "0.18s" }}>
            <span />
            <em>✿</em>
            <span />
          </div>
        </header>

        <div className="girls-grid">
          {CONFIG.girls.map((name, index) => (
            <GirlCard name={name} index={index} key={name} />
          ))}
        </div>

        <p className="girls-footnote reveal">
          <span aria-hidden="true">🫶</span> Không thiếu ai đâu nhé — đủ 16 cô gái của đại gia đình 11B7.
        </p>
      </div>
      <div className="boundary-clouds" aria-hidden="true">
        <span />
        <span />
      </div>
    </section>
  );
}
