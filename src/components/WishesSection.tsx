// Section 4 — Sân khấu "dải ngân hà lời thương": mỗi lúc chỉ MỘT thẻ chữ ở giữa.
import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { audio } from "../lib/audio";
import { burst } from "../lib/fx";
import { onFrame, prefersReducedMotion } from "../lib/loop";
import { createBag } from "../lib/utils";
import { isLite } from "../lib/perf";

type Phase = "arrive" | "hold" | "grow" | "vanish";
type Wish = { id: number; text: string; phase: Phase; lane: number; quick?: boolean };

const ARRIVE = 1550;
const GROW = 720;
const GAP = 280;

const LANES = [
  { sx: "-38vw", sy: "-16vh", rot: "-12deg" },
  { sx: "36vw", sy: "-14vh", rot: "10deg" },
  { sx: "-42vw", sy: "12vh", rot: "-8deg" },
  { sx: "40vw", sy: "16vh", rot: "7deg" },
  { sx: "-20vw", sy: "-24vh", rot: "5deg" },
  { sx: "22vw", sy: "22vh", rot: "-6deg" },
  { sx: "-30vw", sy: "20vh", rot: "9deg" },
  { sx: "32vw", sy: "-22vh", rot: "-9deg" },
];

const FLYING_STARS = [
  { left: "7%", top: "18%", delay: 0.2, size: 16 },
  { left: "88%", top: "26%", delay: 1.6, size: 13 },
  { left: "16%", top: "74%", delay: 2.8, size: 12 },
  { left: "82%", top: "68%", delay: 0.9, size: 17 },
  { left: "50%", top: "8%", delay: 3.5, size: 10 },
  { left: "46%", top: "90%", delay: 2.1, size: 11 },
];

