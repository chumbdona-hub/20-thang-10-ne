// Khung ảnh dùng chung: ô tạm pastel + ảnh thật crossfade "rửa ảnh", khung SVG cho vòm/trái tim.
import { useEffect, useId, useRef, useState } from "react";
import { usePhoto } from "../hooks/usePhoto";
import { photos } from "../lib/photos";
import { initialsFor } from "../lib/nameUtils";
import { audio } from "../lib/audio";

type Props = {
  name: string;
  size?: "thumb" | "full";
  shape?: "circle" | "arch" | "heart" | "square";
  variant?: "rose" | "butter" | "lilac" | "mint" | "peach" | "sky" | "gold";
  eager?: boolean;
  className?: string;
  onReady?: () => void;
};

export default function PhotoFrame({ name, size = "thumb", shape = "circle", variant = "rose", eager = false, className = "", onReady }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(eager);
  const { photo, ok } = usePhoto(name, size, near);

  useEffect(() => {
    const el = rootRef.current;
    if (near || !el) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      });
    }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [shown, setShown] = useState(false);
  const reportedRef = useRef(false);

  useEffect(() => {
    if (!ok) return;
    setShown(false);
    const timer = window.setTimeout(() => {
      setShown(true);
      onReady?.();
      if (!reportedRef.current) {
        reportedRef.current = true;
        try {
          audio.sfx("photo-in");
        } catch {
          /* bỏ qua */
        }
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, [ok, onReady, photo?.url]);

  const src = photo?.url || "";
  const focus = photos.focus(name);
  const initials = initialsFor(name);
  const svgClip = shape === "arch" || shape === "heart";
  const clipId = "clip-" + uid;

  return (
    <div
      ref={rootRef}
      className={"photo-frame photo-frame--" + variant + " photo-frame--" + shape + (shown ? " is-ready" : "") + (className ? " " + className : "")}
      style={{ ["--photo-focus" as string]: focus }}
      data-name={name}
    >
      <div className="photo-frame__placeholder" aria-hidden="true">
        <span className="photo-frame__flower">✿</span>
        <span className="photo-frame__initial">{initials}</span>
      </div>

      {ok && src && !svgClip && (
        <img
          className="photo-frame__img"
          src={src}
          alt={name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
        />
      )}

      {ok && src && svgClip && (
        <svg className="photo-frame__svg" viewBox="0 0 100 120" preserveAspectRatio="xMidYMid slice" role="img" aria-label={name}>
          <defs>
            <clipPath id={clipId}>
              {shape === "arch" ? (
                <path d="M50 2 C22 2 4 22 4 50 L4 118 L96 118 L96 50 C96 22 78 2 50 2Z" />
              ) : (
                <path d="M50 112 C18 90 2 68 2 44 C2 24 16 8 34 8 C43 8 48 13 50 19 C52 13 57 8 66 8 C84 8 98 24 98 44 C98 68 82 90 50 112Z" />
              )}
            </clipPath>
          </defs>
          <image href={src} x="0" y="0" width="100" height="120" preserveAspectRatio="xMidYMid slice" clipPath={"url(#" + clipId + ")"} />
        </svg>
      )}

      <span className="photo-frame__flower photo-frame__flower--corner" aria-hidden="true">✿</span>
      <span className="photo-frame__ring" aria-hidden="true" />
    </div>
  );
}
