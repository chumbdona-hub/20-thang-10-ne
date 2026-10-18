// Section 2 — Lời mở đầu: lá thư giấy nghiêng nhẹ, hiện dần theo cuộn.
import { useEffect, useRef } from "react";
import { CONFIG } from "../data/config";
import { audio } from "../lib/audio";
import { MiniFlower } from "./art/FlowerArt";

export default function LetterSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || played.current) return;
          played.current = true;
          audio.sfx("page");
          window.setTimeout(() => audio.sfx("tick"), 550);
          window.setTimeout(() => audio.sfx("tick"), 1050);
        });
      },
      { threshold: 0.24 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="section letter-section"
      id="letter"
      ref={sectionRef}
      data-theme-anchor
      data-mood="letter"
      aria-labelledby="letter-title"
    >
      <span className="section-watermark" aria-hidden="true">
        11B7
      </span>
      <div className="letter-petals" aria-hidden="true">
        {["✿", "♥", "❀", "✦", "✿", "♥"].map((petal, index) => (
          <span
            key={index}
            style={{
              left: `${[6, 20, 78, 90, 42, 66][index]}%`,
              top: `${[18, 64, 12, 52, 8, 78][index]}%`,
              animationDelay: `${index * 1.15}s`,
            }}
          >
            {petal}
          </span>
        ))}
      </div>

      <div className="wrap letter-grid">
        <div className="letter-heading">
          <span className="pill reveal">
            <span className="pill__dot" /> 01 · Lời mở đầu
          </span>
          <h2 className="section-title reveal" id="letter-title" style={{ ["--d" as string]: "0.08s" }}>
            Trước hết, là một chút <span className="script section-script">thật lòng.</span>
          </h2>
          <p className="lead reveal" style={{ ["--d" as string]: "0.16s" }}>
            Không có phông bạt gì đâu, chỉ là bọn tớ muốn nói mấy điều nhỏ xíu mà bình thường hay
            ngại nói. Đọc chậm thôi nhé.
          </p>
          <div className="letter-sign reveal" style={{ ["--d" as string]: "0.22s" }}>
            <span className="letter-sign__line" aria-hidden="true" />
            <span>
              thư của bọn tớ, <em className="script">11B7</em>
            </span>
          </div>
          <div className="letter-bouquet reveal" aria-hidden="true" style={{ ["--d" as string]: "0.28s" }}>
            <span className="letter-bouquet__flower letter-bouquet__flower--1">
              <MiniFlower variant="daisy" />
            </span>
            <span className="letter-bouquet__flower letter-bouquet__flower--2">
              <MiniFlower variant="tulip" />
            </span>
            <span className="letter-bouquet__flower letter-bouquet__flower--3">
              <MiniFlower variant="bud" />
            </span>
            <span className="letter-bouquet__note script">gửi cả bó hoa này 🌷</span>
          </div>
        </div>

        <div className="letter-paper-wrap reveal reveal--scale" style={{ ["--d" as string]: "0.1s" }}>
          <span className="letter-tape letter-tape--left" aria-hidden="true" />
          <span className="letter-tape letter-tape--right" aria-hidden="true" />
          <article className="letter-paper">
            <span className="letter-stamp" aria-hidden="true">
              <span>20</span>
              <span>·10·</span>
              <span>11B7</span>
            </span>
            <p className="letter-greeting script">Gửi 16 cô gái nhỏ của tớ,</p>
            {CONFIG.introLetter.map((line, index) => (
              <p className={`letter-line${index === CONFIG.introLetter.length - 1 ? " letter-line--final" : ""}`} key={line}>
                {line}
              </p>
            ))}
            <div className="letter-footer">
              <span className="letter-seal" aria-hidden="true">
                <span>♡</span>
                <em>11B7</em>
              </span>
              <span className="letter-closing script">thương các cậu nhiều,</span>
              <strong>{CONFIG.senderName}</strong>
            </div>
          </article>
          <span className="letter-sticker script" aria-hidden="true">
            mở ra là thấy thương nè 💌
          </span>
          <span className="letter-paper-flower" aria-hidden="true">
            ✿
          </span>
        </div>
      </div>
      <div className="boundary-clouds" aria-hidden="true">
        <span />
        <span />
      </div>
    </section>
  );
}
