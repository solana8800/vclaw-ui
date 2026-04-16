"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function BillVerificationManager({ messages }: { messages: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = () => {
    setIsProcessing(true);
    // Simulate OCR processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setHasExtracted(true);
    }, 2000);
  };

  return (
    <div className="grid gap-6 mt-6">
      <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-lg overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--brand)]" />
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-[color:var(--brand-soft)] rounded-xl py-12 px-4 transition-colors hover:bg-[color:var(--surface-soft)] text-center cursor-pointer">
            <div className="rounded-full bg-[color:var(--brand-soft)] p-4 mb-4">
              <Upload className="h-6 w-6 text-[color:var(--brand)]" />
            </div>
            <h4 className="text-sm font-semibold text-[color:var(--foreground-strong)] mb-1">
              {messages?.uploadLabel || "Upload transfer screenshot"}
            </h4>
            <p className="text-xs text-[color:var(--muted)] mb-4">
              {messages?.orDragDrop || "or drag and drop image here"}
            </p>
            <Button
              className="bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] text-white"
              onClick={handleUpload}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <FileText className="h-4 w-4 mr-2 animate-bounce" />
                  {messages?.extracting || "Extracting information..."}
                </>
              ) : (
                "Chọn ảnh hóa đơn"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasExtracted && (
        <div className="grid gap-6 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card>
            <CardHeader className="pb-3 border-b border-[color:var(--line)]">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {messages?.match || "Match"} - ORD-198
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-1">
                  {messages?.expectedAmount || "Expected Amount"}
                </div>
                <div className="rounded-xl bg-[color:var(--surface-soft)] p-3 text-sm font-bold border border-[color:var(--line)]">
                  760,000 VND
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-1">
                  {messages?.detectedAmount || "Detected Amount"}
                </div>
                <div className="rounded-xl bg-green-500/10 p-3 text-sm font-bold text-green-600 border border-green-200">
                  760,000 VND
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-[color:var(--line)]">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {messages?.needsVerification || "Review"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 flex flex-col justify-between h-[calc(100%-60px)]">
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-1">
                    Nội dung chuyển khoản (Detected)
                  </div>
                  <div className="rounded-xl bg-amber-500/10 p-3 text-sm font-medium text-amber-600 border border-amber-200">
                    "Thanh toan don hang abc" 
                  </div>
                  <p className="text-[10px] text-[color:var(--muted)] mt-2">
                    Lệch so với mã đơn mặc định: <strong className="text-[color:var(--foreground)]">ORD-198</strong>
                  </p>
                </div>
              </div>
              <Button className="w-full mt-4 bg-[image:var(--brand-gradient)] shadow-md">
                <Send className="h-4 w-4 mr-2" />
                {messages?.requestApproval || "Request Approval"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
