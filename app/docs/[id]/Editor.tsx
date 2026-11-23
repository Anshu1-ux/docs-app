"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Props = { id: string; initialTitle: string; initialContent: string; readOnly: boolean };
type SavePayload = { title?: string; content?: string };

export default function Editor({ id, initialTitle, initialContent, readOnly }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(data: SavePayload) {
    setStatus("saving");
    try {
      const res = await fetch(`/api/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  function debounced(data: SavePayload) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(data), 800);
  }

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "prose-editor min-h-[400px] rounded border p-4 outline-none" },
    },
    onUpdate: ({ editor }) => debounced({ content: editor.getHTML() }),
  });

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const buttons = editor
    ? [
        { label: "B", active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
        { label: "I", active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
        { label: "U", active: editor.isActive("underline"), run: () => editor.chain().focus().toggleUnderline().run() },
        { label: "H1", active: editor.isActive("heading", { level: 1 }), run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
        { label: "H2", active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { label: "• List", active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
        { label: "1. List", active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
      ]
    : [];

  return (
    <div>
      <input
        value={title}
        disabled={readOnly}
        onChange={(e) => {
          setTitle(e.target.value);
          debounced({ title: e.target.value });
        }}
        className="mb-3 w-full text-2xl font-semibold outline-none"
        placeholder="Untitled document"
      />

      {!readOnly && (
        <div className="mb-3 flex flex-wrap gap-2">
          {buttons.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={b.run}
              className={`rounded border px-2 py-1 text-sm ${b.active ? "bg-black text-white" : ""}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      {readOnly && (
        <p className="mb-3 text-sm text-gray-500">View only: you can&apos;t edit this document.</p>
      )}

      <EditorContent editor={editor} />

      {!readOnly && (
        <p className="mt-2 text-xs text-gray-500">
          {status === "saving"
            ? "Saving…"
            : status === "error"
              ? "Save failed. Check your connection."
              : "All changes saved"}
        </p>
      )}
    </div>
  );
}