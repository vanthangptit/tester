import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
  onBlur?: () => void;
}

// Chip-style multi-value input. Enter or comma commits the draft; Backspace on
// an empty draft removes the last chip. Duplicates are ignored.
export function TagInput({ value, onChange, id, placeholder, invalid, onBlur }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 dark:bg-zinc-950",
        "focus-within:ring-2 focus-within:ring-indigo-400 focus-within:ring-offset-2 dark:ring-offset-zinc-950 dark:focus-within:ring-indigo-500",
        invalid ? "border-red-400 dark:border-red-500" : "border-zinc-200 dark:border-zinc-800",
      )}
    >
      {value.map((tag, index) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300"
        >
          {tag}
          <button
            type="button"
            aria-label={`Xóa ${tag}`}
            onClick={() => removeAt(index)}
            className="cursor-pointer text-violet-400 hover:text-violet-700 dark:hover:text-violet-200"
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        placeholder={value.length === 0 ? placeholder : ""}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            removeAt(value.length - 1);
          }
        }}
        onBlur={() => {
          commit();
          onBlur?.();
        }}
        className="min-w-24 flex-1 bg-transparent px-1 text-sm text-zinc-900 outline-hidden placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
      />
    </div>
  );
}