export default function WishesSection() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const cardElRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const wishRef = useRef<Wish | null>(null);
  const deadlineRef = useRef(0);
  const nextSpawnRef = useRef(0);
  const nextIdRef = useRef(0);
  const laneRef = useRef(0);
  const priorityRef = useRef(false);
  const bagRef = useRef(createBag<string>(CONFIG.messages));
  const [card, setCard] = useState<Wish | null>(null);
  const [paused, setPaused] = useState(false);
  const lite = isLite();
  const visibleStars = lite ? FLYING_STARS.slice(0, 4) : FLYING_STARS;
  const dustCount = lite ? 8 : 14;

  const publish = useCallback(() => {
    const state = wishRef.current;
    setCard(state ? { ...state } : null);
  }, []);

  const readingTime = (text: string) => Math.min(2800, Math.max(1800, 1600 + text.length * 42));

  const centerOfCard = () => {
    const rect = cardElRef.current?.getBoundingClientRect();
    const stage = stageRef.current?.getBoundingClientRect();
    const r = rect ?? stage;
    return r
      ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  const spawn = useCallback(
    (now: number) => {
      const text = bagRef.current.next();
      const lane = laneRef.current % LANES.length;
      laneRef.current += 1;
      nextIdRef.current += 1;
      wishRef.current = { id: nextIdRef.current, text, phase: "arrive", lane };
      deadlineRef.current = now + ARRIVE;
      priorityRef.current = false;
      publish();
      audio.sfx("wish-spawn", lane);
    },
    [publish],
  );

  const enterPhase = useCallback(
    (phase: Phase, now: number) => {
      const current = wishRef.current;
      if (!current) return;
      wishRef.current = { ...current, phase };
      if (phase === "hold") {
        deadlineRef.current = now + readingTime(current.text);
        audio.sfx("wish-arrive", current.text.length);
        audio.sfx("sparkle");
      } else if (phase === "grow") {
        deadlineRef.current = now + GROW;
        audio.sfx("wish-grow");
      } else if (phase === "vanish") {
        deadlineRef.current = now + (current.quick ? 300 : 720);
        const { x, y } = centerOfCard();
        burst(x, y, {
          count: prefersReducedMotion() ? 8 : 26,
          shapes: ["spark", "heart", "petal", "star"],
          colors: ["#FFD9E6", "#FFF0B8", "#D9C7FF", "#FFB3D1"],
          speedMin: 30,
          speedMax: 200,
          gravity: 40,
          sizeMax: 10,
        });
        audio.sfx("wish-vanish");
      }
      publish();
    },
    [publish],
  );

  useEffect(() => {
    const stage = stageRef.current;
    const section = sectionRef.current;
    if (!stage || !section) return;
    const stop = onFrame(() => {
      if (!activeRef.current || document.hidden) return;
      const now = performance.now();
      if (now < deadlineRef.current) return;
      const current = wishRef.current;
      if (!current) {
        if (now >= nextSpawnRef.current) spawn(now);
        return;
      }
      if (current.phase === "arrive") enterPhase("hold", now);
      else if (current.phase === "hold") enterPhase("grow", now);
      else if (current.phase === "grow") enterPhase("vanish", now);
      else {
        wishRef.current = null;
        priorityRef.current = false;
        publish();
        nextSpawnRef.current = now + GAP;
        deadlineRef.current = now + GAP;
      }
    });
    return stop;
  }, [enterPhase, publish, spawn]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const setActive = (value: boolean) => {
      activeRef.current = value;
      setPaused(!value);
      if (value) {
        const now = performance.now();
        deadlineRef.current = Math.max(deadlineRef.current, now + 380);
        nextSpawnRef.current = Math.min(nextSpawnRef.current, now + 650);
      }
    };
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setActive(entry.isIntersecting));
      },
      { threshold: 0.12, rootMargin: "12% 0px 12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onStarClick = () => {
    audio.resume();
    audio.sfx("pop");
    const now = performance.now();
    if (!activeRef.current) {
      activeRef.current = true;
      setPaused(false);
    }
    if (!wishRef.current) {
      spawn(now);
      return;
    }
    const current = wishRef.current;
    wishRef.current = { ...current, phase: "vanish", quick: true };
    deadlineRef.current = now + 300;
    priorityRef.current = true;
    publish();
    const { x, y } = centerOfCard();
    burst(x, y, { count: 14, shapes: ["star", "spark"], speedMax: 160, gravity: 30 });
    audio.sfx("wish-vanish");
  };

  const lane = LANES[card?.lane ?? 0] ?? LANES[0];

  return (
    <section
      className="section wishes-section"
      id="wishes"
      ref={sectionRef}
      data-theme-anchor
      data-mood="wishes"
      aria-labelledby="wishes-title"
    >
      <div className="wrap">
        <header className="wishes-header">
          <span className="pill wishes-pill reveal">
            <span className="pill__dot" /> 03 · Điều bọn tớ muốn nói
          </span>
          <h2 className="section-title wishes-title reveal" id="wishes-title" style={{ ["--d" as string]: "0.06s" }}>
            Bay qua một dải ngân hà <span className="script wishes-script">toàn lời thương</span>
          </h2>
          <p className="wishes-hint reveal" style={{ ["--d" as string]: "0.12s" }}>
            chạm vào một vì sao nhỏ nhé <span aria-hidden="true">✨</span>
          </p>
        </header>

        <div
          className={`wish-stage${paused ? " is-paused" : ""}`}
          ref={stageRef}
          aria-label="Dải ngân hà những lời chúc. Mỗi lúc một lời chúc được hiển thị."
        >
          <div className="wish-stage__bg" aria-hidden="true" />
          <div className="wish-galaxy" aria-hidden="true" />
          <div className="wish-orbit wish-orbit--one" aria-hidden="true" />
          <div className="wish-orbit wish-orbit--two" aria-hidden="true" />
          <div className="wish-orbit wish-orbit--three" aria-hidden="true" />
          <div className="wish-stars" aria-hidden="true">
            {Array.from({ length: lite ? 22 : 38 }, (_, i) => (
              <span
                key={i}
                style={{
                  left: `${(i * 37 + 11) % 97}%`,
                  top: `${(i * 53 + 7) % 92}%`,
                  animationDelay: `${(i % 9) * 0.45}s`,
                  width: `${1 + (i % 3)}px`,
                  height: `${1 + (i % 3)}px`,
                  opacity: 0.35 + (i % 5) * 0.11,
                }}
              />
            ))}
          </div>
          <div className="wish-marquee wish-marquee--top" aria-hidden="true">
            <span>
              một chút thương · gửi cậu · 11B7 · thật dịu dàng · một chút thương · gửi cậu · 11B7 ·
              thật dịu dàng ·
            </span>
          </div>
          <div className="wish-marquee wish-marquee--bottom" aria-hidden="true">
            <span>
              Gửi các cô gái 11B7 · một thanh xuân · chúc cậu luôn vui · Gửi các cô gái 11B7 ·
              một thanh xuân ·
            </span>
          </div>
          <div className="wish-petals" aria-hidden="true">
            <span>✿</span>
            <span>♥</span>
            <span>✦</span>
            <span>❀</span>
            <span>✧</span>
          </div>

          {visibleStars.map((star, index) => (
            <button
              type="button"
              className="wish-star"
              key={index}
              onClick={onStarClick}
              aria-label="Gọi ngay một lời thương tới giữa sân khấu"
              style={{
                left: star.left,
                top: star.top,
                animationDelay: `${star.delay}s`,
                fontSize: `${star.size}px`,
              }}
            >
              <span aria-hidden="true">✦</span>
              <span className="wish-star__pulse" aria-hidden="true" />
            </button>
          ))}

          {card && (
            <div
              className={`wish-focus phase-${card.phase}${card.quick ? " is-quick" : ""}`}
              key={card.id}
              ref={cardElRef}
              style={{
                ["--sx" as string]: lane.sx,
                ["--sy" as string]: lane.sy,
                ["--srot" as string]: lane.rot,
              }}
            >
              <span className="wish-focus__star" aria-hidden="true">✦</span>
              <span className="wish-focus__ring" aria-hidden="true" />
              <article className="wish-card">
                <div className="wish-card__halo" aria-hidden="true" />
                <span className="wish-card__sticker" aria-hidden="true">
                  {card.lane % 3 === 0 ? "🌸" : card.lane % 3 === 1 ? "✨" : "💌"}
                </span>
                <p className="wish-card__kicker">Một chút thương từ 11B7</p>
                <p className="wish-card__msg">
                  {card.text.split(" ").map((word, wi) => (
                    <span className="wish-word" key={`${card.id}-w-${wi}`}>
                      {Array.from(word).map((char, ci) => (
                        <span
                          className="wish-letter"
                          key={`${card.id}-c-${wi}-${ci}`}
                          style={{ ["--ci" as string]: wi * 3 + ci }}
                        >
                          {char}
                        </span>
                      ))}
                      {wi < card.text.split(" ").length - 1 ? " " : ""}
                    </span>
                  ))}
                  <span className="wish-card__sheen" aria-hidden="true" />
                </p>
                <span className="wish-card__foot">
                  <span className="wish-card__from script">cả lớp 11B7</span>
                  <span className="wish-card__heart" aria-hidden="true">
                    ♥
                  </span>
                </span>
                <span className="wish-card__ripple" aria-hidden="true" />
                {Array.from({ length: dustCount }, (_, i) => (
                  <span
                    className="wish-dust"
                    key={i}
                    aria-hidden="true"
                    style={{ ["--di" as string]: i }}
                  />
                ))}
              </article>
            </div>
          )}

          <div className="wish-stage__footer" aria-hidden="true">
            <span className="wish-stage__live">
              <span className="wish-stage__live-dot" /> Gửi các cô gái 11B7 · những lời thương đang bay
            </span>
          </div>
        </div>

        <p className="wishes-footnote reveal">
          <span aria-hidden="true">🌌</span> Cứ để mấy lời thương này bay lơ lửng ở đây, khi nào cần
          thì nhặt một cái nhé.
        </p>
      </div>
      <div className="boundary-clouds boundary-clouds--wishes" aria-hidden="true">
        <span />
        <span />
      </div>
    </section>
  );
}
