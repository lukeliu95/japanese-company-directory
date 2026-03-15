"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface SearchBoxProps {
  size?: "lg" | "sm";
  defaultValue?: string;
}

export default function SearchBox({
  size = "lg",
  defaultValue = "",
}: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const isLarge = size === "lg";

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="会社検索"
      className={`flex w-full mx-auto ${isLarge ? "max-w-2xl" : "max-w-md"}`}
    >
      <label htmlFor="search-input" className="sr-only">
        検索キーワード
      </label>
      <input
        id="search-input"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="会社名・キーワードで検索"
        className={`flex-1 rounded-l-lg border border-r-0 border-slate-300 bg-white text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 ${
          isLarge ? "px-5 py-3 text-base" : "px-3 py-2 text-sm"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-r-lg bg-blue-600 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 ${
          isLarge ? "px-6 py-3 text-base" : "px-4 py-2 text-sm"
        }`}
      >
        検索
      </button>
    </form>
  );
}
