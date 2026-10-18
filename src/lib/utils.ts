// Tiện ích dùng chung: toán học, màu, tên gọi, xáo trộn.
export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOutCubic = (t: number) =>
  clamp(t) < 0.5 ? 4 * clamp(t) ** 3 : 1 - Math.pow(-2 * clamp(t) + 2, 3) / 2;
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp(t);
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

export function debounce<T extends (...args: never[]) => void>(fn: T, wait = 150) {
  let timer: number | undefined;
  return (...args: Parameters<T>) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...(args as never[])), wait);
  };
}

export function nextFrame(fn: () => void) {
  window.requestAnimationFrame(() => window.requestAnimationFrame(fn));
}

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const value = hex.replace("#", "").trim();
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const num = Number.parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (c: number) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(clamp(v) * 255);
};

/** Nội suy tuyến tính trong không gian sRGB-linear, tránh vệt xám khi trộn pastel. */
export function mixColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  const k = smoothstep(clamp(t));
  const a = toLinear(r1) + (toLinear(r2) - toLinear(r1)) * k;
  const b = toLinear(g1) + (toLinear(g2) - toLinear(g1)) * k;
  const c = toLinear(b1) + (toLinear(b2) - toLinear(b1)) * k;
  return `rgb(${fromLinear(a)}, ${fromLinear(b)}, ${fromLinear(c)})`;
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Từ cuối của họ tên, dùng làm tên gọi và chữ cái avatar. */
export function firstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

export function initialsOf(fullName: string): string {
  const name = firstName(fullName);
  return name.charAt(0).toUpperCase();
}

export type ShuffleBag<T> = { next: () => T };
export function createBag<T>(items: readonly T[]): ShuffleBag<T> {
  let bag: T[] = [];
  let last: T | undefined;
  const refill = () => {
    bag = [...items];
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    if (bag.length > 1 && bag[bag.length - 1] === last) {
      [bag[bag.length - 1], bag[0]] = [bag[0], bag[bag.length - 1]];
    }
  };
  return {
    next: () => {
      if (!bag.length) refill();
      const value = bag.pop() as T;
      last = value;
      return value;
    },
  };
}
