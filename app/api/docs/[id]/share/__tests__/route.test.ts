// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUser, mockDocument, mockFindUser, mockUpsert, mockDeleteMany } =
  vi.hoisted(() => ({
    mockUser: { value: null as { id: string } | null },
    mockDocument: vi.fn(),
    mockFindUser: vi.fn(),
    mockUpsert: vi.fn(),
    mockDeleteMany: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(mockUser.value)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findUnique: mockDocument },
    user: { findUnique: mockFindUser },
    share: {
      upsert: mockUpsert,
      deleteMany: mockDeleteMany,
    },
  },
}));

import { POST, DELETE } from "../route";

const doc = { id: "doc-1", ownerId: "owner-1" };
const target = { id: "user-2", name: "Test User", email: "test@example.com" };

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/docs/doc-1/share", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function makeContext(id = "doc-1") {
  return { params: Promise.resolve({ id }) };
}

describe("Document sharing API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.value = { id: "owner-1" };
    mockDocument.mockResolvedValue(doc);
    mockFindUser.mockResolvedValue(target);
    mockUpsert.mockResolvedValue({ role: "VIEWER" });
    mockDeleteMany.mockResolvedValue({ count: 1 });
  });

  describe("POST", () => {
    it("returns 401 if not signed in", async () => {
      mockUser.value = null;
      const res = await POST(makeRequest("POST", {
        email: "test@example.com", role: "VIEWER",
      }), makeContext());
      expect(res.status).toBe(401);
    });

    it("returns 404 if document does not exist", async () => {
      mockDocument.mockResolvedValue(null);
      const res = await POST(makeRequest("POST", {
        email: "test@example.com", role: "VIEWER",
      }), makeContext());
      expect(res.status).toBe(404);
    });

    it("returns 403 if user is not the owner", async () => {
      mockUser.value = { id: "other-user" };
      const res = await POST(makeRequest("POST", {
        email: "test@example.com", role: "VIEWER",
      }), makeContext());
      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid email", async () => {
      const res = await POST(makeRequest("POST", {
        email: "not-an-email", role: "VIEWER",
      }), makeContext());
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid role", async () => {
      const res = await POST(makeRequest("POST", {
        email: "test@example.com", role: "OWNER",
      }), makeContext());
      expect(res.status).toBe(400);
    });

    it("returns 404 if target user does not exist", async () => {
      mockFindUser.mockResolvedValue(null);
      const res = await POST(makeRequest("POST", {
        email: "test@example.com", role: "VIEWER",
      }), makeContext());
      expect(res.status).toBe(404);
    });

    it("returns 400 if owner tries to share with themselves", async () => {
      mockFindUser.mockResolvedValue({
        id: "owner-1", name: "Owner", email: "owner@example.com",
      });
      const res = await POST(makeRequest("POST", {
        email: "owner@example.com", role: "VIEWER",
      }), makeContext());
      expect(res.status).toBe(400);
    });

    it("creates a Viewer share", async () => {
      mockUpsert.mockResolvedValue({ role: "VIEWER" });
      const res = await POST(makeRequest("POST", {
        email: "test@example.com", role: "VIEWER",
      }), makeContext());
      expect(res.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalled();
      const data = await res.json();
      expect(data.role).toBe("VIEWER");
      expect(data.userId).toBe("user-2");
    });

    it("creates an Editor share", async () => {
      mockUpsert.mockResolvedValue({ role: "EDITOR" });
      const res = await POST(makeRequest("POST", {
        email: "test@example.com", role: "EDITOR",
      }), makeContext());
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.role).toBe("EDITOR");
    });

    it("normalizes email to lowercase before lookup", async () => {
      await POST(makeRequest("POST", {
        email: "TEST@EXAMPLE.COM", role: "VIEWER",
      }), makeContext());
      expect(mockFindUser).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });
  });

  describe("DELETE", () => {
    it("returns 401 if not signed in", async () => {
      mockUser.value = null;
      const res = await DELETE(makeRequest("DELETE", { userId: "user-2" }), makeContext());
      expect(res.status).toBe(401);
    });

    it("returns 404 if document does not exist", async () => {
      mockDocument.mockResolvedValue(null);
      const res = await DELETE(makeRequest("DELETE", { userId: "user-2" }), makeContext());
      expect(res.status).toBe(404);
    });

    it("returns 403 if user is not the owner", async () => {
      mockUser.value = { id: "other-user" };
      const res = await DELETE(makeRequest("DELETE", { userId: "user-2" }), makeContext());
      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid input", async () => {
      const res = await DELETE(makeRequest("DELETE", { userId: "" }), makeContext());
      expect(res.status).toBe(400);
    });

    it("removes the share for a valid user", async () => {
      const res = await DELETE(makeRequest("DELETE", { userId: "user-2" }), makeContext());
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { documentId: "doc-1", userId: "user-2" },
      });
    });
  });
});
