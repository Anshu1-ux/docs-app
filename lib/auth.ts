import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const store = await cookies();
  const id = store.get("uid")?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}