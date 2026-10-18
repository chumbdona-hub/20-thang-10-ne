// Tải thumbnail cho cả danh sách (giới hạn 4 ảnh cùng lúc), dùng cho tường ảnh / phòng 3D / mosaic / phim.
import { useEffect, useState } from "react";
import { photos, type PhotoResult } from "../lib/photos";

export type AlbumItem = { name: string; photo: PhotoResult | null; state: "loading" | "ok" | "miss" };

export function useAlbum(names: readonly string[], when = true) {
  const [items, setItems] = useState<AlbumItem[]>(() => names.map((name) => ({ name, photo: null, state: "loading" })));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!when) return;
    let cancelled = false;
    let cursor = 0;
    const list = names.slice();

    const update = (name: string, value: PhotoResult | null, state: AlbumItem["state"]) => {
      if (cancelled) return;
      setItems((prev) => prev.map((item) => (item.name === name ? { name, photo: value, state } : item)));
    };

    const worker = async () => {
      while (!cancelled && cursor < list.length) {
        const index = cursor;
        cursor += 1;
        const name = list[index];
        const value = await photos.load(name, "thumb").catch(() => null);
        update(name, value, value && value.ok ? "ok" : "miss");
      }
    };

    const workers = [0, 1, 2, 3].map(() => worker());
    Promise.all(workers)
      .then(() => {
        if (!cancelled) setSettled(true);
      })
      .catch(() => {
        if (!cancelled) setSettled(true);
      });

    return () => {
      cancelled = true;
    };
  }, [names, when]);

  return { items, settled, available: items.filter((item) => item.state === "ok"), loading: items.some((item) => item.state === "loading") };
}
