import Link from "next/link";
import type { AdminGuideContent } from "@/lib/admin-content";

export function OperatorGuideView({
  content,
  resolvePath,
}: {
  content: AdminGuideContent;
  resolvePath: (path: string) => string;
}) {
  return (
    <div className="space-y-10 text-[color:var(--foreground-strong)]">
      {content.intro ? (
        <p className="text-sm leading-relaxed text-[color:var(--muted)]">{content.intro}</p>
      ) : null}

      <header className="space-y-2">
        <h2 className="text-xl font-bold">{content.realtimeHeading}</h2>
        <p className="text-sm leading-relaxed text-[color:var(--muted)]">{content.realtimeIntro}</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[color:var(--foreground)]">
          {content.realtimeBullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{content.firstSale.title}</h2>
        <div className="overflow-x-auto rounded-2xl border border-[color:var(--line)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[color:var(--surface-soft)] text-xs uppercase text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3">{content.firstSale.colStep}</th>
                <th className="px-4 py-3">{content.firstSale.colYou}</th>
                <th className="px-4 py-3">{content.firstSale.colBot}</th>
                <th className="px-4 py-3">{content.firstSale.colOpen}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {content.firstSale.rows.map((row) => (
                <tr key={row.path} className="align-top">
                  <td className="px-4 py-3 font-semibold">{row.step}</td>
                  <td className="px-4 py-3 text-[color:var(--muted)]">{row.you}</td>
                  <td className="px-4 py-3 text-[color:var(--muted)]">{row.bot}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={resolvePath(row.path)}
                      className="font-semibold text-[color:var(--brand)] underline-offset-2 hover:underline"
                    >
                      {row.linkLabel}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{content.botHeading}</h2>
        <p className="text-sm text-[color:var(--muted)]">{content.botIntro}</p>
        <ul className="space-y-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 text-sm">
          {content.botExamples.map((ex) => (
            <li key={ex.phrase}>
              <span className="font-mono text-[color:var(--brand-strong)]">{ex.phrase}</span>
              <span className="text-[color:var(--muted)]"> — </span>
              <span>{ex.result}</span>
            </li>
          ))}
        </ul>
      </section>

      {content.systemConfig ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">{content.systemConfig.title}</h2>
          <p className="text-sm text-[color:var(--muted)]">{content.systemConfig.intro}</p>
          <div className="overflow-x-auto rounded-2xl border border-[color:var(--line)]">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-[color:var(--surface-soft)] text-xs uppercase text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-3">{content.systemConfig.colArea}</th>
                  <th className="px-4 py-3">{content.systemConfig.colLive}</th>
                  <th className="px-4 py-3">{content.systemConfig.colPilot}</th>
                  <th className="px-4 py-3">{content.systemConfig.colOpen}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {content.systemConfig.rows.map((row) => (
                  <tr key={row.path} className="align-top">
                    <td className="px-4 py-3 font-semibold">{row.name}</td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">{row.live}</td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">{row.pilot}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={resolvePath(row.path)}
                        className="font-semibold text-[color:var(--brand)] underline-offset-2 hover:underline"
                      >
                        {row.linkLabel}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {content.botRoadmap ? (
        <section className="space-y-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-5">
          <h2 className="text-xl font-bold">{content.botRoadmap.title}</h2>
          <p className="text-sm text-[color:var(--muted)]">{content.botRoadmap.intro}</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[color:var(--foreground)]">
            {content.botRoadmap.bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{content.laterHeading}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[color:var(--muted)]">
          {content.laterBullets.map((b) => (
            <li key={b.title}>
              <strong className="text-[color:var(--foreground-strong)]">{b.title}</strong>
              {": "}
              {b.body}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 text-sm text-[color:var(--muted)]">
        <strong className="text-[color:var(--foreground-strong)]">{content.seedTitle}</strong>
        <p className="mt-2">{content.seedBody}</p>
      </section>
    </div>
  );
}
