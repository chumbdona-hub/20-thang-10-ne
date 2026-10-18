// Khung ứng dụng: nền sống, màn hình quà, các section và cảnh phim toàn màn hình.
import { useCallback, useEffect, useRef, useState } from "react";
import Background from "./components/Background";
import Cinema from "./components/Cinema";
import FinaleSection from "./components/FinaleSection";
import GiftScreen from "./components/GiftScreen";
import GirlsSection from "./components/GirlsSection";
import Hero from "./components/Hero";
import LetterSection from "./components/LetterSection";
import ProgressBar from "./components/ProgressBar";
import WishesSection from "./components/WishesSection";
import { useReveal } from "./hooks/useReveal";
import { audio } from "./lib/audio";
import { enableSparkleTrail } from "./lib/fx";
import { prefersReducedMotion } from "./lib/loop";
import { initQuality } from "./lib/perf";

export default function App() {
  const [giftOpened, setGiftOpened] = useState(false);
  const [giftGone, setGiftGone] = useState(false);
  const [cinemaOpen, setCinemaOpen] = useState(false);
  const savedScroll = useRef(0);

  useReveal(giftOpened);

  // Báo loader tĩnh rằng ứng dụng đã sẵn sàng (kèm thời gian chờ an toàn).
  useEffect(() => {
    initQuality();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) window.dispatchEvent(new Event("app-ready"));
    };
    const timer = window.setTimeout(markReady, 180);
    if (document.fonts?.ready) {
      document.fonts.ready.then(markReady).catch(markReady);
    }
    const onError = (event: ErrorEvent) => {
      if (event.message) console.warn("[11B7]", event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      console.warn("[11B7]", event.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    document.body.classList.add("no-scroll");
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  // Vệt lấp lánh theo tay/chuột chỉ sau khi mở quà.
  useEffect(() => {
    if (!giftOpened) return;
    return enableSparkleTrail();
  }, [giftOpened]);

  // Đổi "mood" nhạc theo section đang ở gần giữa màn hình.
  useEffect(() => {
    if (!giftOpened) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-mood]"));
    if (!sections.length) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (cinemaOpen) return;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const mood = (entry.target as HTMLElement).dataset.mood;
          if (mood === "hero" || mood === "letter" || mood === "girls" || mood === "wishes" || mood === "finale") {
            audio.setMood(mood);
          }
        });
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [giftOpened, cinemaOpen]);

  const handleReveal = useCallback(() => {
    setGiftOpened(true);
    document.body.classList.remove("no-scroll");
    audio.setMood("hero");
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const handleGiftDone = useCallback(() => {
    setGiftGone(true);
  }, []);

  const openCinema = useCallback(() => {
    savedScroll.current = window.scrollY;
    document.body.classList.add("no-scroll");
    audio.resume();
    try {
      if (!document.fullscreenElement) {
        void document.documentElement.requestFullscreen?.().catch(() => undefined);
      }
    } catch {
      /* Fullscreen không được hỗ trợ */
    }
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: string) => Promise<void>;
      };
      void orientation?.lock?.("landscape").catch(() => undefined);
    } catch {
      /* Không khóa được hướng */
    }
    setCinemaOpen(true);
  }, []);

  const closeCinema = useCallback(() => {
    setCinemaOpen(false);
    document.body.classList.remove("no-scroll", "cinema-lock");
    audio.setMood("letter");
    window.setTimeout(() => {
      const target = document.getElementById("letter");
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      }
    }, 90);
  }, []);

  return (
    <>
      <Background active={giftOpened} />
      <ProgressBar hidden={!giftOpened || cinemaOpen} />

      {giftOpened && (
        <main className="main-flow" id="main">
          <Hero onOpenCinema={openCinema} />
          <LetterSection />
          <GirlsSection />
          <WishesSection />
          <FinaleSection />
        </main>
      )}

      {!giftGone && <GiftScreen onReveal={handleReveal} onDone={handleGiftDone} />}
      {cinemaOpen && <Cinema onClose={closeCinema} />}
    </>
  );
}
