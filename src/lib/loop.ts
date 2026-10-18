// Một vòng requestAnimationFrame duy nhất cho toàn trang.
type Task = (dt: number, now: number) => void;
const tasks = new Set<Task>();
let raf = 0;
let last = 0;

export const isWeakDevice = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4;
};

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function tick(now: number) {
  raf = 0;
  const dt = last ? Math.min(48, now - last) : 16;
  last = now;
  if (document.hidden) {
    raf = window.requestAnimationFrame(tick);
    return;
  }
  tasks.forEach((task) => {
    try {
      task(dt / 1000, now);
    } catch {
      tasks.delete(task);
    }
  });
  if (tasks.size) raf = window.requestAnimationFrame(tick);
  else last = 0;
}

export function startLoop() {
  if (!raf) raf = window.requestAnimationFrame(tick);
}

export function onFrame(task: Task): () => void {
  tasks.add(task);
  startLoop();
  return () => {
    tasks.delete(task);
  };
}
