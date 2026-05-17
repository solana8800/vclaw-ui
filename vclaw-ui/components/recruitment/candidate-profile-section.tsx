"use client";

import React from "react";
import type { AdminHhContent } from "@/lib/admin/content";
import type { ExtractedProfileInfo } from "@/lib/recruitment/candidate-types";
import { hasExtractedProfileContent } from "@/lib/recruitment/candidate-profile";

type CandidateProfileSectionProps = {
  profileInfo: ExtractedProfileInfo;
  messages: AdminHhContent;
  matchSummary?: string | null;
  loading?: boolean;
};

function ProfileSubsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--foreground-muted)] mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function ProfileList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, idx) => (
        <li
          key={idx}
          className="text-sm text-[color:var(--foreground)] whitespace-pre-wrap leading-relaxed pl-2.5 border-l border-[color:var(--line)]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Hồ sơ LinkedIn — một khối, chia mục bằng divider. */
export function CandidateProfileSection({
  profileInfo,
  messages,
  matchSummary,
  loading,
}: CandidateProfileSectionProps) {
  const d = messages.candidates.detail;
  const aboutText =
    profileInfo.about && profileInfo.about !== "N/A" ? profileInfo.about.trim() : "";
  const hasProfile = hasExtractedProfileContent(profileInfo);
  const experiences = profileInfo.experiences ?? [];
  const education = profileInfo.education ?? [];
  const skills = profileInfo.skills ?? [];
  const projects = profileInfo.projects ?? [];
  const languages = profileInfo.languages ?? [];
  const recommendations = profileInfo.recommendations ?? [];
  const summaryText = matchSummary?.trim() ?? "";

  return (
    <section aria-labelledby="candidate-profile-heading">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3
          id="candidate-profile-heading"
          className="text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground-muted)]"
        >
          {d.profileSectionTitle}
        </h3>
        {profileInfo.scrapedAt ? (
          <span className="text-[10px] text-[color:var(--foreground-muted)] tabular-nums">
            {new Date(profileInfo.scrapedAt).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })}
          </span>
        ) : null}
      </div>

      <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            <div className="h-14 rounded-md bg-[color:var(--surface)] animate-pulse" />
            <div className="h-20 rounded-md bg-[color:var(--surface)] animate-pulse" />
          </div>
        ) : !hasProfile ? (
          <div className="p-4 text-sm text-[color:var(--foreground-muted)] leading-relaxed">
            <p>{d.noProfileData}</p>
            {summaryText ? (
              <div className="mt-3 pt-3 border-t border-[color:var(--line)]">
                <p className="text-[11px] font-semibold uppercase text-[color:var(--foreground-muted)] mb-1">
                  {d.searchMatchSummary}
                </p>
                <p className="text-sm text-[color:var(--foreground)]">{summaryText}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="px-4 divide-y divide-[color:var(--line)]">
            {aboutText ? (
              <ProfileSubsection title={d.about}>
                <p className="text-sm text-[color:var(--foreground)] whitespace-pre-wrap leading-relaxed">
                  {aboutText}
                </p>
              </ProfileSubsection>
            ) : null}

            {experiences.length > 0 ? (
              <ProfileSubsection title={d.experiences}>
                <ProfileList items={experiences} />
              </ProfileSubsection>
            ) : null}

            {education.length > 0 ? (
              <ProfileSubsection title={d.education}>
                <ProfileList items={education} />
              </ProfileSubsection>
            ) : null}

            {skills.length > 0 ? (
              <ProfileSubsection title={d.skills}>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-[color:var(--surface)] border border-[color:var(--line)] text-[color:var(--foreground)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </ProfileSubsection>
            ) : null}

            {projects.length > 0 ? (
              <ProfileSubsection title={d.projects}>
                <ProfileList items={projects} />
              </ProfileSubsection>
            ) : null}

            {languages.length > 0 ? (
              <ProfileSubsection title={d.languages}>
                <ProfileList items={languages} />
              </ProfileSubsection>
            ) : null}

            {recommendations.length > 0 ? (
              <ProfileSubsection title={d.recommendations}>
                <ProfileList items={recommendations} />
              </ProfileSubsection>
            ) : null}

            {summaryText && !aboutText ? (
              <ProfileSubsection title={d.searchMatchSummary}>
                <p className="text-sm text-[color:var(--foreground)] whitespace-pre-wrap leading-relaxed">
                  {summaryText}
                </p>
              </ProfileSubsection>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
