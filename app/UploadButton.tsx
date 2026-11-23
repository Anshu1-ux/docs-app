"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadButton() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/import", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!res.ok) return setError(data.error ?? "Upload failed");
    router.push(`/docs/${data.id}`);
  }

  return (
    <div>
      <input ref={input} type="file" accept=".txt,.md,.docx" onChange={onPick} className="hidden" />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="rounded border px-4 py-2 disabled:opacity-50"
      >
        {busy ? "Importing…" : "Upload .txt / .md / .docx"}
      </button>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
