// Section 0 — màn hình hộp quà, đồng thời là lần chạm đầu tiên khởi tạo âm thanh.
import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { audio } from "../lib/audio";
import { burst, petalRain } from "../lib/fx";
import { prefersReducedMotion } from "../lib/loop";
import { Teddy } from "./art/FlowerArt";

type Props = { onReveal: () => void; onDone: () => void };

const SPARKS = [
  { left: "8%", top: "20%", delay: 0 },
  { left: "88%", top: "30%", delay: 1.2 },
  { left: "16%", top: "72%", delay: 2.1 },
  { left: "80%", top: "76%", delay: 0.6 },
  { left: "50%", top: "8%", delay: 1.7 },
  { left: "94%", top: "56%", delay: 2.6 },
];

export default function GiftScreen({ onReveal, onDone }: Props) {
  const [opening, setOpening] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const boxRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const openGift = useCallback(() => {
    if (opening) return;
    setOpening(true);
    audio.init();
    audio.setMood("hero");
    window.setTimeout(() => audio.sfx("sparkle"), 120);
    audio.sfx("chime");
    audio.sfx("whoosh");
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([18, 50, 24]);
      } catch {
        /* thiết bị không hỗ trợ */
      }
    }
    const rect = boxRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height * 0.42 : window.innerHeight * 0.55;
    burst(x, y, { count: 80, sizeMax: 16, speedMax: 460, lift: 160 });
    window.setTimeout(() => {
      burst(x, y - 30, {
        count: prefersReducedMotion() ? 10 : 46,
        shapes: ["heart", "petal", "star"],
        speedMax: 320,
        lift: 220,
        gravity: 120,
      });
      petalRain({ count: 12, colors: ["#FFC8DD", "#FFE3EC", "#D9C7FF", "#FFF1B8"] });
    }, 260);
    timers.current.push(
      window.setTimeout(() => {
        setLeaving(true);
        onReveal();
      }, 950),
      window.setTimeout(() => onDone(), 1550),
    );
  }, [onDone, onReveal, opening]);

  return (
    <section
      className={`gift-screen${opening ? " is-opening" : ""}${leaving ? " is-leaving" : ""}`}
      aria-label="Món quà ngày 20/10 dành tặng các bạn nữ lớp 11B7"
    >
      <div className="gift-orb gift-orb--one" aria-hidden="true" />
      <div className="gift-orb gift-orb--two" aria-hidden="true" />
      <div className="gift-petals" aria-hidden="true">
        {SPARKS.map((spark, index) => (
          <span
            key={index}
            className={`gift-petal gift-petal--${index % 3}`}
            style={{ left: spark.left, top: spark.top, animationDelay: `${spark.delay}s` }}
          >
            {index % 2 === 0 ? "✿" : "♥"}
          </span>
        ))}
      </div>

      <header className="gift-header">
        <span className="gift-header__logo">
          <span aria-hidden="true">❀</span> {CONFIG.className}
        </span>
        <span className="gift-header__date">20 · 10 · {CONFIG.year}</span>
      </header>

      <div className="gift-main">
        <div className="gift-copy">
          <p className="gift-eyebrow">
            <span aria-hidden="true">✦</span> Một món quà nhỏ xinh <span aria-hidden="true">✦</span>
          </p>
          <p className="gift-script script">Gửi 16 cô gái của</p>
          <h1 className="gift-title">
            11<span>B7</span>
          </h1>
          <p className="gift-sub">Nhân ngày Phụ nữ Việt Nam 20/10</p>
          <div className="gift-badge">
            <span aria-hidden="true">💌</span> made with thương thương, by cả lớp
          </div>
        </div>

        <div className="gift-visual">
          <div className="gift-halo" aria-hidden="true">
            <span className="gift-halo__ring" />
            <span className="gift-halo__ring gift-halo__ring--dashed" />
            <span className="gift-halo__dots" />
          </div>
          <div className="gift-teddy" aria-hidden="true">
            <Teddy />
          </div>
          <button
            type="button"
            className="gift-box"
            ref={boxRef}
            onClick={openGift}
            aria-label="Chạm để mở quà"
          >
            <span className="gift-box__shadow" aria-hidden="true" />
            <span className="gift-box__lid" aria-hidden="true">
              <span className="gift-bow">
                <span className="gift-bow__loop gift-bow__loop--left" />
                <span className="gift-bow__loop gift-bow__loop--right" />
                <span className="gift-bow__knot" />
                <span className="gift-bow__tail gift-bow__tail--left" />
                <span className="gift-bow__tail gift-bow__tail--right" />
              </span>
            </span>
            <span className="gift-box__body" aria-hidden="true">
              <span className="gift-box__ribbon gift-box__ribbon--v" />
              <span className="gift-box__ribbon gift-box__ribbon--h" />
              <span className="gift-box__label">
                <span>11B7</span>
                <em>with love</em>
              </span>
            </span>
            <span className="gift-box__shine" aria-hidden="true" />
            <span className="gift-box__spark gift-box__spark--1" aria-hidden="true">✦</span>
            <span className="gift-box__spark gift-box__spark--2" aria-hidden="true">✧</span>
            <span className="gift-box__spark gift-box__spark--3" aria-hidden="true">✦</span>
            <span className="gift-box__spark gift-box__spark--4" aria-hidden="true">✧</span>
          </button>
          <div className="gift-burst-flowers" aria-hidden="true">
            <span>🌷</span>
            <span>🌼</span>
            <span>🌸</span>
            <span>💗</span>
            <span>🌺</span>
          </div>
        </div>

        <div className="gift-instruction">
          <button type="button" className={`gift-cta${opening ? " is-opened" : ""}`} onClick={openGift}>
            <span className="gift-cta__gift" aria-hidden="true">🎁</span>
            <span>{opening ? "Mở quà nha…" : "Chạm để mở quà"}</span>
            <span className="gift-cta__arrow" aria-hidden="true">→</span>
          </button>
          <p className="gift-note">
            {opening ? "Quà đang bung nắp… 🌸" : "Bọn tớ chuẩn bị cái này lâu rồi đó nha"}
          </p>
        </div>
      </div>

      <footer className="gift-footer">
        <span aria-hidden="true">🌷</span>
        <span>{CONFIG.senderName} gửi tặng</span>
        <span aria-hidden="true">🌷</span>
      </footer>
    </section>
  );
}
