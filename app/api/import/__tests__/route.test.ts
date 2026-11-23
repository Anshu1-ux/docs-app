 // @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  create: vi.fn(),
  fileToHtml: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      create: mocks.create,
    },
  },
}));

vi.mock("@/lib/importers", () => ({
  ALLOWED_EXT: [".txt", ".md", ".docx"],
  MAX_BYTES: 2 * 1024 * 1024,
  fileToHtml: mocks.fileToHtml,
}));

import { POST } from "../route";

function makeRequest(file?: File): Request {
  const form = new FormData();
  if (file) form.append("file", file);

  return new Request("http://localhost/api/import", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.fileToHtml.mockResolvedValue("<p>Imported content</p>");
    mocks.create.mockResolvedValue({ id: "doc-1" });
  });

  it("returns 401 when the user is not signed in", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(
      makeRequest(new File(["hello"], "test.txt"))
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Not signed in" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns 400 when no file is uploaded", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "No file uploaded" });
  });

  it("rejects unsupported file types", async () => {
    const response = await POST(
      makeRequest(new File(["pdf"], "test.pdf"))
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Only .txt, .md and .docx files are supported",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects files larger than 2 MB", async () => {
    const largeContent = new Uint8Array(2 * 1024 * 1024 + 1);
    const file = new File([largeContent], "large.txt");

    const response = await POST(makeRequest(file));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: "File is too large (max 2 MB)",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("imports a TXT file and creates a document", async () => {
    const response = await POST(
      makeRequest(new File(["hello"], "test.txt"))
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "doc-1" });

    expect(mocks.fileToHtml).toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        ownerId: "user-1",
        title: "test",
        content: "<p>Imported content</p>",
      },
    });
  });

  it("truncates long filenames to 200 characters for the title", async () => {
    const longName = "a".repeat(250) + ".txt";

    const response = await POST(
      makeRequest(new File(["hello"], longName))
    );

    expect(response.status).toBe(200);

    const createCall = mocks.create.mock.calls[0][0];
    expect(createCall.data.title).toHaveLength(200);
  });

  it("returns 422 when the file cannot be read", async () => {
    mocks.fileToHtml.mockRejectedValue(new Error("Conversion failed"));

    const response = await POST(
      makeRequest(new File(["broken"], "test.docx"))
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Could not read that file",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("accepts uppercase extensions", async () => {
    const response = await POST(
      makeRequest(new File(["hello"], "TEST.TXT"))
    );

    expect(response.status).toBe(200);
  });
});
