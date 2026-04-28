"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Send, FileText, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { enqueueAutomationJob } from "@/lib/actions/automation-actions";

export function CampaignDraftForm() {
  const t = useTranslations("admin.automation.campaign");
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("zalo");
  const [content, setContent] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    startTransition(async () => {
      await enqueueAutomationJob(title, channel, content);
      setTitle("");
      setContent("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  return (
    <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-[color:var(--brand)]" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          Tạo chiến dịch nhắn tin hàng loạt hoặc đăng bài. Yêu cầu sẽ được xếp vào hàng đợi chờ duyệt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[color:var(--muted)]">{t("channel")}</label>
            <select 
              value={channel} 
              onChange={(e) => setChannel(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="zalo">Zalo</option>
              <option value="messenger">Messenger</option>
              <option value="post">Bài đăng Facebook</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[color:var(--muted)]">{t("titleLabel")}</label>
            <input 
              type="text"
              placeholder={t("titlePlaceholder")} 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[color:var(--muted)]">{t("contentLabel")}</label>
            <textarea 
              placeholder={t("contentPlaceholder")} 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
              className="flex min-h-[80px] w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white" 
            disabled={isPending || !title.trim() || !content.trim()}
          >
            {isPending ? (
              "Đang lưu..."
            ) : success ? (
              <span className="text-green-300 font-bold">{t("success")}</span>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                {t("submit")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
