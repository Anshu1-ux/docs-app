export type Role = "OWNER" | "EDITOR" | "VIEWER" | null;

export function resolveRole(
  userId: string,
  doc: { ownerId: string; shares: { userId: string; role: "VIEWER" | "EDITOR" }[] }
): Role {
  if (doc.ownerId === userId) return "OWNER";
  const share = doc.shares.find((s) => s.userId === userId);
  return share ? share.role : null;
}

export const canEdit = (r: Role) => r === "OWNER" || r === "EDITOR";