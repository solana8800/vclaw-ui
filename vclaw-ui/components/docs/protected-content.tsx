"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, AlertCircle } from "lucide-react";
import { MarkdownViewer, type MermaidToolbarLabels } from "@/components/docs/markdown-viewer";

type ProtectedContentProps = {
  slug: string;
  content: string;
  expectedPassword: string;
  mermaidLabels: MermaidToolbarLabels;
  labels: {
    title: string;
    description: string;
    placeholder: string;
    button: string;
    error: string;
  };
};

export function ProtectedContent({
  slug,
  content,
  expectedPassword,
  mermaidLabels,
  labels,
}: ProtectedContentProps) {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(false);

  // Key for sessionStorage to persist unlocking within a session
  const storageKey = `vclaw_doc_unlocked_${slug}`;

  useEffect(() => {
    const unlocked = sessionStorage.getItem(storageKey);
    if (unlocked === "true") {
      setIsUnlocked(true);
    }
  }, [storageKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === expectedPassword) {
      setIsUnlocked(true);
      setError(false);
      sessionStorage.setItem(storageKey, "true");
    } else {
      setError(true);
      setPassword("");
    }
  };

  if (isUnlocked) {
    return <MarkdownViewer content={content} mermaidToolbar={mermaidLabels} />;
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 shadow-[0_32px_70px_-54px_var(--shadow-color)] rounded-[2rem] bg-[color:var(--surface-glass)] border border-[color:var(--line)] backdrop-blur-sm">
      <div className="mb-6 rounded-full bg-[color:var(--brand-soft)] p-4 text-[color:var(--brand-strong)]">
        <Lock className="h-10 w-10" />
      </div>
      
      <h2 className="text-2xl font-bold text-[color:var(--foreground-strong)] mb-2">
        {labels.title}
      </h2>
      <p className="text-[color:var(--muted)] text-center max-w-md mb-8">
        {labels.description}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(false);
            }}
            placeholder={labels.placeholder}
            className={`w-full px-5 py-3 rounded-2xl bg-[color:var(--surface)] border ${
              error ? "border-red-500 ring-4 ring-red-500/10" : "border-[color:var(--line-strong)] focus:border-[color:var(--brand)]"
            } outline-none transition-all text-center text-lg tracking-widest font-mono`}
            autoFocus
          />
          {error && (
            <div className="absolute -bottom-6 left-0 right-0 text-center text-sm text-red-500 flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {labels.error}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          className="w-full py-4 rounded-2xl font-bold text-lg bg-[image:var(--brand-gradient)] text-[color:var(--brand-contrast)] shadow-[0_20px_40px_-20px_var(--brand-glow)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Unlock className="h-5 w-5" />
          {labels.button}
        </button>
      </form>
      
      <div className="mt-8 text-xs text-[color:var(--muted)] opacity-50 uppercase tracking-widest">
        Dự án VClaw • Private Strategy Doc
      </div>
    </div>
  );
}
