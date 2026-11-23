import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function signIn(formData: FormData) {
  "use server";
  const id = String(formData.get("userId"));
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;
  (await cookies()).set("uid", user.id, { httpOnly: true, path: "/" });
  redirect("/");
}

export default async function LoginPage() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-2 text-2xl font-semibold">Sign in as</h1>
      <p className="mb-6 text-sm text-gray-500">
        Demo accounts. No password is needed for this prototype.
      </p>
      <div className="space-y-3">
        {users.map((u) => (
          <form key={u.id} action={signIn}>
            <input type="hidden" name="userId" value={u.id} />
            <button className="w-full rounded border p-3 text-left hover:bg-gray-50">
              <div className="font-medium">{u.name}</div>
              <div className="text-sm text-gray-500">{u.email}</div>
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}