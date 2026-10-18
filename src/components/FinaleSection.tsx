// Section 5 — Đoạn kết: hoàng hôn sang đêm sao, lá thư đánh máy và nút gửi bó hoa.
import { useEffect, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { audio } from "../lib/audio";
import { burst, petalRain } from "../lib/fx";
import { onFrame, prefersReducedMotion } from "../lib/loop";
import { Rose, Teddy } from "./art/FlowerArt";
import MovieButton from "./MovieButton";

const STARS = Array.from({ length: 64 }, (_, i) => ({
  left: `${(i * 47 + 13) % 98}%`,
  top: `${(i * 31 + 9) % 88}%`,
  size: `${1 + (i % 3) * 0.7}px`,
  delay: `${(i % 12) * 0.55}s`,
  opacity: 0.3 + (i % 5) * 0.13,
}));

const FIREFLIES = Array.from({ length: 9 }, (_, i) => ({
  left: `${8 + ((i * 23) % 84)}%`,
  top: `${18 + ((i * 37) % 68)}%`,
  delay: `${(i % 6) * 0.9}s`,
}));

const FULL_LETTER = CONFIG.finalLetter.join("\n");

export default function FinaleSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const startedRef = useRef(false);
  const [bloom, setBloom] = useState(false);
  const [typed, setTyped] = useState("");
  const [bouquets, setBouquets] = useState(0);
  const progress = useRef(0);
  const acc = useRef(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setTyped(FULL_LETTER);
      setBloom(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || startedRef.current) return;
        startedRef.current = true;
        setBloom(true);
        audio.sfx("page");
      },
      { threshold: 0.22 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!startedRef.current) return;
    const stop = onFrame((dt) => {
      if (progress.current >= FULL_LETTER.length) return;
      acc.current += dt;
      if (acc.current < 0.03) return;
      acc.current = 0;
      progress.current = Math.min(FULL_LETTER.length, progress.current + 3);
      setTyped(FULL_LETTER.slice(0, progress.current));
    });
    return stop;
  }, [bloom]);

  const sendBouquet = () => {
    audio.resume();
    audio.sfx("bell");
    audio.sfx("sparkle");
    audio.sfx("chime");
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([16, 40, 16, 40, 26]);
      } catch {
        /* thiết bị không hỗ trợ */
      }
    }
    const colors = ["#FFD9E6", "#FFF0B8", "#D9C7FF", "#FFB3D1", "#C9F2DE", "#FF9DBB"];
    const w = window.innerWidth;
    const h = window.innerHeight;
    burst(w * 0.28, h * 0.68, { count: 56, colors, speedMax: 430, lift: 160, sizeMax: 15 });
    window.setTimeout(() => {
      burst(w * 0.74, h * 0.62, { count: 46, colors, speedMax: 380, lift: 190, sizeMax: 13 });
    }, 170);
    window.setTimeout(() => {
      burst(w * 0.5, h * 0.38, { count: 60, colors, speedMax: 460, gravity: 150, sizeMax: 16 });
      petalRain({ count: 16, colors, lifeScale: 1.25, sizeScale: 1.1 });
    }, 350);
    setBouquets((value) => value + 1);
  };

  const lines = typed.split("\n");

  return (
    <section
      className="section finale"
      id="finale"
      ref={sectionRef}
      data-theme-anchor
      data-mood="finale"
      aria-labelledby="finale-title"
    >
      <div className="finale-sky" aria-hidden="true">
        <div className="finale-stars">
          {STARS.map((star, index) => (
            <span
              key={index}
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                animationDelay: star.delay,
                opacity: star.opacity,
              }}
            />
          ))}
        </div>
        <div className="finale-moon" />
        <span className="shooting-star shooting-star--one" />
        <span className="shooting-star shooting-star--two" />
        <div className="finale-fireflies">
          {FIREFLIES.map((firefly, index) => (
            <span
              key={index}
              style={{ left: firefly.left, top: firefly.top, animationDelay: firefly.delay }}
            />
          ))}
        </div>
        <div className="finale-horizon" />
      </div>

      <div className="wrap finale-grid">
        <div className="finale-copy">
          <span className="pill finale-pill reveal">
            <span className="pill__dot" /> 04 · Đoạn kết
          </span>
          <h2 className="finale-title reveal" id="finale-title" style={{ ["--d" as string]: "0.06s" }}>
            Chúc các bạn luôn <span className="script finale-script">xinh đẹp</span>, tự tin và hạnh
            phúc.
          </h2>
          <p className="finale-line reveal" style={{ ["--d" as string]: "0.12s" }}>
            20/10 vui vẻ nhé! <span aria-hidden="true">🌷</span>
          </p>

          <div className="finale-garden reveal" style={{ ["--d" as string]: "0.18s" }}>
            <div className="finale-flower" aria-hidden="true">
              {bloom ? <Rose bloomKey={bouquets + 1} /> : <span className="finale-bud">🌱</span>}
            </div>
            <div className="finale-teddy" aria-hidden="true">
              <Teddy />
              <span className="finale-teddy__bubble script">tạm biệt nha!</span>
            </div>
            <span className="finale-garden__note script">nở lần cuối, thật rạng rỡ 🌸</span>
          </div>

          <div className="finale-actions reveal" style={{ ["--d" as string]: "0.24s" }}>
            <button type="button" className="btn btn--primary finale-button" onClick={sendBouquet}>
              <span aria-hidden="true">💐</span>
              {bouquets ? "Gửi tặng thêm một bó hoa" : "Gửi tặng thêm một bó hoa"}
            </button>
            <MovieButton />
            <span className="finale-bouquet-count" aria-live="polite">
              {bouquets ? `đã gửi ${bouquets} bó hoa rồi đó 💗` : "bấm thử đi, hoa nở liền 🌷"}
            </span>
          </div>

          <div className="finale-links">
            <a href="#intro" className="finale-back">
              <span aria-hidden="true">↑</span> Xem lại từ đầu
            </a>
            <span className="finale-dot" aria-hidden="true" />
            <span>{CONFIG.senderName} · 20.10.{CONFIG.year}</span>
          </div>
        </div>

        <div className="finale-letter-column">
          <article className="finale-letter reveal reveal--scale" style={{ ["--d" as string]: "0.14s" }}>
            <div className="finale-letter__top">
              <span className="finale-letter__crest" aria-hidden="true">
                ✉
              </span>
              <div>
                <p className="finale-letter__kicker">Lá thư cuối · gửi các cậu</p>
                <p className="finale-letter__to script">Gửi các cô gái của 11B7,</p>
              </div>
            </div>
            <div className="finale-letter__body" aria-label={FULL_LETTER}>
              {lines.map((line, index) => (
                <p key={index}>
                  {line}
                  {index === lines.length - 1 && typed.length < FULL_LETTER.length && (
                    <span className="type-cursor" aria-hidden="true" />
                  )}
                </p>
              ))}
              {!typed && <p className="finale-letter__placeholder">Lá thư đang được mở…</p>}
            </div>
            <p className="finale-letter__sign">
              <span aria-hidden="true">—</span> {CONFIG.senderName} <span aria-hidden="true">—</span>
            </p>
            <div className="finale-letter__seal" aria-hidden="true">
              11B7 <span>♡</span>
            </div>
          </article>
          <p className="finale-ps reveal">
            <span aria-hidden="true">P.S.</span> Các cậu cứ là chính mình, phần còn lại để tụi tớ
            lo. <span aria-hidden="true">🫶</span>
          </p>
        </div>
      </div>

      <footer className="finale-footer">
        <span className="finale-footer__line" aria-hidden="true" />
        <p>
          made with <span aria-hidden="true">💗</span> &amp; một chút vụng về, bởi cả lớp 11B7
        </p>
        <span className="finale-footer__line" aria-hidden="true" />
      </footer>
    </section>
  );
}
