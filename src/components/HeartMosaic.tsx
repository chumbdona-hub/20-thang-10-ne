// Trái tim 11B7: canvas 2D ghép ~60 ô thumbnail thành trái tim, đập theo bpm, chạm mở lời chúc.
import { useEffect, useRef, useState } from "react";
import { CONFIG } from "../data/config";
import { audio } from "../lib/audio";
import { givenName } from "../lib/nameUtils";
import { useAlbum } from "../hooks/useAlbum";
import { isLite } from "../lib/perf";
import { makeGirlTarget, type WishTarget } from "../data/wishes";
import NameWish from "./NameWish";

const PALETTE = ["#ffd1e0", "#ffe9b8", "#e4d6ff", "#cdeedd", "#ffdecb", "#d6e9ff"];

type Tile = {
  cx: number;
  cy: number;
  size: number;
  name: string;
  color: string;
  startX: number;
  startY: number;
  delay: number;
};

function buildTiles(names: string[]): Tile[] {
  const cols = 13;
  const rows = 11;
  const tiles: Tile[] = [];
  const inHeart = (nx: number, ny: number) => {
    const x = (nx - 0.5) * 2.4;
    const y = -(ny - 0.52) * 2.4;
    const a = x * x + y * y - 0.55;
    return a * a * a - x * x * y * y * y < 0.012;
  };
  let count = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const nx = (col + 0.5) / cols;
      const ny = (row + 0.5) / rows;
      if (!inHeart(nx, ny)) continue;
      const name = names[count % names.length] || "11B7";
      tiles.push({
        cx: nx,
        cy: ny,
        size: 0,
        name,
        color: PALETTE[count % PALETTE.length],
        startX: (Math.random() - 0.5) * 1.6,
        startY: (Math.random() - 0.5) * 1.6,
        delay: count * 0.018,
      });
      count += 1;
    }
  }
  return tiles;
}

