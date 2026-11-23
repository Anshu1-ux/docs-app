import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const AddBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["VIEWER", "EDITOR"]),
});
const RemoveBody = z.object({ userId: z.string().min(1) });

async function requireOwner(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (doc.ownerId !== user.id)
    return { error: NextResponse.json({ error: "Only the owner can share" }, { status: 403 }) };
  return { user, doc };
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireOwner(id);
  if (auth.error) return auth.error;

  const parsed = AddBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!target) return NextResponse.json({ error: "No user with that email" }, { status: 404 });
  if (target.id === auth.user!.id)
    return NextResponse.json({ error: "You already own this document" }, { status: 400 });

  const share = await prisma.share.upsert({
    where: { documentId_userId: { documentId: id, userId: target.id } },
    update: { role: parsed.data.role },
    create: { documentId: id, userId: target.id, role: parsed.data.role },
  });
  return NextResponse.json({
    userId: target.id, name: target.name, email: target.email, role: share.role,
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireOwner(id);
  if (auth.error) return auth.error;

  const parsed = RemoveBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.share.deleteMany({ where: { documentId: id, userId: parsed.data.userId } });
  return NextResponse.json({ ok: true });
}
