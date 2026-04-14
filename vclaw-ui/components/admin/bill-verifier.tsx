"use client";

import { useState } from "react";

export function BillVerifier() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResult(null);
    }
  };

  const handleVerify = () => {
    setIsVerifying(true);
    // Giả lập xử lý OCR
    setTimeout(() => {
      setResult({
        status: 'success',
        amount: 150000,
        transactionId: 'FT2604130001',
        sender: 'NGUYEN VAN B',
        bank: 'Vietcombank',
        time: '13/04/2026 15:10'
      });
      setIsVerifying(false);
    }, 3000);
  };

  return (
    <div className="bg-[color:var(--surface-glass)] p-6 rounded-3xl shadow-sm border border-[color:var(--line)] backdrop-blur-md mt-6">
      <h3 className="text-xl font-bold text-[color:var(--foreground-strong)] mb-6">Xác minh Bill chuyển khoản (AI OCR)</h3>
      
      <div className="mb-8 space-y-3">
        <label className="text-sm font-semibold text-[color:var(--muted)]">Tải lên ảnh chụp màn hình</label>
        <div className="relative group">
          <input 
            type="file" 
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-[color:var(--muted)] 
              file:mr-4 file:py-2.5 file:px-6 
              file:rounded-2xl file:border-0 
              file:text-sm file:font-bold 
              file:bg-[color:var(--brand-soft)] file:text-[color:var(--brand-strong)] 
              hover:file:bg-[color:var(--brand-glow)] transition-all cursor-pointer"
          />
        </div>
      </div>

      {previewUrl && (
        <div className="mb-8 flex justify-center animate-in zoom-in-95 duration-300">
          <div className="relative p-2 bg-[color:var(--surface-strong)] rounded-2xl border border-[color:var(--line)] shadow-xl">
            <img src={previewUrl} alt="Preview" className="max-w-xs h-auto rounded-xl" />
          </div>
        </div>
      )}

      <button 
        onClick={handleVerify}
        disabled={!previewUrl || isVerifying}
        className={`w-full md:w-auto px-8 py-3 rounded-2xl font-bold text-white transition-all active:scale-[0.98] ${
          !previewUrl || isVerifying 
            ? 'bg-[color:var(--muted)] opacity-50 cursor-not-allowed' 
            : 'bg-[color:var(--brand)] hover:bg-[color:var(--brand-strong)] shadow-[0_12px_24px_-8px_var(--brand-glow)]'
        }`}
      >
        {isVerifying ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Đang phân tích ảnh...
          </span>
        ) : 'Xác minh ngay'}
      </button>

      {result && (
        <div className="mt-10 p-6 rounded-3xl border border-[color:var(--brand-soft)] bg-[color:var(--brand-softer)]/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center mb-5">
            <div className="bg-[color:var(--brand)] text-white p-1.5 rounded-full mr-3 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-bold text-[color:var(--brand-strong)]">Xác minh thành công</span>
          </div>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div className="font-semibold text-[color:var(--muted)]">Người gửi:</div>
            <div className="text-[color:var(--foreground-strong)]">{result.sender}</div>
            <div className="font-semibold text-[color:var(--muted)]">Số tiền:</div>
            <div className="font-bold text-[color:var(--brand-strong)] text-lg">{result.amount.toLocaleString('vi-VN')} VNĐ</div>
            <div className="font-semibold text-[color:var(--muted)]">Mã GD:</div>
            <div className="text-[color:var(--foreground-strong)] font-mono">{result.transactionId}</div>
            <div className="font-semibold text-[color:var(--muted)]">Thời gian:</div>
            <div className="text-[color:var(--foreground-strong)]">{result.time}</div>
          </div>
        </div>
      )}
    </div>
  );
}
