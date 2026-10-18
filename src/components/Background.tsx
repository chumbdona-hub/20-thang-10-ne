// Nền gradient sống: nội suy bảng màu theo vị trí cuộn, cập nhật biến CSS trong rAF chung.
import { useEffect, useRef } from "react";
import { onFrame } from "../lib/loop";
import { clamp, mixColor, smoothstep } from "../lib/utils";

type Palette = { c1: string; c2: string; c3: string; night: number };

const PALETTES: Palette[] = [
  { c1: "#FFB6C8", c2: "#FFD6E0", c3: "#FFF1E6", night: 0 },
  { c1: "#FFF1E6", c2: "#FFF1B8", c3: "#FFE0EA", night: 0 },
  { c1: "#E5D4FF", c2: "#FFC8DD", c3: "#D4F5E9", night: 0.08 },
  { c1: "#8E6AAE", c2: "#C98BC0", c3: "#FFB3D1", night: 0.72 },
  { c1: "#FF9EBB", c2: "#B79CFF", c3: "#3B2A6B", night: 1 },
];

const LIGHT_INK = "#6B3A4A";
const DARK_INK = "#FFF6FB";

export default function Background({ active }: { active: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const stage = stageRef.current;
    let acc = 1;

    const update = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-theme-anchor]"));
      if (!sections.length) return;
      const focus = window.scrollY + window.innerHeight * 0.46;
      const points = sections.map((el) => {
        const rect = el.getBoundingClientRect();
        return { center: rect.top + window.scrollY + rect.height * 0.46, top: rect.top + window.scrollY };
      });
      let index = 0;
      while (index < points.length - 1 && focus > points[index + 1].center) index += 1;
      let t = 0;
      if (index < points.length - 1) {
        const from = points[index].center;
        const to = points[index + 1].center;
        t = smoothstep(clamp((focus - from) / Math.max(1, to - from)));
      }
      const current = PALETTES[Math.min(index, PALETTES.length - 1)] ?? PALETTES[0];
      const next = PALETTES[Math.min(index + 1, PALETTES.length - 1)] ?? current;
      const c1 = mixColor(current.c1, next.c1, t);
      const c2 = mixColor(current.c2, next.c2, t);
      const c3 = mixColor(current.c3, next.c3, t);
      const night = current.night + (next.night - current.night) * t;
      root.style.setProperty("--c1", c1);
      root.style.setProperty("--c2", c2);
      root.style.setProperty("--c3", c3);
      root.style.setProperty("--night", night.toFixed(3));
      root.style.setProperty("--ink", mixColor(LIGHT_INK, DARK_INK, clamp(night * 1.35)));
      root.style.setProperty("--ink-soft", mixColor("#7E4A5D", "#F0DCE8", clamp(night * 1.25)));
      root.style.setProperty("--card", `rgba(255,255,255,${(0.74 - night * 0.56).toFixed(3)})`);
      root.style.setProperty("--card-line", `rgba(255,255,255,${(0.9 - night * 0.42).toFixed(3)})`);
      root.style.setProperty("--shadow-tint", night > 0.4 ? "rgba(26,10,40,0.55)" : "rgba(122,52,78,0.22)");
      const angle = 148 + clamp(window.scrollY / 3200) * 22;
      root.style.setProperty("--bg-angle", `${angle.toFixed(1)}deg`);
      if (stage) {
        stage.style.setProperty("--spot1x", `${((window.scrollY / 18) % 80) - 30}px`);
        stage.style.setProperty("--spot1y", `${((window.scrollY / 26) % 60) - 20}px`);
        stage.style.setProperty("--spot2x", `${-((window.scrollY / 22) % 70)}px`);
        stage.style.setProperty("--spot2y", `${((window.scrollY / 30) % 50) - 25}px`);
        stage.style.setProperty("--spot3x", `${((window.scrollY / 34) % 60) - 20}px`);
        stage.style.setProperty("--spot3y", `${-((window.scrollY / 20) % 55)}px`);
      }
    };

    update();
    const stop = onFrame((dt) => {
      acc += dt;
      if (acc < 0.045) return;
      acc = 0;
      update();
    });
    return stop;
  }, [active]);

  return (
    <div className="bg-stage" ref={stageRef} aria-hidden="true">
      <div className="bg-haze" />
      <div className="bg-blob bg-blob--1" />
      <div className="bg-blob bg-blob--2" />
      <div className="bg-blob bg-blob--3" />
      <div className="bg-stars" />
      <div className="bg-vignette" />
      <div className="bg-grain" />
    </div>
  );
}
