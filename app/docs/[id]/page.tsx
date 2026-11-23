import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { resolveRole, canEdit } from "@/lib/access";
import Editor from "./Editor";
import SharePanel from "./SharePanel";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { owner: true, shares: { include: { user: true } } },
  });
  if (!doc) notFound();

  const role = resolveRole(user.id, doc);
  if (!role) notFound();

  const shareRows = doc.shares.map((s) => ({
    userId: s.userId, name: s.user.name, email: s.user.email, role: s.role,
  }));

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/" className="mb-4 inline-block text-sm underline">← All documents</Link>
      {role !== "OWNER" && (
        <p className="mb-3 text-sm text-gray-500">
          Shared by {doc.owner.name} · you can {canEdit(role) ? "edit" : "view"}
        </p>
      )}
      {role === "OWNER" && <SharePanel docId={doc.id} initial={shareRows} />}
      <Editor id={doc.id} initialTitle={doc.title} initialContent={doc.content} readOnly={!canEdit(role)} />
    </main>
  );
}
