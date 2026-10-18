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


/**
 * Gộp các mốc cực ngắn (vài chục ms) liền kề thành một dòng đọc được,
 * chỉ phục vụ hiển thị. Mốc gốc vẫn được giữ nguyên cho timing.
 */
export function mergeCuesForDisplay(cues: Cue[]): Cue[] {
  if (!cues.length) return [];
  const norm = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const out: Cue[] = [];
  let group: Cue = { ...cues[0] };
  let texts: string[] = [cues[0].text];

  const flush = () => {
    out.push({ ...group, text: texts.join(" ") });
  };

  for (let i = 1; i < cues.length; i += 1) {
    const next = cues[i];
    const gap = next.start - group.end;
    const groupDuration = group.end - group.start;
    const nextDuration = next.end - next.start;
    const prospective = next.end - group.start;
    const canMerge =
      gap <= 0.16 &&
      prospective <= 0.5 &&
      (groupDuration <= 0.26 || nextDuration <= 0.26);
    if (!canMerge) {
      flush();
      group = { ...next };
      texts = [next.text];
      continue;
    }
    group = { ...group, end: Math.max(group.end, next.end) };
    const seen = new Set(texts.map(norm));
    if (!seen.has(norm(next.text))) texts.push(next.text);
  }
  flush();

  // Bỏ mốc "nháy" vài chục ms nếu mốc kế tiếp có đúng nội dung đó.
  return out.filter((cue, index) => {
    const next = out[index + 1];
    const tooShort = cue.end - cue.start < 0.12;
    return !(tooShort && next && norm(next.text) === norm(cue.text));
  });
}
