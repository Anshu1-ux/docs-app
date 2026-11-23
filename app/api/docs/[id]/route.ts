import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { resolveRole, canEdit } from "@/lib/access";

const Body = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().max(2_000_000).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const doc = await prisma.document.findUnique({ where: { id }, include: { shares: true } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEdit(resolveRole(user.id, doc)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.document.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ updatedAt: updated.updatedAt });
}