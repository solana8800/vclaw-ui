import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type SiteFooterProps = {
  locale: AppLocale;
};

export async function SiteFooter({ locale }: SiteFooterProps) {
  const tFooter = await getTranslations({ locale, namespace: "common.footer" });
  const tNavigation = await getTranslations({ locale, namespace: "navigation" });
  const year = new Date().getFullYear().toString();

  return (
    <footer className="border-t border-[color:var(--line)]/40 bg-[color:var(--surface-sunken)]/50 py-6 md:py-8 backdrop-blur-sm">
      <div className="vclaw-page-shell py-4 sm:py-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Left: Logo & Copyright */}
          <div className="flex flex-col items-center gap-3 md:flex-row md:gap-6">
            <Link href="/" className="flex items-center gap-2 text-[color:var(--foreground-strong)] transition hover:opacity-80">
              <Image
                src="/vclaw-logo.png"
                alt="VClaw Logo"
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-lg shadow-[0_12px_24px_-12px_var(--brand-glow)]"
              />
              <span className="text-sm font-bold tracking-tight">VClaw</span>
            </Link>
            <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] opacity-70">
              {tFooter("copyright", { year })}
            </p>
          </div>

          {/* Right: Navigation Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link
              href="/docs"
              className="text-xs font-medium text-[color:var(--muted)] transition hover:text-[color:var(--brand)]"
            >
              {tFooter("docs.title")}
            </Link>
            <Link
              href="/admin"
              className="text-xs font-medium text-[color:var(--muted)] transition hover:text-[color:var(--brand)]"
            >
              {tFooter("product.admin")}
            </Link>
            <Link
              href="/#features"
              className="text-xs font-medium text-[color:var(--muted)] transition hover:text-[color:var(--brand)]"
            >
              {tFooter("product.features")}
            </Link>
            <Link
              href="/privacy"
              className="text-xs font-medium text-[color:var(--muted)] transition hover:text-[color:var(--brand)]"
            >
              {tFooter("privacy")}
            </Link>
            <Link
              href="/terms"
              className="text-xs font-medium text-[color:var(--muted)] transition hover:text-[color:var(--brand)]"
            >
              {tFooter("terms")}
            </Link>
            <div className="flex items-center gap-3 border-l border-[color:var(--line)] pl-6">
              <a
                href="https://github.com/solana8800"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--muted)] transition hover:text-[color:var(--foreground-strong)]"
                title="GitHub"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.987 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.696 1.027 1.59 1.027 2.683 0 3.847-2.337 4.694-4.566 4.942.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/solana8800"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--muted)] transition hover:text-[#0A66C2]"
                title="LinkedIn"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
