// Section 3 — nhập tên để nhận lời chúc; 16 thẻ mở chung một màn hình lời chúc (không lật thẻ).
import { useEffect, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import {
  isTeacher,
  makeGirlTarget,
  makeGuestTarget,
  makeTeacherTarget,
  searchGirls,
  type WishTarget,
} from "../data/wishes";
import { audio } from "../lib/audio";
import { burst } from "../lib/fx";
import { givenName, initialsFor, titleCaseVi } from "../lib/nameUtils";
import NameWish from "./NameWish";
import PhotoFrame from "./PhotoFrame";

const STICKERS = ["🌸", "🌷", "✨", "🦋", "🌼", "💗", "🫧", "🌙", "🍓", "🧁", "🎀", "🪐", "🌻", "☁️", "💌", "⭐"];
const TONES = ["rose", "butter", "lilac", "mint", "peach", "sky"] as const;

type Props = { onCountChange?: (count: number) => void };

export default function GirlsSection({ onCountChange }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<WishTarget | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const openTimer = useRef(0);
  const chimed = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || chimed.current) return;
      chimed.current = true;
      audio.sfx("chime");
    }, { threshold: 0.14 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(openTimer.current);
    };
  }, []);

  useEffect(() => {
    onCountChange?.(target ? 1 : 0);
  }, [onCountChange, target]);

  const suggestions = searchGirls(query).slice(0, 6);

  const openTarget = (next: WishTarget, index?: number) => {
    setHighlight(next.kind === "girl" ? next.name : null);
    if (typeof index === "number" && cardRefs.current[index]) {
      cardRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (next.kind !== "guest") audio.sfx("found");
    const rect = typeof index === "number" ? cardRefs.current[index]?.getBoundingClientRect() : undefined;
    if (rect) {
      burst(rect.left + rect.width / 2, rect.top + rect.height / 2, {
        count: 18,
        shapes: ["heart", "petal", "star"],
        speedMax: 220,
        gravity: 90,
        sizeScale: 0.8,
      });
    }
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      setTarget(next);
      setHighlight(null);
    }, next.kind === "guest" ? 120 : 800);
  };

  const submit = () => {
    const raw = query.trim();
    if (!raw) {
      setNotice("Gõ tên một bạn nữ trước nhé 🌸");
      audio.sfx("pop");
      return;
    }
    audio.resume();
    if (isTeacher(raw)) {
      setNotice("Có một lá thư đặc biệt đang mở… 💐");
      audio.sfx("teacher");
      window.setTimeout(() => setTarget(makeTeacherTarget()), 420);
      return;
    }
    const matches = searchGirls(raw);
    if (matches.length > 1) {
      setNotice(`Có ${matches.length} bạn cùng khớp — chạm để chọn đúng người nhé.`);
      audio.sfx("found");
      return;
    }
    if (matches.length === 1) {
      const index = (CONFIG.girls as readonly string[]).indexOf(matches[0].name);
      setQuery(matches[0].name);
      setNotice("");
      openTarget(matches[0], index);
      return;
    }
    const guest = makeGuestTarget(titleCaseVi(raw));
    setNotice("Chưa có tên này trong danh sách, bọn tớ vẫn gửi lời chúc chung nhé 💌");
    openTarget(guest);
  };

  const pickSuggestion = (name: string) => {
    setQuery(name);
    setNotice("");
    const index = (CONFIG.girls as readonly string[]).indexOf(name);
    openTarget(makeGirlTarget(name), index);
  };

  const onCard = (name: string, index: number) => {
    audio.resume();
    setQuery(name);
    setNotice("");
    openTarget(makeGirlTarget(name), index);
  };

  return (
    <section className="section girls-section" id="girls" ref={sectionRef} data-theme-anchor data-mood="girls" aria-labelledby="girls-title">
      <span className="section-watermark section-watermark--right" aria-hidden="true">16</span>
      <div className="wrap">
        <header className="girls-header">
          <span className="pill reveal"><span className="pill__dot" /> 02 · Danh sách các bạn nữ</span>
          <h2 className="section-title reveal" id="girls-title" style={{ ["--d" as string]: "0.06s" }}>
            Những cô gái của 11B7 <span className="girls-title__emoji" aria-hidden="true">🌸</span>
          </h2>
          <p className="lead reveal" style={{ ["--d" as string]: "0.12s" }}>
            Nhập tên của bạn, hoặc chạm một tấm thẻ bên dưới. Bọn tớ đã giấu một lá thư riêng cho từng người.
          </p>

          <div className="name-form reveal" style={{ ["--d" as string]: "0.16s" }}>
            <label className="name-form__label" htmlFor="girl-name-input">Nhập tên một bạn nữ…</label>
            <div className="name-form__row">
              <span className="name-form__icon" aria-hidden="true">✿</span>
              <input
                id="girl-name-input"
                className="name-form__input"
                type="text"
                value={query}
                placeholder="Nhập tên một bạn nữ…"
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                enterKeyHint="send"
                onChange={(event) => {
                  const next = event.target.value;
                  setQuery(next);
                  if (next.trim()) audio.sfx("type");
                  else setNotice("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
              />
              <button type="button" className="name-form__btn" onClick={submit}>
                Gửi lời chúc <span aria-hidden="true">💌</span>
              </button>
            </div>
            {!!suggestions.length && query.trim() && !target && (
              <ul className="name-suggest" aria-label="Gợi ý tên">
                {suggestions.map((girl) => (
                  <li key={girl.name}>
                    <button type="button" className="name-chip" onClick={() => pickSuggestion(girl.name)}>
                      <span className="name-chip__avatar" aria-hidden="true">{initialsFor(girl.name)}</span>
                      <span className="name-chip__text">
                        <strong>{givenName(girl.name)}</strong>
                        <span>{girl.name}</span>
                      </span>
                      <span className="name-chip__arrow" aria-hidden="true">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!!notice && <p className="name-form__notice" role="status">{notice}</p>}
            <p className="name-form__hint">Tìm theo họ tên, tên gọi hoặc một phần tên — có dấu hay không dấu đều được.</p>
          </div>

          <div className="girls-divider reveal" aria-hidden="true" style={{ ["--d" as string]: "0.2s" }}><span /><em>✿</em><span /></div>
        </header>

        <div className="girls-grid">
          {CONFIG.girls.map((name, index) => (
            <div className={`girl-card reveal ${highlight === name ? "is-highlight" : ""} tone-${TONES[index % TONES.length]}`} style={{ ["--d" as string]: `${Math.min(index, 11) * 0.045}s` }} key={name}>
              <button
                ref={(node) => { cardRefs.current[index] = node; }}
                type="button"
                className="girl-card__button"
                onClick={() => onCard(name, index)}
                aria-label={`Mở lời chúc dành cho ${name}`}
              >
                <span className="girl-sheen" aria-hidden="true" />
                <span className="girl-sticker" aria-hidden="true">{STICKERS[index % STICKERS.length]}</span>
                <span className="girl-avatar">
                  <span className="girl-avatar__halo" aria-hidden="true" />
                  <PhotoFrame name={name} shape="arch" size="thumb" variant={TONES[index % TONES.length]} className="girl-avatar__photo" />
                  <span className="girl-avatar__flower" aria-hidden="true">✿</span>
                </span>
                <span className="girl-name">
                  <span className="girl-name__rest">{name.slice(0, Math.max(0, name.lastIndexOf(" ")))} </span>
                  <strong>{givenName(name)}</strong>
                </span>
                <span className="girl-tag">cô gái {String(index + 1).padStart(2, "0")}</span>
                <span className="girl-charm" aria-hidden="true"><i /><b>✿</b><i /></span>
                <span className="girl-open">mở lời chúc <span aria-hidden="true">→</span></span>
              </button>
            </div>
          ))}
        </div>

        <p className="girls-footnote reveal">
          <span aria-hidden="true">🫶</span> Không thiếu ai đâu nhé — đủ {CONFIG.girls.length} cô gái của đại gia đình 11B7.
        </p>
      </div>
      <div className="boundary-clouds" aria-hidden="true"><span /><span /></div>

      {target && <NameWish target={target} onClose={() => setTarget(null)} />}
    </section>
  );
}
