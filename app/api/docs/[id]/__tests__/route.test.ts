// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUser, mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  mockUser: { value: null as { id: string } | null },
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(mockUser.value)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

import { PATCH } from "../route";

const ownerDoc = {
  id: "doc-1",
  ownerId: "owner-1",
  shares: [],
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/docs/doc-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeContext(id = "doc-1") {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/docs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.value = { id: "owner-1" };
    mockFindUnique.mockResolvedValue(ownerDoc);
    mockUpdate.mockResolvedValue({
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  });

  it("returns 401 if user is not signed in", async () => {
    mockUser.value = null;

    const res = await PATCH(makeRequest({ title: "New title" }), makeContext());

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid input", async () => {
    const res = await PATCH(makeRequest({ title: "" }), makeContext());

    expect(res.status).toBe(400);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns 400 for a title longer than 200 characters", async () => {
    const res = await PATCH(
      makeRequest({ title: "a".repeat(201) }),
      makeContext()
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 for content longer than 2 MB", async () => {
    const res = await PATCH(
      makeRequest({ content: "a".repeat(2_000_001) }),
      makeContext()
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 if document does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ title: "New title" }), makeContext());

    expect(res.status).toBe(404);
  });

  it("returns 403 if user is a viewer", async () => {
    mockUser.value = { id: "viewer-1" };
    mockFindUnique.mockResolvedValue({
      ...ownerDoc,
      shares: [{ userId: "viewer-1", role: "VIEWER" }],
    });

    const res = await PATCH(makeRequest({ title: "New title" }), makeContext());

    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 if user has no access", async () => {
    mockUser.value = { id: "unknown-1" };

    const res = await PATCH(makeRequest({ title: "New title" }), makeContext());

    expect(res.status).toBe(403);
  });

  it("allows an editor to update a document", async () => {
    mockUser.value = { id: "editor-1" };
    mockFindUnique.mockResolvedValue({
      ...ownerDoc,
      shares: [{ userId: "editor-1", role: "EDITOR" }],
    });

    const res = await PATCH(
      makeRequest({ title: "Updated title" }),
      makeContext()
    );

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { title: "Updated title" },
    });
  });

  it("allows the owner to update content", async () => {
    const res = await PATCH(
      makeRequest({ content: "<p>Updated content</p>" }),
      makeContext()
    );

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { content: "<p>Updated content</p>" },
    });
  });

  it("returns updatedAt after a successful update", async () => {
    const res = await PATCH(
      makeRequest({ title: "Updated title" }),
      makeContext()
    );

    const data = await res.json();

    expect(data.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
