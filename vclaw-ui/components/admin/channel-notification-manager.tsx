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
    <Card>
      <CardHeader>
        <CardTitle>Thông báo Kênh / Giao dịch Ngân hàng</CardTitle>
        <CardDescription>
          Danh sách thông báo từ Zalo OA, bao gồm biến động số dư để đối soát đơn hàng.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Người gửi</TableHead>
                <TableHead>Loại tin / Trạng thái</TableHead>
                <TableHead>Nội dung gốc</TableHead>
                <TableHead className="text-right">Biến động (VNĐ)</TableHead>
                <TableHead>Khớp đơn hàng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    Không có thông báo nào.
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((n) => {
                  const isBankTx = n.amount !== null || n.balance !== null || n.description !== null;
                  const isMatched = Boolean(n.orderNumber);

                  return (
                    <TableRow key={n.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>{n.senderName || "Zalo OA"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          {isBankTx ? (
                            <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                              Giao dịch Ngân hàng
                            </Badge>
                          ) : (
                            <Badge variant="outline">Tin nhắn thường</Badge>
                          )}
                          {isBankTx && (
                            <span className="text-xs text-muted-foreground mt-1">
                              Dùng nội dung CK/Số tiền để đối soát.
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={n.rawMessage}>
                        {n.description ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{n.description}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">{n.rawMessage}</span>
                          </div>
                        ) : (
                          <span className="line-clamp-2">{n.rawMessage}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {n.amount ? (
                          <span
                            className={
                              n.amount > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"
                            }
                          >
                            {n.amount > 0 ? "+" : ""}
                            {formatCurrency(n.amount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {n.balance !== null && (
                          <div className="text-xs text-muted-foreground mt-1">
                            SD: {formatCurrency(n.balance)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isMatched ? (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            Khớp đơn: {n.orderNumber}
                          </Badge>
                        ) : isBankTx ? (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            Chưa khớp
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
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
