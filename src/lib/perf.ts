// Theo dõi chất lượng thiết bị: tự chuyển sang chế độ "lite" khi máy yếu hoặc FPS thấp.
import { isWeakDevice, onFrame, prefersReducedMotion } from "./loop";

let lite: boolean | null = null;
let started = false;

export function isLite(): boolean {
  if (lite !== null) return lite;
  if (typeof document === "undefined") return false;
  lite =
    isWeakDevice() ||
    prefersReducedMotion() ||
    document.documentElement.dataset.lite === "true";
  return lite;
}

export function initQuality(): void {
  if (started || typeof document === "undefined") return;
  started = true;
  const set = (value: boolean) => {
    lite = value;
    document.documentElement.dataset.lite = value ? "true" : "false";
  };
  set(isLite());

  // Đo FPS bằng vòng rAF chung: nếu dưới ~44fps trong 2.5s thì hạ hiệu ứng.
  let elapsed = 0;
  let frames = 0;
  onFrame((dt) => {
    if (document.hidden) {
      elapsed = 0;
      frames = 0;
      return;
    }
    elapsed += dt;
    frames += 1;
    if (elapsed < 3) return;
    const fps = frames / elapsed;
    // Chỉ hạ cấp, không tự nâng lại: tránh hiện tượng bật/tắt hiệu ứng liên tục.
    if (fps < 42 && !lite) set(true);
    elapsed = 0;
    frames = 0;
  });
}
