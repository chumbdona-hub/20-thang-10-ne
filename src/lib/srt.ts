// parseSRT: đọc dữ liệu SRT thuần, chịu được BOM / CRLF / dòng trống thừa.
export type Cue = { start: number; end: number; text: string };

const toSeconds = (value: string): number => {
  const match = value.trim().match(/(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!match) return 0;
  const [, h = "0", m = "0", s = "0", ms = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, "0")) / 1000;
};

export function parseSRT(raw: string): Cue[] {
  if (!raw || typeof raw !== "string") return [];
  const clean = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];

  return clean
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const timeIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeIndex < 0) return null;
      const [fromRaw = "", toRaw = ""] = lines[timeIndex].split("-->");
      const text = lines
        .slice(timeIndex + 1)
        .join(" ")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) return null;
      const start = toSeconds(fromRaw);
      const end = toSeconds(toRaw);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      return { start, end, text };
    })
    .filter((cue): cue is Cue => cue !== null)
    .sort((a, b) => a.start - b.start);
}
