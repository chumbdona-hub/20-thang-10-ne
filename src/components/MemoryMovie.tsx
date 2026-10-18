// Phim kỷ niệm: overlay toàn màn hình lần lượt các bạn có ảnh, chuyển cảnh 3D + Ken Burns.
import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { audio } from "../lib/audio";
import { burst } from "../lib/fx";
import { givenName } from "../lib/nameUtils";
import { type AlbumItem } from "../hooks/useAlbum";
import { makeTeacherTarget, type WishTarget } from "../data/wishes";
import NameWish from "./NameWish";

const TRANSITIONS = ["cube", "slide", "zoom", "door", "dissolve"];

export default function MemoryMovie({ items, onClose }: { items: AlbumItem[]; onClose: () => void }) {
  const slides = items.filter((item) => item.state === "ok" && item.photo && item.photo.url);
  const total = slides.length;
  const perSlide = total ? Math.max(1500, Math.min(2200, 44000 / total)) : 2200;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(total === 0);
  const [target, setTarget] = useState<WishTarget | null>(null);
  const historyPushed = useRef(false);
  const closing = useRef(false);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (historyPushed.current) {
      historyPushed.current = false;
      try {
        window.history.back();
      } catch {
        /* bỏ qua */
      }
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    document.body.classList.add("no-scroll", "movie-open");
    try {
      window.history.pushState({ movie: true }, "");
      historyPushed.current = true;
    } catch {
      /* bỏ qua */
    }
    const onPop = () => {
      historyPushed.current = false;
      if (!closing.current) {
        closing.current = true;
        onClose();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll", "movie-open");
    };
  }, [close, onClose]);

  useEffect(() => {
    if (paused || finished || !total) return;
    const timer = window.setTimeout(() => {
      audio.sfx("film");
      audio.sfx("whoosh");
      if (index + 1 >= total) {
        setFinished(true);
        audio.sfx("chime");
        return;
      }
      setIndex((value) => value + 1);
    }, perSlide);
    return () => window.clearTimeout(timer);
  }, [finished, index, paused, perSlide, total]);

  useEffect(() => {
    if (target) {
      document.body.classList.remove("no-scroll");
    } else {
      document.body.classList.add("no-scroll");
    }
  }, [target]);

  const finishLove = (event: React.MouseEvent) => {
    event.stopPropagation();
    audio.resume();
    audio.sfx("sparkle");
    audio.sfx("chime");
    burst(window.innerWidth / 2, window.innerHeight * 0.55, {
      count: 70,
      shapes: ["heart", "petal", "star"],
      speedMax: 420,
      lift: 200,
      sizeMax: 14,
    });
    setFinished(true);
  };

  const current = slides[Math.min(index, Math.max(0, total - 1))];
  const variant = TRANSITIONS[index % TRANSITIONS.length];

  return (
    <div className="movie" role="dialog" aria-modal="true" aria-label="Phim kỷ niệm của lớp 11B7" onClick={() => setPaused((value) => !value)}>
      <div className="movie__sky" aria-hidden="true">
        <span className="movie__nebula movie__nebula--a" />
        <span className="movie__nebula movie__nebula--b" />
        {Array.from({ length: 40 }, (_, i) => (
          <span key={i} className="movie__star" style={{ left: `${(i * 43 + 9) % 98}%`, top: `${(i * 57 + 5) % 94}%`, animationDelay: `${(i % 8) * 0.4}s` }} />
        ))}
      </div>

      <button type="button" className="movie__close" onClick={(event) => { event.stopPropagation(); close(); }} aria-label="Đóng phim kỷ niệm">
        Đóng ✕
      </button>

      {total > 0 && !finished && current && (
        <div className="movie__stage">
          <div className={"movie-slide movie-slide--" + variant} key={current.name}>
            <div className="movie-slide__photo">
              <img src={current.photo?.url || ""} alt={current.name} decoding="async" />
              <span className="movie-slide__kenburns" aria-hidden="true" />
            </div>
            <p className="movie-slide__name script">{givenName(current.name)}</p>
            <p className="movie-slide__full">{current.name}</p>
          </div>
          <div className="movie__progress" aria-hidden="true">
            {slides.map((slide, slideIndex) => (
              <span key={slide.name} className={slideIndex < index ? "is-done" : slideIndex === index ? "is-current" : ""} />
            ))}
          </div>
          {paused && <p className="movie__paused">đang tạm dừng · chạm để tiếp tục</p>}
        </div>
      )}

      {finished && (
        <div className="movie__end" onClick={(event) => event.stopPropagation()}>
          <p className="movie__end-kicker script">Cảm ơn vì đã là</p>
          <h2 className="movie__end-title">thanh xuân của nhau</h2>
          <div className="movie__end-heart" aria-hidden="true">
            {slides.slice(0, 12).map((slide, i) => (
              <span key={slide.name} style={{ ["--i" as string]: i }}>
                <img src={slide.photo?.url || ""} alt="" />
              </span>
            ))}
            <strong>11B7</strong>
          </div>
          <div className="movie__end-actions">
            <button type="button" className="movie__send" onClick={finishLove}>
              Gửi yêu thương 💗
            </button>
            <button type="button" className="movie__again" onClick={() => { setIndex(0); setFinished(false); }}>
              Xem lại ↺
            </button>
            <button type="button" className="movie__close-inline" onClick={close}>
              Đóng
            </button>
          </div>
          {CONFIG.teacherInMovie && (
            <button type="button" className="movie__teacher" onClick={() => setTarget(makeTeacherTarget())}>
              Kính tặng cô một tấm ảnh
            </button>
          )}
        </div>
      )}

      {target && <NameWish target={target} onClose={() => setTarget(null)} />}
    </div>
  );
}
