"use client";

import type { CandidateJdEvaluation } from "@/lib/recruitment/candidate-jd-evaluation";
import type { AdminHhContent } from "@/lib/admin/content";

type CandidateAiEvaluationPanelProps = {
  evaluation: CandidateJdEvaluation;
  messages: AdminHhContent;
};

function scoreBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-400";
}

export function CandidateAiEvaluationPanel({
  evaluation,
  messages,
}: CandidateAiEvaluationPanelProps) {
  const d = messages.candidates.detail;

  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground-muted)]">
          {d.aiEvaluationTitle}
        </p>
        <span className="text-2xl font-bold text-emerald-700 tabular-nums">
          {evaluation.overallScore}%
        </span>
      </div>

      {evaluation.criteria.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-[color:var(--foreground-muted)]">{d.aiCriteria}</p>
          <ul className="space-y-2.5">
            {evaluation.criteria.map((c) => (
              <li key={c.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-[color:var(--foreground)]">{c.label}</span>
                  <span className="tabular-nums text-[color:var(--foreground-muted)]">{c.score}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[color:var(--line)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${scoreBarColor(c.score)}`}
                    style={{ width: `${c.score}%` }}
                  />
                </div>
                {c.note ? (
                  <p className="text-[11px] text-[color:var(--foreground-muted)] leading-snug">{c.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.strengths.length > 0 && (
        <div>
          <p className="text-xs font-medium text-emerald-800 mb-1.5">{d.aiStrengths}</p>
          <ul className="text-xs text-[color:var(--foreground)] space-y-1 list-disc pl-4">
            {evaluation.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.concerns.length > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-800 mb-1.5">{d.aiConcerns}</p>
          <ul className="text-xs text-[color:var(--foreground)] space-y-1 list-disc pl-4">
            {evaluation.concerns.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg bg-[color:var(--surface)] border border-[color:var(--line)] p-3">
        <p className="text-xs font-semibold uppercase text-[color:var(--foreground-muted)] mb-1.5">
          {d.aiConclusion}
        </p>
        <p className="text-sm whitespace-pre-wrap break-words text-[color:var(--foreground)] leading-relaxed">
          {evaluation.conclusion}
        </p>
      </div>
    </div>
  );
}
