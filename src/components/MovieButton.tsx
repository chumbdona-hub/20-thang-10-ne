// Nút phim kỷ niệm: tự ẩn khi chưa có ảnh nào.
import { useEffect, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { audio } from "../lib/audio";
import { useAlbum } from "../hooks/useAlbum";
import MemoryMovie from "./MemoryMovie";

export default function MovieButton() {
  const ref = useRef<HTMLDivElement>(null);
  const [when, setWhen] = useState(false);
  const [open, setOpen] = useState(false);
  const { items, available, loading } = useAlbum(CONFIG.girls, when);
  const hasPhotos = available.length > 0;
  const show = when && !loading && hasPhotos;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setWhen(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setWhen(true);
      });
    }, { rootMargin: "240px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="movie-launch" ref={ref}>
      {show && (
        <button
          type="button"
          className="movie-launch__btn"
          onClick={() => {
            audio.resume();
            audio.sfx("photo-in");
            setOpen(true);
          }}
        >
          <span aria-hidden="true">🎞️</span> Xem phim kỷ niệm của lớp
        </button>
      )}
      {when && !hasPhotos && (
        <p className="movie-launch__note">
          <span aria-hidden="true">🎞️</span> Phim kỷ niệm sẽ xuất hiện khi cả lớp có ảnh.
        </p>
      )}
      {open && <MemoryMovie items={items} onClose={() => setOpen(false)} />}
    </div>
  );
}
