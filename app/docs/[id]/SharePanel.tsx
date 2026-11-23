"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ShareRow = { userId: string; name: string; email: string; role: "VIEWER" | "EDITOR" };

export default function SharePanel({ docId, initial }: { docId: string; initial: ShareRow[] }) {
  const router = useRouter();
  const [shares, setShares] = useState(initial);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/docs/${docId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg(data.error ?? "Something went wrong");
    setShares((prev) => [...prev.filter((s) => s.userId !== data.userId), data]);
    setEmail("");
    setMsg(`Shared with ${data.name} as ${data.role.toLowerCase()}`);
    router.refresh();
  }

  async function remove(userId: string) {
    const res = await fetch(`/api/docs/${docId}/share`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setShares((prev) => prev.filter((s) => s.userId !== userId));
      router.refresh();
    }
  }

  return (
    <section className="mb-6 rounded border p-4">
      <h2 className="mb-2 font-medium">Share</h2>
      <div className="flex flex-wrap gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="bob@example.com"
          className="flex-1 rounded border bg-transparent px-2 py-1 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "VIEWER" | "EDITOR")}
          className="rounded border bg-transparent px-2 py-1 text-sm"
        >
          <option value="VIEWER">Can view</option>
          <option value="EDITOR">Can edit</option>
        </select>
        <button
          onClick={add}
          disabled={busy || !email}
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
        >
          Share
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-gray-500">{msg}</p>}
      <ul className="mt-3 space-y-1 text-sm">
        {shares.length === 0 && <li className="text-gray-500">Not shared with anyone yet.</li>}
        {shares.map((s) => (
          <li key={s.userId} className="flex items-center justify-between">
            <span>{s.name} ({s.email}) · {s.role.toLowerCase()}</span>
            <button onClick={() => remove(s.userId)} className="text-xs underline">Remove</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
