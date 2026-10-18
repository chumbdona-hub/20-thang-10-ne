// Hook tải ảnh theo lười + hot-swap khi ảnh thật về.
import { useEffect, useRef, useState } from "react";
import { photos, type PhotoResult, type PhotoSize } from "../lib/photos";

const TONES = ["#ffd1e0", "#ffe9b8", "#e4d6ff", "#cdeedd", "#ffdecb", "#d6e9ff"];

export function toneFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return TONES[sum % TONES.length];
}

export function usePhoto(name: string, size: PhotoSize = "thumb", when = true) {
  const [result, setResult] = useState<PhotoResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "miss">("idle");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!when || !name) return;
    setState("loading");
    let cancelled = false;
    loadPhoto();
    const unsub = photos.onPhoto(name, (value) => {
      if (!mounted.current || cancelled) return;
      setResult(value);
      setState(value.ok ? "ok" : "miss");
    });
    function loadPhoto() {
      photos
        .load(name, size)
        .then((value) => {
          if (!mounted.current || cancelled) return;
          setResult(value);
          setState(value.ok ? "ok" : "miss");
        })
        .catch(() => {
          if (!mounted.current || cancelled) return;
          setState("miss");
        });
    }
    return () => {
      cancelled = true;
      unsub();
    };
  }, [name, size, when]);

  return { photo: result, state, ok: state === "ok" && !!result?.ok };
}
