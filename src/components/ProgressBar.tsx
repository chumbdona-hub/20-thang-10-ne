// Thanh tiến độ cuộn mảnh, cập nhật bằng transform để không gây reflow.
import { useEffect, useRef } from "react";
import { onFrame } from "../lib/loop";

export default function ProgressBar({ hidden }: { hidden: boolean }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let max = 1;
    let measuredAt = 0;
    const measure = () => {
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    measure();
    const onResize = () => {
      measure();
      measuredAt = performance.now();
    };
    window.addEventListener("resize", onResize, { passive: true });

    const stop = onFrame(() => {
      const now = performance.now();
      if (now - measuredAt > 1200) {
        measure();
        measuredAt = now;
      }
      const ratio = Math.min(1, Math.max(0, window.scrollY / max));
      bar.style.transform = `scaleX(${ratio.toFixed(4)})`;
    });
    return () => {
      stop();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="scroll-progress" data-hidden={hidden ? "true" : "false"} aria-hidden="true">
      <div className="scroll-progress__bar" ref={barRef} />
    </div>
  );
}
