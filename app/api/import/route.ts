import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ALLOWED_EXT, MAX_BYTES, fileToHtml } from "@/lib/importers";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const lower = file.name.toLowerCase();
  if (!ALLOWED_EXT.some((e) => lower.endsWith(e)))
    return NextResponse.json({ error: "Only .txt, .md and .docx files are supported" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "File is too large (max 2 MB)" }, { status: 413 });

  try {
    const html = await fileToHtml(file.name, Buffer.from(await file.arrayBuffer()));
    const title = file.name.replace(/\.[^.]+$/, "").slice(0, 200) || "Imported document";
    const doc = await prisma.document.create({ data: { ownerId: user.id, title, content: html } });
    return NextResponse.json({ id: doc.id });
  } catch {
    return NextResponse.json({ error: "Could not read that file" }, { status: 422 });
  }
}
