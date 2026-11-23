import { describe, expect, it, vi } from "vitest";
import { ALLOWED_EXT, MAX_BYTES, textToHtml, fileToHtml } from "../importers";

vi.mock("mammoth", () => ({
  default: {
    convertToHtml: vi.fn().mockResolvedValue({
      value: "<h1>DOCX heading</h1><ul><li>Item</li></ul>",
    }),
  },
}));

describe("importer constants", () => {
  it("allows the supported file extensions", () => {
    expect(ALLOWED_EXT).toEqual([".txt", ".md", ".docx"]);
  });

  it("sets the maximum file size to 2 MB", () => {
    expect(MAX_BYTES).toBe(2 * 1024 * 1024);
  });
});

describe("textToHtml", () => {
  it("converts text into paragraphs", () => {
    const result = textToHtml("First paragraph\n\nSecond paragraph");

    expect(result).toBe(
      "<p>First paragraph</p><p>Second paragraph</p>"
    );
  });

  it("preserves single line breaks inside a paragraph", () => {
    const result = textToHtml("First line\nSecond line");

    expect(result).toBe(
      "<p>First line<br>Second line</p>"
    );
  });

  it("removes empty paragraphs", () => {
    const result = textToHtml("\n\nFirst paragraph\n\n\n\nSecond paragraph\n\n");

    expect(result).toBe(
      "<p>First paragraph</p><p>Second paragraph</p>"
    );
  });

  it("escapes HTML to prevent HTML injection", () => {
    const result = textToHtml("<script>alert('x')</script>");

    expect(result).toBe(
      "<p>&lt;script&gt;alert('x')&lt;/script&gt;</p>"
    );
  });

  it("escapes ampersands", () => {
    const result = textToHtml("Tom & Jerry");

    expect(result).toBe("<p>Tom &amp; Jerry</p>");
  });

  it("returns an empty string for empty input", () => {
    expect(textToHtml("")).toBe("");
  });
});

describe("fileToHtml", () => {
  it("imports TXT files", async () => {
    const result = await fileToHtml(
      "test.txt",
      Buffer.from("Hello from TXT")
    );

    expect(result).toBe("<p>Hello from TXT</p>");
  });

  it("imports Markdown headings, bold text and lists", async () => {
    const markdown = "# Heading\n\n**Bold text**\n\n- Item 1\n- Item 2";

    const result = await fileToHtml(
      "test.md",
      Buffer.from(markdown)
    );

    expect(result).toContain("<h1>Heading</h1>");
    expect(result).toContain("<strong>Bold text</strong>");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>Item 1</li>");
    expect(result).toContain("<li>Item 2</li>");
  });

  it("supports uppercase file extensions", async () => {
    const result = await fileToHtml(
      "TEST.TXT",
      Buffer.from("Uppercase extension")
    );

    expect(result).toBe("<p>Uppercase extension</p>");
  });

  it("imports DOCX files", async () => {
    const result = await fileToHtml(
      "test.docx",
      Buffer.from("fake docx data")
    );

    expect(result).toContain("<h1>DOCX heading</h1>");
    expect(result).toContain("<li>Item</li>");
  });

  it("rejects unsupported file types", async () => {
    await expect(
      fileToHtml("test.pdf", Buffer.from("PDF data"))
    ).rejects.toThrow("Unsupported file type");
  });

  it("rejects unsupported file extensions", async () => {
    await expect(
      fileToHtml("test.jpg", Buffer.from("image data"))
    ).rejects.toThrow("Unsupported file type");
  });
});
