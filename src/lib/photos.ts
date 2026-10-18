// Module ảnh dùng chung: slug hoá tên, tải + thu nhỏ + cache LRU + hot-swap.
import { CONFIG } from "../data/config";

export type PhotoSize = "full" | "thumb";

export type PhotoResult = {
  ok: boolean;
  name: string;
  slug: string;
  canvas?: HTMLCanvasElement;
  url?: string;
  w: number;
  h: number;
};

type Entry = { result: PhotoResult; at: number; url?: string };
type Listener = (result: PhotoResult) => void;

const MAX_CACHE = 30;
const TIMEOUT = 8000;
const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<Listener>>();
const known = new Map<string, boolean>();
const inflight = new Map<string, Promise<PhotoResult>>();

export function slug(name: string): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function extList(): string[] {
  const list = CONFIG.photos && CONFIG.photos.ext ? CONFIG.photos.ext : null;
  const out = list ? list.slice() : ["jpeg", "jpg", "png", "webp"];
  return out.length ? out : ["jpeg"];
}

export function url(name: string, extIndex = 0): string {
  const dir = CONFIG.photos && CONFIG.photos.dir ? CONFIG.photos.dir : "assets/photos/";
  const exts = extList();
  const ext = exts[Math.min(extIndex, exts.length - 1)] || "jpeg";
  return dir + slug(name) + "." + ext;
}

export function focus(name: string): string {
  const map = CONFIG.photoFocus || {};
  return map[slug(name)] || "50% 25%";
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    let settled = false;
    const img = new Image();
    let timer: number | undefined;
    const finish = (value: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      if (timer) window.clearTimeout(timer);
      resolve(value);
    };
    timer = window.setTimeout(() => finish(null), TIMEOUT);
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.decoding = "async";
    img.src = src;
  });
}

function drawScaled(img: HTMLImageElement, maxSide: number): PhotoResult {
  const naturalW = img.naturalWidth || img.width || 1;
  const naturalH = img.naturalHeight || img.height || 1;
  const ratio = Math.min(1, maxSide / Math.max(naturalW, naturalH));
  const w = Math.max(1, Math.round(naturalW * ratio));
  const h = Math.max(1, Math.round(naturalH * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false, name: "", slug: "", w: 0, h: 0 };
  try {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
  } catch {
    return { ok: false, name: "", slug: "", w: 0, h: 0 };
  }
  let urlValue = "";
  try {
    urlValue = canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    urlValue = img.src;
  }
  return { ok: true, name: "", slug: "", canvas, url: urlValue, w, h };
}

function remember(key: string, result: PhotoResult) {
  cache.set(key, { result, at: Date.now(), url: result.url });
  if (cache.size <= MAX_CACHE) return;
  const sorted = Array.from(cache.entries()).sort((a, b) => a[1].at - b[1].at);
  while (sorted.length && cache.size > MAX_CACHE) {
    const [oldKey] = sorted.shift() as [string, Entry];
    cache.delete(oldKey);
  }
}

function emit(name: string, result: PhotoResult) {
  const set = listeners.get(slug(name));
  if (!set) return;
  set.forEach((fn) => {
    try {
      fn(result);
    } catch {
      /* callback lỗi không ảnh hưởng trang */
    }
  });
}

async function tryLoad(name: string, size: PhotoSize): Promise<PhotoResult> {
  const key = slug(name) + ":" + size;
  const cached = cache.get(key);
  if (cached) {
    cached.at = Date.now();
    return cached.result;
  }
  const maxSide = size === "thumb" ? CONFIG.photos.thumbSide : CONFIG.photos.maxSide;
  const exts = extList();
  for (let i = 0; i < exts.length; i += 1) {
    const src = url(name, i);
    const img = await loadImage(src);
    if (!img) continue;
    const scaled = drawScaled(img, maxSide);
    if (!scaled.ok) continue;
    scaled.name = name;
    scaled.slug = slug(name);
    remember(key, scaled);
    known.set(slug(name), true);
    emit(name, scaled);
    return scaled;
  }
  // Không có ảnh: ghi nhớ để không thử lại liên tục.
  known.set(slug(name), false);
  const empty: PhotoResult = { ok: false, name, slug: slug(name), w: 0, h: 0 };
  remember(slug(name) + ":miss", empty);
  return empty;
}

export function load(name: string, size: PhotoSize = "full"): Promise<PhotoResult> {
  if (!name) return Promise.resolve({ ok: false, name: "", slug: "", w: 0, h: 0 });
  const key = slug(name) + ":" + size;
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached.result);
  if (known.get(slug(name)) === false && size === "full") {
    return Promise.resolve({ ok: false, name, slug: slug(name), w: 0, h: 0 });
  }
  const pending = inflight.get(key);
  if (pending) return pending;
  const promise = tryLoad(name, size)
    .catch(() => ({ ok: false, name, slug: slug(name), w: 0, h: 0 }))
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function has(name: string): boolean {
  return known.get(slug(name)) === true;
}

export function knownState(name: string): boolean | undefined {
  return known.get(slug(name));
}

export function onPhoto(name: string, fn: Listener): () => void {
  const key = slug(name);
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)?.add(fn);
  const cached = cache.get(key + ":thumb") || cache.get(key + ":full");
  if (cached && cached.result.ok) {
    try {
      fn(cached.result);
    } catch {
      /* bỏ qua */
    }
  }
  return () => {
    listeners.get(key)?.delete(fn);
  };
}

export function debugReport(names: string[]) {
  try {
    const rows = names.map((name) => ({
      "Tên": name,
      "Tên file": slug(name) + "." + extList()[0],
      "Ảnh": known.get(slug(name)) === true ? "có" : known.get(slug(name)) === false ? "chưa có" : "chưa kiểm tra",
    }));
    console.info("[11B7] Bảng ảnh (?debug):", rows);
  } catch {
    /* bỏ qua */
  }
}

export const photos = { slug, url, focus, load, has, knownState, onPhoto, debugReport };
