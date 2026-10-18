// Section 4.5 — Vườn hoa lời chúc: chạm mặt đất để gieo một bông hoa kèm lời chúc.
import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "../lib/audio";
import { burst } from "../lib/fx";
import { isLite } from "../lib/perf";
import { MiniFlower } from "./art/FlowerArt";

type Plant = {
  id: number;
  x: number;
  y: number;
  variant: "daisy" | "tulip" | "sunflower" | "bud";
  tone: string;
  scale: number;
  wish: string;
};

const WISHES = [
  "Mong cậu luôn đủ dịu dàng với chính mình.",
  "Một ngày buồn cũng chỉ là một ngày thôi.",
  "Chúc cậu gặp thật nhiều điều tử tế.",
  "Cười lên nha, cậu đẹp lắm.",
  "Mong ước mơ nhỏ của cậu sớm nở hoa.",
  "11B7 thương cậu, thật đấy.",
  "Cứ chậm thôi, không ai giục cậu cả.",
  "Cảm ơn vì đã là một phần thanh xuân.",
  "Đừng quên nghỉ ngơi khi thấy mệt.",
  "Cậu xứng đáng với những điều tốt lành.",
  "Hôm nay cũng là một ngày đáng yêu.",
  "Chúc cậu ngủ thật ngon và mơ thật đẹp.",
];

const VARIANTS: Plant["variant"][] = ["daisy", "tulip", "sunflower", "bud"];
const TONES = ["#ffd0e1", "#fff0b8", "#d9c7ff", "#c9f2de", "#ffc9b3", "#ffb3d1"];

export default function GardenSection() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const lite = isLite();

  useEffect(() => {
    if (!lite) return;
    setPlants((list) => list.slice(-20));
  }, [lite]);

  const plant = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    if (x < 3 || x > 97 || y < 22 || y > 96) return;
    audio.resume();
    audio.sfx("plant");
    audio.sfx("sparkle");
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        /* bỏ qua */
      }
    }
    burst(event.clientX, event.clientY, {
      count: 22,
      shapes: ["petal", "heart", "spark"],
      speedMax: 260,
      lift: 160,
      gravity: 180,
      sizeMax: 11,
    });
    idRef.current += 1;
    const next: Plant = {
      id: idRef.current,
      x,
      y,
      variant: VARIANTS[idRef.current % VARIANTS.length],
      tone: TONES[idRef.current % TONES.length],
      scale: 0.7 + Math.random() * 0.5,
      wish: WISHES[idRef.current % WISHES.length],
    };
    setPlants((list) => {
      const max = isLite() ? 20 : 40;
      const merged = [...list, next];
      return merged.length > max ? merged.slice(merged.length - max) : merged;
    });
  }, []);

  return (
    <section className="section garden" id="garden" data-theme-anchor data-mood="wishes" aria-labelledby="garden-title">
      <div className="wrap">
        <header className="garden-head">
          <span className="pill reveal garden-pill"><span className="pill__dot" /> 03.5 · Vườn hoa lời chúc</span>
          <h2 className="section-title reveal" id="garden-title" style={{ ["--d" as string]: "0.06s" }}>
            Gieo một chút <span className="script garden-script">thương thương</span>
          </h2>
          <p className="lead reveal" style={{ ["--d" as string]: "0.12s" }}>
            Chạm vào vườn để gieo một lời chúc 🌱 — mỗi bông hoa là một điều bọn tớ muốn nói.
          </p>
        </header>

        <div className="garden-stage reveal reveal--scale" style={{ ["--d" as string]: "0.14s" }} ref={stageRef} onPointerDown={plant}>
          <div className="garden-sky" aria-hidden="true">
            {Array.from({ length: 26 }, (_, i) => (
              <span
                key={i}
                style={{
                  left: `${(i * 41 + 7) % 96}%`,
                  top: `${(i * 31 + 9) % 62}%`,
                  animationDelay: `${(i % 7) * 0.55}s`,
                }}
              />
            ))}
            <span className="garden-moon" />
          </div>
          <div className="garden-ground" aria-hidden="true">
            <span className="garden-hill garden-hill--back" />
            <span className="garden-hill garden-hill--front" />
            <span className="garden-grass" />
          </div>

          {plants.map((item, index) => (
            <div
              className="garden-plant"
              key={item.id}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                ["--scale" as string]: item.scale,
                ["--tone" as string]: item.tone,
                ["--delay" as string]: `${(index % 5) * 0.2}s`,
              }}
            >
              <span className="garden-plant__wish">{item.wish}</span>
              <span className="garden-plant__stem" aria-hidden="true" />
              <span className="garden-plant__bloom" aria-hidden="true">
                <MiniFlower variant={item.variant} />
              </span>
              <span className="garden-plant__glow" aria-hidden="true" />
            </div>
          ))}

          {!plants.length && (
            <p className="garden-empty">
              <span aria-hidden="true">🌷</span> Chạm vào vườn để gieo một lời chúc 🌱
            </p>
          )}
          <p className="garden-count">
            {plants.length ? `${plants.length} bông hoa đã nở` : "khu vườn đang chờ cậu"}
          </p>
        </div>
        <p className="garden-note reveal">
          <span aria-hidden="true">🌼</span> Mỗi cú chạm là một điều tốt lành gửi tới 11B7.
        </p>
      </div>
    </section>
  );
}
