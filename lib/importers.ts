import mammoth from "mammoth";
import { marked } from "marked";

export const ALLOWED_EXT = [".txt", ".md", ".docx"] as const;
export const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function fileToHtml(name: string, buf: Buffer): Promise<string> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".txt")) return textToHtml(buf.toString("utf8"));
  if (lower.endsWith(".md")) return await marked.parse(buf.toString("utf8"), { async: true });
  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.convertToHtml({ buffer: buf });
    return value;
  }
  throw new Error("Unsupported file type");
}
