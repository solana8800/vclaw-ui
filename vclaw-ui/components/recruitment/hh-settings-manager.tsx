"use client";

import React from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Save,
  Users,
  Eye,
  EyeOff,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/ui-switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared";
import { AdminHhContent } from "@/lib/admin/content";
import type { RecruitmentSettings } from "@prisma/client";
import { upsertRecruitmentSettings } from "@/lib/actions/recruitment-settings-actions";
import { parseRecruitmentAutomation } from "@/lib/recruitment/automation-settings";
import { useRouter } from "next/navigation";
import {
  type LinkedInConnectionStatus,
  type LinkedInProfile,
  hasLinkedInSession,
  isLinkedInProfileLoggedIn,
  profileDisplayName,
  profileInitials,
} from "@/lib/recruitment/linkedin-types";
import {
  type LinkedInSessionSummary,
  sessionDisplayLabel,
} from "@/lib/recruitment/linkedin-session";

const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const LOGIN_POLL_INTERVAL_MS = 3000;
const LOGIN_POLL_MAX_ATTEMPTS = 40;

type HhSettingsManagerProps = {
  messages: AdminHhContent;
  initialSettings: RecruitmentSettings | null;
};

export function HhSettingsManager({ messages, initialSettings }: HhSettingsManagerProps) {
  const router = useRouter();
  const s = messages.settings;
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [linxaToken, setLinxaToken] = React.useState(initialSettings?.linxaToken || "");
  const [firecrawlToken, setFirecrawlToken] = React.useState(initialSettings?.firecrawlToken || "");
  const [linkedinCompanyUrl, setLinkedinCompanyUrl] = React.useState(
    initialSettings?.linkedinCompanyUrl || "",
  );
  const [linkedinSession, setLinkedinSession] = React.useState("");
  const [showLinxa, setShowLinxa] = React.useState(false);
  const [showFirecrawl, setShowFirecrawl] = React.useState(false);
  const [profile, setProfile] = React.useState<LinkedInProfile | null>(null);
  const [cdpReady, setCdpReady] = React.useState(false);
  const [gatewayReady, setGatewayReady] = React.useState(false);
  const [connectionStatus, setConnectionStatus] =
    React.useState<LinkedInConnectionStatus>("disconnected");
  const [sessionSummary, setSessionSummary] = React.useState<LinkedInSessionSummary | null>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const initialAutomation = parseRecruitmentAutomation(initialSettings);
  const [autoInviteOnMatch, setAutoInviteOnMatch] = React.useState(initialAutomation.autoInviteOnMatch);
  const [autoIntroOnAccept, setAutoIntroOnAccept] = React.useState(initialAutomation.autoIntroOnAccept);
  const [autoCollectOnPositive, setAutoCollectOnPositive] = React.useState(
    initialAutomation.autoCollectOnPositive,
  );
  const [autoRemindInterview, setAutoRemindInterview] = React.useState(
    initialAutomation.autoRemindInterview,
  );

  const pollCancelRef = React.useRef(false);
  const pollTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasLinxa = !!initialSettings?.linxaToken;
  const hasFirecrawl = !!initialSettings?.firecrawlToken;
  const isLoggedIn = isLinkedInProfileLoggedIn(profile);
  const hasSessionFile = Boolean(sessionSummary?.hasLiAt || hasLinkedInSession(linkedinSession));
  const showAsConnected = isLoggedIn || hasSessionFile;
  const displayName =
    profileDisplayName(profile) ||
    sessionDisplayLabel(sessionSummary, s.sessionLoggedInGeneric);
  const displayHeadline =
    (profile?.headline && profile.headline !== "N/A" ? profile.headline : null) ||
    sessionSummary?.headline ||
    null;
  const profileUrl =
    (profile?.url?.includes("/in/") ? profile.url : null) || sessionSummary?.profileUrl || null;
  const avatarUrl = profile?.avatarUrl || sessionSummary?.avatarUrl || null;
  const sessionUsername = sessionSummary?.username;

  const clearPollTimer = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const refreshConnection = React.useCallback(async () => {
    try {
      const { checkLinkedInConnection } = await import("@/lib/recruitment/actions");
      const res = await checkLinkedInConnection();
      setCdpReady(res.cdpReady);
      setGatewayReady(res.gatewayReady);

      if (res.sessionSummary) {
        setSessionSummary(res.sessionSummary);
      }

      if (res.sessionData) {
        setLinkedinSession(res.sessionData);
      }

      if (res.loggedIn || res.sessionSummary?.hasLiAt) {
        if (res.profile) setProfile(res.profile);
        setConnectionStatus("connected");
      } else {
        setConnectionStatus((prev) => (prev === "waiting_login" ? prev : "disconnected"));
      }
    } catch {
      setCdpReady(false);
      setGatewayReady(false);
    }
  }, []);

  const applyProfileResult = React.useCallback(
    async (res: {
      success?: boolean;
      loggedIn?: boolean;
      profile?: LinkedInProfile | null;
      sessionData?: string | null;
    }) => {
      if (res.profile && isLinkedInProfileLoggedIn(res.profile)) {
        setProfile(res.profile);
        setConnectionStatus("connected");

        if (res.sessionData) {
          setLinkedinSession(res.sessionData);
          const { saveLinkedInSession } = await import("@/lib/recruitment/actions");
          await saveLinkedInSession(res.sessionData);
        }
        return true;
      }
      return false;
    },
    [],
  );

  const fetchProfile = React.useCallback(async (): Promise<boolean> => {
    try {
      const { getLinkedInProfile } = await import("@/lib/recruitment/actions");
      const res = await getLinkedInProfile();
      if (await applyProfileResult(res)) return true;
      if (connectionStatus !== "waiting_login") {
        setProfile(null);
        setConnectionStatus("disconnected");
      }
      return false;
    } catch {
      if (connectionStatus !== "waiting_login") {
        setProfile(null);
      }
      return false;
    }
  }, [applyProfileResult, connectionStatus]);

  const pollForLogin = React.useCallback(() => {
    pollCancelRef.current = false;
    clearPollTimer();

    const attempt = async (n: number) => {
      if (pollCancelRef.current) return;

      const ok = await fetchProfile();
      if (ok) {
        toast.success(s.loginSuccess);
        setIsLoading(false);
        return;
      }

      if (n >= LOGIN_POLL_MAX_ATTEMPTS) {
        toast.error(s.loginTimeout);
        setConnectionStatus("disconnected");
        setIsLoading(false);
        return;
      }

      pollTimerRef.current = setTimeout(() => {
        void attempt(n + 1);
      }, LOGIN_POLL_INTERVAL_MS);
    };

    void attempt(0);
  }, [fetchProfile, s.loginSuccess, s.loginTimeout]);

  const cancelLoginWait = () => {
    pollCancelRef.current = true;
    clearPollTimer();
    setIsLoading(false);
    setConnectionStatus("disconnected");
  };

  React.useEffect(() => {
    void refreshConnection();
    return () => {
      pollCancelRef.current = true;
      clearPollTimer();
    };
  }, [refreshConnection]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { saveLinkedInSession } = await import("@/lib/recruitment/actions");
      await upsertRecruitmentSettings({
        linxaToken,
        firecrawlToken,
        linkedinCompanyUrl: linkedinCompanyUrl.trim() || null,
        autoInviteOnMatch,
        autoIntroOnAccept,
        autoCollectOnPositive,
        autoRemindInterview,
      });
      if (linkedinSession) {
        await saveLinkedInSession(linkedinSession);
      }
      toast.success(s.saveSuccess);
      router.refresh();
    } catch {
      toast.error(s.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenBrowser = async () => {
    if (!cdpReady) {
      toast.error(s.cdpNotReady);
      return;
    }
    if (!gatewayReady) {
      toast.error(s.gatewayNotReady);
      return;
    }

    setIsLoading(true);
    setConnectionStatus("waiting_login");
    pollCancelRef.current = false;
    clearPollTimer();

    try {
      const { openLinkedInBrowser } = await import("@/lib/recruitment/actions");
      const res = await openLinkedInBrowser();
      if (res.success) {
        toast.info(s.browserOpening);
        pollForLogin();
      } else {
        toast.error(res.error || s.browserError);
        setConnectionStatus("disconnected");
        setIsLoading(false);
      }
    } catch {
      toast.error(s.gatewayConnectError);
      setConnectionStatus("error");
      setIsLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    setIsLoading(true);
    await refreshConnection();
    const ok = await fetchProfile();
    setIsLoading(false);
    toast.success(ok ? s.profileRefreshDone : s.accountNotLinked);
  };

  const handleLoadFromFile = async () => {
    setIsLoading(true);
    try {
      const { readLocalLinkedInSession } = await import("@/lib/recruitment/actions");
      const res = await readLocalLinkedInSession();
      if (res.success && res.sessionData && res.summary?.hasLiAt) {
        setLinkedinSession(res.sessionData);
        setSessionSummary(res.summary);
        if (res.summary) {
          setProfile({
            loggedIn: true,
            name: res.summary.displayName || undefined,
            headline: res.summary.headline || undefined,
            url: res.summary.profileUrl || undefined,
            avatarUrl: res.summary.avatarUrl || undefined,
            sessionCookie: "from-file",
          });
        }
        setConnectionStatus("connected");
        toast.success(s.loadSessionSuccess);
      } else {
        toast.error(res.error || s.loadSessionError);
      }
    } catch {
      toast.error(s.loadSessionError);
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge = () => {
    if (connectionStatus === "waiting_login") {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black">
          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          {s.statusWaiting}
        </Badge>
      );
    }
    if (showAsConnected) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black">
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {s.statusConnected}
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 px-3 py-1 rounded-full text-[10px] font-black">
        {s.statusDisconnected}
      </Badge>
    );
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <Card className="relative z-10 border-[color:var(--line)] shadow-lg bg-[color:var(--surface)] overflow-visible">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#0a66c2]" />
              <CardTitle className="text-lg">{s.title}</CardTitle>
            </div>
            <CardDescription>{messages.description}</CardDescription>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 bg-[#0a66c2] hover:bg-[#004182] text-white h-11 shadow-lg shadow-blue-500/20 rounded-xl font-bold transition-all"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {s.saveCta}
          </Button>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="space-y-4 p-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/50">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-[#0a66c2] font-bold text-base">
                <LinkedInIcon className="h-5 w-5" />
                {s.linkedinSource}
              </Label>
              {statusBadge()}
            </div>

            {connectionStatus === "waiting_login" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-blue-800 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  {s.waitingForLogin}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] shrink-0"
                  onClick={cancelLoginWait}
                >
                  <X className="h-3 w-3 mr-1" />
                  {s.cancelLoginWait}
                </Button>
              </div>
            )}

            <div className="grid gap-6">
              <div className="flex flex-col md:flex-row gap-6 items-start justify-between p-5 rounded-xl bg-white border border-[#0a66c2]/20 shadow-sm">
                <div className="space-y-3 max-w-md flex-1">
                  <p className="font-bold text-sm text-[color:var(--foreground-strong)]">{s.syncWeb}</p>

                  <div className="pt-2">
                    {showAsConnected ? (
                      <div className="flex gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm animate-in fade-in duration-300">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="h-12 w-12 rounded-full object-cover border-2 border-white shadow"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-[#0a66c2] text-white flex items-center justify-center text-sm font-bold shrink-0">
                            {profileInitials(displayName)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-base font-bold text-emerald-900 leading-tight">
                            {displayName === s.sessionLoggedInGeneric
                              ? s.sessionLoggedInGeneric
                              : s.linkedinConnectedAs.replace("{account}", displayName)}
                          </p>
                          {sessionUsername && !profileDisplayName(profile) && (
                            <p className="text-xs text-emerald-800/90">
                              {s.sessionUsername.replace("{username}", sessionUsername)}
                            </p>
                          )}
                          {displayHeadline && (
                            <p className="text-xs text-emerald-800/80 line-clamp-2">{displayHeadline}</p>
                          )}
                          <p className="text-[11px] text-emerald-700/90 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            {s.sessionFromFile}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {profileUrl && (
                              <a
                                href={profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-semibold text-[#0a66c2] hover:underline inline-flex items-center gap-1"
                              >
                                {s.viewProfile}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/50"
                              onClick={handleRefreshProfile}
                              disabled={isLoading || !gatewayReady || !cdpReady}
                            >
                              {s.refreshProfile}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 shadow-sm">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          <span className="text-xs font-bold">{s.accountNotLinked}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-amber-600 hover:text-amber-800 hover:bg-amber-100/50"
                            onClick={handleRefreshProfile}
                            disabled={isLoading}
                          >
                            {s.recheckProfile}
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] border-indigo-200 text-indigo-600 hover:bg-indigo-50 w-fit"
                          onClick={handleLoadFromFile}
                          disabled={isLoading}
                        >
                          {s.loadSessionFromFile}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    onClick={handleOpenBrowser}
                    disabled={isLoading || !cdpReady || !gatewayReady}
                    className="bg-[#0a66c2] text-white hover:bg-[#004182] px-6 h-11 rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <LinkedInIcon className="h-4 w-4 mr-2 fill-current" />
                    )}
                    {isLoading ? s.browserRunning : showAsConnected ? s.reloginCta : s.openBrowser}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 px-1 pt-2 border-t border-[color:var(--line)]">
                <Label htmlFor="linkedin-company-url" className="text-sm font-bold text-[color:var(--foreground-strong)]">
                  {s.linkedinCompanyUrl}
                </Label>
                <Input
                  id="linkedin-company-url"
                  type="url"
                  placeholder={s.linkedinCompanyUrlPlaceholder}
                  className="h-11 rounded-lg bg-[color:var(--surface)] border-[color:var(--line-strong)]"
                  value={linkedinCompanyUrl}
                  onChange={(e) => setLinkedinCompanyUrl(e.target.value)}
                />
                <p className="text-[11px] text-[color:var(--muted)] font-medium leading-relaxed">
                  {s.linkedinCompanyUrlDesc}
                </p>
              </div>

              <div className="space-y-3 px-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-[color:var(--foreground-strong)]">{s.linxaToken}</Label>
                  <Badge
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      hasLinxa
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    )}
                  >
                    {hasLinxa ? s.statusSaved : s.statusMissing}
                  </Badge>
                </div>
                <div className="relative">
                  <Input
                    type={showLinxa ? "text" : "password"}
                    placeholder="linxa_..."
                    className={cn(
                      "h-11 rounded-lg bg-[color:var(--surface)] border-[color:var(--line-strong)] focus:ring-2 focus:ring-blue-500/20 pr-11",
                      !showLinxa && "font-mono",
                    )}
                    value={linxaToken}
                    onChange={(e) => setLinxaToken(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLinxa(!showLinxa)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-[color:var(--muted)] hover:bg-[color:var(--surface-soft)] rounded-lg transition-colors"
                  >
                    {showLinxa ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[color:var(--muted)] font-medium">
                  {s.linxaTokenDesc}{" "}
                  <a
                    href="https://app.uselinxa.com/setup-mcp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0a66c2] hover:text-[#004182] hover:underline inline-flex items-center gap-1"
                  >
                    app.uselinxa.com/setup-mcp
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </p>
              </div>

              <div className="space-y-3 px-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-[color:var(--foreground-strong)]">{s.firecrawlToken}</Label>
                  <Badge
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      hasFirecrawl
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    )}
                  >
                    {hasFirecrawl ? s.statusSaved : s.statusMissing}
                  </Badge>
                </div>
                <div className="relative">
                  <Input
                    type={showFirecrawl ? "text" : "password"}
                    placeholder="fc-..."
                    className={cn(
                      "h-11 rounded-lg bg-[color:var(--surface)] border-[color:var(--line-strong)] focus:ring-2 focus:ring-blue-500/20 pr-11",
                      !showFirecrawl && "font-mono",
                    )}
                    value={firecrawlToken}
                    onChange={(e) => setFirecrawlToken(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFirecrawl(!showFirecrawl)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-[color:var(--muted)] hover:bg-[color:var(--surface-soft)] rounded-lg transition-colors"
                  >
                    {showFirecrawl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[color:var(--muted)] font-medium">
                  {s.firecrawlTokenDesc}{" "}
                  <a
                    href="https://www.firecrawl.dev/app/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0a66c2] hover:text-[#004182] hover:underline inline-flex items-center gap-1"
                  >
                    firecrawl.dev/app/api-keys
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)]/50">
            <Label className="flex items-center gap-2 text-indigo-600 font-bold text-base">
              <Zap className="h-5 w-5" />
              {s.automation}
            </Label>
            <p className="text-xs text-[color:var(--muted)] font-medium px-1">{s.automationDesc}</p>

            <div className="space-y-3 pt-2">
              {(
                [
                  {
                    key: "autoInviteOnMatch",
                    label: s.rules.autoInvite,
                    desc: s.rules.autoInviteDesc,
                    checked: autoInviteOnMatch,
                    onCheckedChange: setAutoInviteOnMatch,
                  },
                  {
                    key: "autoIntroOnAccept",
                    label: s.rules.autoIntro,
                    desc: s.rules.autoIntroDesc,
                    checked: autoIntroOnAccept,
                    onCheckedChange: setAutoIntroOnAccept,
                  },
                  {
                    key: "autoCollectOnPositive",
                    label: s.rules.autoCollect,
                    desc: s.rules.autoCollectDesc,
                    checked: autoCollectOnPositive,
                    onCheckedChange: setAutoCollectOnPositive,
                  },
                  {
                    key: "autoRemindInterview",
                    label: s.rules.autoRemind,
                    desc: s.rules.autoRemindDesc,
                    checked: autoRemindInterview,
                    onCheckedChange: setAutoRemindInterview,
                  },
                ] as const
              ).map((rule) => (
                <div
                  key={rule.key}
                  className="flex items-center justify-between p-4 rounded-xl bg-[color:var(--surface)] border border-[color:var(--line)]"
                >
                  <div className="space-y-1 pr-4">
                    <p className="text-sm font-bold text-[color:var(--foreground-strong)]">{rule.label}</p>
                    <p className="text-xs text-[color:var(--muted)]">{rule.desc}</p>
                  </div>
                  <Switch
                    checked={rule.checked}
                    onCheckedChange={rule.onCheckedChange}
                    aria-label={rule.label}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
