import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import UploadButton from "./UploadButton";

export const dynamic = "force-dynamic";

async function createDoc() {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const doc = await prisma.document.create({ data: { ownerId: user.id } });
  redirect(`/docs/${doc.id}`);
}

async function signOut() {
  "use server";
  (await cookies()).delete("uid");
  redirect("/login");
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const owned = await prisma.document.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  const shared = await prisma.share.findMany({
    where: { userId: user.id },
    include: { document: { include: { owner: true } } },
    orderBy: { document: { updatedAt: "desc" } },
  });

  return (
    <main className="mx-auto max-w-3xl p-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <div className="flex items-center gap-3 text-sm">
          <span>Signed in as <b>{user.name}</b></span>
          <form action={signOut}><button className="underline">Switch user</button></form>
        </div>
      </header>

      <div className="mb-2 flex flex-wrap items-start gap-3">
        <form action={createDoc}>
          <button className="rounded bg-black px-4 py-2 text-white">+ New document</button>
        </form>
        <UploadButton />
      </div>
      <p className="mb-8 text-xs text-gray-500">Supported imports: .txt, .md, .docx (max 2 MB)</p>

      <h2 className="mb-2 font-medium">My documents</h2>
      <ul className="mb-8 divide-y rounded border">
        {owned.length === 0 && <li className="p-3 text-sm text-gray-500">No documents yet.</li>}
        {owned.map((d) => (
          <li key={d.id} className="p-3">
            <Link href={`/docs/${d.id}`} className="hover:underline">{d.title}</Link>
            <span className="ml-2 rounded bg-green-600 px-2 py-0.5 text-xs text-white">Owned</span>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 font-medium">Shared with me</h2>
      <ul className="divide-y rounded border">
        {shared.length === 0 && <li className="p-3 text-sm text-gray-500">Nothing shared with you yet.</li>}
        {shared.map((s) => (
          <li key={s.id} className="p-3">
            <Link href={`/docs/${s.documentId}`} className="hover:underline">{s.document.title}</Link>
            <span className="ml-2 rounded bg-blue-600 px-2 py-0.5 text-xs text-white">
              Shared by {s.document.owner.name} · {s.role.toLowerCase()}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
