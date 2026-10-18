// Tiện ích chuỗi tiếng Việt: bỏ dấu, khớp tên, ngắt dòng theo TỪ và tự co cỡ chữ.
export function normalizeVi(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Bỏ tiền tố "cô", "cô giáo", "bạn"… để so khớp tên. */
export function stripPrefix(input: string): string {
  return normalizeVi(input).replace(/^(co giao|co|ban|anh|chi|em)\s+/, "").trim();
}

export function titleCaseVi(input: string): string {
  const clean = (input || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean
    .split(" ")
    .map((word) => word.charAt(0).toLocaleUpperCase("vi") + word.slice(1))
    .join(" ");
}

export function givenName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}

/** Nối 2 từ cuối bằng khoảng trắng không ngắt để tránh dòng cuối chỉ có 1 từ. */
export function avoidOrphan(text: string): string {
  const index = text.lastIndexOf(" ");
  if (index < 1) return text;
  return text.slice(0, index) + "\u00A0" + text.slice(index + 1);
}

/** Ngắt dòng theo TỪ bằng measureText — không bao giờ cắt giữa một từ. */
export function wrapByWords(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
      return;
    }
    lines.push(line);
    line = word;
  });
  if (line) lines.push(line);
  return lines;
}

/** Chọn cỡ chữ lớn nhất (>= 60%) để văn bản vừa khung và không ngắt giữa từ. */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  startSize: number,
  weight = 700,
  family = '"Dancing Script", "Baloo 2", cursive',
): { size: number; lines: string[] } {
  let size = startSize;
  const minSize = Math.max(12, Math.round(startSize * 0.6));
  let lines: string[] = [];
  while (size >= minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    lines = wrapByWords(ctx, text, maxWidth);
    const tooWide = lines.some((line) => ctx.measureText(line).width > maxWidth);
    if (lines.length <= maxLines && !tooWide) break;
    size -= 2;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return { size, lines };
}

/** Tách chữ cho hiệu ứng: mỗi TỪ là một khối nowrap, chữ cái nằm bên trong. */
export function splitWordsForFx(text: string): string[] {
  return (text || "").split(/\s+/).filter(Boolean);
}
