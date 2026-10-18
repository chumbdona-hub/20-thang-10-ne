// Đánh thức các phần tử .reveal bằng IntersectionObserver.
import { useEffect } from "react";

export function useReveal(active: boolean, deps: unknown = null) {
  useEffect(() => {
    if (!active || typeof IntersectionObserver === "undefined") {
      document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => el.classList.add("is-in"));
      return;
    }
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || seen.has(entry.target)) return;
          seen.add(entry.target);
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
      if (el.classList.contains("is-in")) return;
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [active, deps]);
}
