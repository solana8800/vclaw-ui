"use client";

import React from "react";
import { 
  ShieldCheck, 
  Bot, 
  Zap, 
  Save,
  CheckCircle2,
  AlertCircle,
  Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/ui-switch";
import { Badge } from "@/components/ui/badge";
import type { AdminMessages } from "@/lib/admin/content";

const LinkedInIcon = (props: any) => (
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

type HhSettingsManagerProps = {
  messages: AdminMessages["recruitment"];
};

export function HhSettingsManager({ messages }: HhSettingsManagerProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--foreground-strong)]">{messages.settings.title}</h2>
          <p className="text-[color:var(--muted)]">Quản lý kết nối LinkedIn và hành vi của Agent tuyển dụng.</p>
        </div>
        <Button className="bg-[color:var(--brand-strong)] text-white gap-2 px-6">
          <Save className="h-4 w-4" />
          {messages.settings.saveCta}
        </Button>
      </div>

      <Tabs defaultValue="linkedin" className="space-y-6">
        <TabsList className="bg-[color:var(--surface-soft)] p-1 rounded-xl w-full justify-start overflow-x-auto">
          <TabsTrigger value="linkedin" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-[color:var(--surface)] data-[state=active]:shadow-sm">
            <LinkedInIcon className="h-4 w-4" />
            {messages.settings.linkedinAccount}
          </TabsTrigger>
          <TabsTrigger value="proxy" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-[color:var(--surface)] data-[state=active]:shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            {messages.settings.proxy}
          </TabsTrigger>
          <TabsTrigger value="persona" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-[color:var(--surface)] data-[state=active]:shadow-sm">
            <Bot className="h-4 w-4" />
            {messages.settings.aiPersona}
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-[color:var(--surface)] data-[state=active]:shadow-sm">
            <Zap className="h-4 w-4" />
            {messages.settings.automation}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="linkedin">
          <Card className="border border-[color:var(--line)] bg-[color:var(--surface)] overflow-hidden">
            <CardHeader className="bg-[color:var(--surface-soft)]/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kết nối LinkedIn</CardTitle>
                  <CardDescription>Cấu hình tài khoản để Agent có thể quét dữ liệu</CardDescription>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {messages.settings.statusConnected}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="li_user">Tài khoản (Email/SĐT)</Label>
                  <Input id="li_user" defaultValue="recruiter.vclaw@company.com" className="bg-[color:var(--surface-soft)]" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="li_pass">Mật khẩu / App Password</Label>
                  <div className="relative">
                    <Input id="li_pass" type="password" defaultValue="********" className="bg-[color:var(--surface-soft)] pr-10" />
                    <Key className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--muted)]" />
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 leading-relaxed">
                  Để đảm bảo an toàn cho tài khoản, chúng tôi khuyến khích sử dụng <strong>App Password</strong> hoặc kích hoạt xác thực 2 lớp qua Proxy riêng.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proxy">
          <Card className="border border-[color:var(--line)] bg-[color:var(--surface)]">
            <CardHeader>
              <CardTitle>Proxy Tuyển dụng</CardTitle>
              <CardDescription>Tránh bị LinkedIn chặn (Rate limit) khi quét diện rộng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border border-[color:var(--line)]">
                <div className="flex items-center gap-3">
                  <LinkedInIcon className="h-5 w-5 text-[color:var(--brand-strong)]" />
                  <div>
                    <p className="text-sm font-semibold">Tự động sử dụng Proxy VClaw</p>
                    <p className="text-xs text-[color:var(--muted)]">Khuyên dùng để tối ưu tốc độ và bảo mật</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="grid gap-2 opacity-50 pointer-events-none">
                <Label>Proxy tùy chỉnh (HTTP/SOCKS5)</Label>
                <Input placeholder="ip:port:user:pass" className="bg-[color:var(--surface-soft)]" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="persona">
          <Card className="border border-[color:var(--line)] bg-[color:var(--surface)]">
            <CardHeader>
              <CardTitle>Tính cách & Giọng văn Agent</CardTitle>
              <CardDescription>Cách Agent nhắn tin làm quen với ứng viên</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Độ chuyên nghiệp</Label>
                  <span className="text-xs font-medium text-[color:var(--brand-strong)]">Professional (80%)</span>
                </div>
                <input type="range" className="w-full h-2 bg-[color:var(--surface-soft)] rounded-lg appearance-none cursor-pointer accent-[color:var(--brand-strong)]" defaultValue="80" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Tốc độ phản hồi</Label>
                  <span className="text-xs font-medium text-[color:var(--brand-strong)]">Natural (Chậm)</span>
                </div>
                <input type="range" className="w-full h-2 bg-[color:var(--surface-soft)] rounded-lg appearance-none cursor-pointer accent-[color:var(--brand-strong)]" defaultValue="30" />
              </div>

              <div className="grid gap-2">
                <Label>Ghi chú thêm cho Agent</Label>
                <Input placeholder="Ví dụ: Ưu tiên dùng đại từ 'Mình' và 'Bạn', giọng văn thân thiện..." className="bg-[color:var(--surface-soft)]" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card className="border border-[color:var(--line)] bg-[color:var(--surface)]">
            <CardHeader>
              <CardTitle>Quy tắc tự động</CardTitle>
              <CardDescription>Xác định khi nào Agent tự thực hiện hành động</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Tự động gửi lời mời kết bạn", desc: "Khi tìm thấy ứng viên khớp trên 80%" },
                { label: "Tự động nhắn tin chào mừng", desc: "Ngay khi ứng viên chấp nhận kết bạn" },
                { label: "Tự động lấy CV / Email", desc: "Khi ứng viên phản hồi tích cực" },
                { label: "Tự động đặt lịch phỏng vấn", desc: "Tích hợp với lịch Google/Outlook" },
              ].map((rule, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-[color:var(--surface-soft)] transition-colors border border-transparent hover:border-[color:var(--line)]">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold">{rule.label}</p>
                    <p className="text-xs text-[color:var(--muted)]">{rule.desc}</p>
                  </div>
                  <Switch defaultChecked={i < 2} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
