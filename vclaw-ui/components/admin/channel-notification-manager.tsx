"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/shared";
import type { ChannelNotification } from "@prisma/client";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

interface ChannelNotificationManagerProps {
  notifications: ChannelNotification[];
}

export function ChannelNotificationManager({
  notifications,
}: ChannelNotificationManagerProps) {
  return (
    <Card className="border-[color:var(--line)] bg-[color:var(--surface-soft)] shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-[color:var(--foreground-strong)]">
              Thông báo Kênh / Giao dịch Ngân hàng
            </CardTitle>
            <CardDescription className="text-sm text-[color:var(--muted)]">
              Danh sách thông báo từ Zalo OA và biến động số dư ngân hàng phục vụ đối soát.
            </CardDescription>
          </div>
          <Badge className="bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)] border-none">
            {notifications.length} thông báo
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--background)] overflow-hidden">
          <Table>
            <TableHeader className="bg-[color:var(--surface-soft)]">
              <TableRow className="border-[color:var(--line)] hover:bg-transparent">
                <TableHead className="w-[120px] font-semibold text-[color:var(--foreground-strong)]">Thời gian</TableHead>
                <TableHead className="font-semibold text-[color:var(--foreground-strong)]">Người gửi</TableHead>
                <TableHead className="font-semibold text-[color:var(--foreground-strong)]">Phân loại</TableHead>
                <TableHead className="font-semibold text-[color:var(--foreground-strong)]">Nội dung chi tiết</TableHead>
                <TableHead className="text-right font-semibold text-[color:var(--foreground-strong)]">Biến động (VNĐ)</TableHead>
                <TableHead className="font-semibold text-[color:var(--foreground-strong)]">Đối soát</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[color:var(--muted)] h-32">
                    Không có thông báo nào được ghi nhận.
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((n) => {
                  const isBankTx = n.amount !== null || n.balance !== null || n.description !== null;
                  const isMatched = Boolean(n.orderNumber);

                  return (
                    <TableRow key={n.id} className="border-[color:var(--line)] hover:bg-[color:var(--surface-soft)]/50 transition-colors">
                      <TableCell className="whitespace-nowrap text-sm text-[color:var(--muted)]">
                        {new Date(n.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium text-[color:var(--foreground-strong)]">
                        {n.senderName || "Hệ thống"}
                      </TableCell>
                      <TableCell>
                        {isBankTx ? (
                          <Badge variant="default" className="bg-blue-500/10 text-blue-500 border-blue-500/20 whitespace-nowrap hover:bg-blue-500/15">
                            Giao dịch NH
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[color:var(--muted)] border-[color:var(--line)] whitespace-nowrap">
                            Tin nhắn
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        {n.description ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-[color:var(--foreground-strong)] line-clamp-1">{n.description}</span>
                            <span className="text-xs text-[color:var(--muted)] line-clamp-1 italic">{n.rawMessage}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-[color:var(--foreground)] line-clamp-2">{n.rawMessage}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          {n.amount ? (
                            <span
                              className={cn(
                                "text-base font-bold tabular-nums",
                                n.amount > 0 ? "text-emerald-500" : "text-rose-500"
                              )}
                            >
                              {n.amount > 0 ? "+" : ""}
                              {formatCurrency(n.amount)}
                            </span>
                          ) : (
                            <span className="text-[color:var(--muted)]">-</span>
                          )}
                          {n.balance !== null && (
                            <div className="text-[10px] uppercase tracking-wider text-[color:var(--muted)] font-medium">
                              Số dư: {formatCurrency(n.balance)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isMatched ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                            Khớp: {n.orderNumber}
                          </Badge>
                        ) : isBankTx ? (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/5">
                            Chờ đối soát
                          </Badge>
                        ) : (
                          <span className="text-[color:var(--muted)] text-center block w-full">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
