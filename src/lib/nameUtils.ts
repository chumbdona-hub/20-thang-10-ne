// Tên gọi / chữ cái avatar / viết hoa tên — dùng chung cho thẻ và màn hình lời chúc.
export { givenName, titleCaseVi, normalizeVi } from "./text";

export function initialsFor(fullName: string): string {
  const parts = (fullName || "").trim().split(/\s+/);
  const last = parts[parts.length - 1] || fullName || "";
  return last.charAt(0).toLocaleUpperCase("vi");
}