export default function HeartMosaic() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<WishTarget | null>(null);
  const { items } = useAlbum(CONFIG.girls, visible);
  const images = useRef(new Map<string, HTMLImageElement>());
  const tilesRef = useRef<Tile[]>(buildTiles(CONFIG.girls as unknown as string[]));
  const pointer = useRef({ x: -999, y: -999, active: false });
  const started = useRef(false);
  const lite = isLite();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (entry.intersectionRatio > 0.3) audio.sfx("mosaic-pop");
        }
      });
    }, { rootMargin: "180px", threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    items.forEach((item) => {
      if (!item.photo || !item.photo.url || images.current.has(item.name)) return;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => images.current.set(item.name, img);
      img.src = item.photo.url;
    });
  }, [items]);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    const wrap = canvas ? canvas.parentElement : null;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = wrap.clientWidth || 600;
    let height = wrap.clientHeight || 420;
    const ratio = Math.min(window.devicePixelRatio || 1, lite ? 1.2 : 1.6);
    const resize = () => {
      width = wrap.clientWidth || width;
      height = wrap.clientHeight || height;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    let hidden = false;
    const visibility = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { hidden = !entry.isIntersecting; });
    }, { threshold: 0.02 });
    visibility.observe(wrap);
    let raf = 0;
    let start = performance.now();
    started.current = false;
    let tiles = tilesRef.current;
    let ring = false;

    const draw = (now: number) => {
      raf = window.requestAnimationFrame(draw);
      if (hidden || document.hidden) return;
      const elapsed = (now - start) / 1000;
      const beat = 60 / CONFIG.song.bpm;
      const kick = Math.exp(-(((now / 1000) % beat)) * 8);
      if (!started.current && items.length) {
        start = now;
        started.current = true;
      }
      const base = Math.min(width, height) * 0.9;
      const offsetX = (width - base * 0.95) / 2;
      const offsetY = (height - base * 0.95) / 2;
      const tile = (base * 0.95) / 13;
      ctx.clearRect(0, 0, width, height);
      let settledAll = true;
      tiles.forEach((t) => {
        const local = Math.max(0, elapsed - t.delay);
        const progress = Math.min(1, local / 0.75);
        if (progress < 1) settledAll = false;
        const ease = 1 - Math.pow(1 - progress, 3);
        let x = offsetX + t.cx * base * 0.95 * 13 / 13 + 0;
        x = offsetX + t.cx * base * 0.95;
        let y = offsetY + t.cy * base * 0.95;
        if (progress < 1) {
          x += t.startX * width * (1 - ease);
          y += t.startY * height * (1 - ease);
        }
        const wave = pointer.current.active ? Math.max(0, 1 - Math.hypot(pointer.current.x - x, pointer.current.y - y) / (base * 0.4)) : 0;
        const pulse = 1 + kick * 0.05 + wave * 0.14;
        const size = tile * 0.86 * pulse;
        const img = images.current.get(t.name);
        ctx.save();
        ctx.translate(x, y);
        const radius = size * 0.24;
        ctx.globalAlpha = 0.3 + progress * 0.7;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-size / 2, -size / 2 - wave * 8, size, size, radius);
        else ctx.rect(-size / 2, -size / 2, size, size);
        ctx.clip();
        if (img) {
          const side = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - side * 0.8) / 2, (img.height - side) * 0.18, side * 0.8, side * 0.8, -size / 2, -size / 2 - wave * 8, size, size);
        } else {
          ctx.fillStyle = t.color;
          ctx.fillRect(-size / 2, -size / 2 - wave * 8, size, size);
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.font = "700 " + Math.round(size * 0.5) + "px 'Dancing Script', cursive";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("♡", 0, -wave * 8 + 1);
        }
        ctx.restore();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = "#fff3fa";
        ctx.lineWidth = 1;
        ctx.strokeRect(-size / 2, -size / 2 - wave * 8, size, size);
        ctx.globalAlpha = 1;
        t.size = size;
      });
      if (settledAll && !ring) {
        ring = true;
        audio.sfx("chime");
      }
    };
    raf = window.requestAnimationFrame(draw);
    const onResize = () => resize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      visibility.disconnect();
      window.removeEventListener("resize", onResize);
      ctx.clearRect(0, 0, width, height);
    };
  }, [items, lite, visible]);

  const toLocal = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const pick = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const base = Math.min(rect.width, rect.height) * 0.9;
    const offsetX = (rect.width - base * 0.95) / 2;
    const offsetY = (rect.height - base * 0.95) / 2;
    let bestName = "";
    let bestDist = Infinity;
    tilesRef.current.forEach((tile) => {
      const tx = offsetX + tile.cx * base * 0.95;
      const ty = offsetY + tile.cy * base * 0.95;
      const dist = Math.hypot(tx - x, ty - y);
      if (dist < bestDist) {
        bestDist = dist;
        bestName = tile.name;
      }
    });
    const tileW = (base * 0.95) / 13;
    if (bestName && bestDist < tileW * 0.9) {
      audio.resume();
      audio.sfx("mosaic-pop");
      setTarget(makeGirlTarget(bestName));
    }
  };

  return (
    <section className="section heart-mosaic" id="heart-mosaic" ref={sectionRef} data-theme-anchor data-mood="wishes" aria-labelledby="heart-mosaic-title">
      <div className="wrap">
        <header className="heart-mosaic__head">
          <span className="pill reveal"><span className="pill__dot" /> {CONFIG.girls.length} mảnh ghép</span>
          <h2 className="section-title reveal" id="heart-mosaic-title" style={{ ["--d" as string]: "0.06s" }}>
            Trái tim của lớp mình <span aria-hidden="true">💗</span>
          </h2>
          <p className="lead reveal" style={{ ["--d" as string]: "0.12s" }}>
            Mỗi ô nhỏ là một người, ghép lại thành một trái tim. Chạm vào một ô để mở lá thư của bạn ấy.
          </p>
        </header>
        <div className="heart-mosaic__stage reveal reveal--scale">
          <canvas
            ref={canvasRef}
            className="heart-mosaic__canvas"
            role="img"
            aria-label="Trái tim ghép từ ảnh các bạn nữ lớp 11B7"
            onPointerDown={(event) => {
              pointer.current = { ...toLocal(event), active: true };
            }}
            onPointerMove={(event) => {
              pointer.current = { ...toLocal(event), active: true };
            }}
            onPointerUp={(event) => {
              pointer.current = { ...pointer.current, active: false };
              pick(event);
            }}
            onPointerLeave={() => {
              pointer.current = { ...pointer.current, active: false };
            }}
          />
          <p className="heart-mosaic__hint"><span aria-hidden="true">💗</span> chạm vào một ô nhỏ nhé</p>
        </div>
        <p className="heart-mosaic__names">
          {givenName(CONFIG.girls[0] || "11B7")} · {givenName(CONFIG.girls[7] || "11B7")} · … · cả {CONFIG.girls.length} cô gái của 11B7
        </p>
      </div>
      {target && <NameWish target={target} onClose={() => setTarget(null)} />}
    </section>
  );
}
