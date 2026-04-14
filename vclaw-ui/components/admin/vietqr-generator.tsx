"use client";

import { useState } from "react";
import { generateVietQRUrl } from "@/lib/vietqr";

export function VietQRGenerator() {
  const [bankId, setBankId] = useState("vcb");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  const handleGenerate = () => {
    const url = generateVietQRUrl({
      bankId,
      accountNo,
      accountName,
      amount: amount > 0 ? amount : undefined,
      description,
    });
    setQrUrl(url);
  };

  return (
    <div className="bg-[color:var(--surface-glass)] p-6 rounded-3xl shadow-sm border border-[color:var(--line)] backdrop-blur-md mt-6">
      <h3 className="text-xl font-bold text-[color:var(--foreground-strong)] mb-6">Tạo nhanh VietQR (MVP)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[color:var(--muted)]">Ngân hàng</label>
          <select 
            className="w-full h-11 px-4 bg-[color:var(--surface-strong)] border border-[color:var(--line-strong)] rounded-2xl text-[color:var(--foreground-strong)] focus:ring-2 focus:ring-[color:var(--brand-soft)] focus:border-[color:var(--brand)] outline-none transition"
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
          >
            <option value="vcb">Vietcombank</option>
            <option value="tcb">Techcombank</option>
            <option value="mbb">MBBank</option>
            <option value="vbi">VietinBank</option>
            <option value="bidv">BIDV</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[color:var(--muted)]">Số tài khoản</label>
          <input 
            type="text"
            className="w-full h-11 px-4 bg-[color:var(--surface-strong)] border border-[color:var(--line-strong)] rounded-2xl text-[color:var(--foreground-strong)] placeholder:text-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--brand-soft)] focus:border-[color:var(--brand)] outline-none transition"
            placeholder="Ví dụ: 0011001234567"
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[color:var(--muted)]">Tên chủ tài khoản</label>
          <input 
            type="text"
            className="w-full h-11 px-4 bg-[color:var(--surface-strong)] border border-[color:var(--line-strong)] rounded-2xl text-[color:var(--foreground-strong)] placeholder:text-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--brand-soft)] focus:border-[color:var(--brand)] outline-none transition"
            placeholder="Ví dụ: NGUYEN VAN A"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[color:var(--muted)]">Số tiền (VNĐ)</label>
          <input 
            type="number"
            className="w-full h-11 px-4 bg-[color:var(--surface-strong)] border border-[color:var(--line-strong)] rounded-2xl text-[color:var(--foreground-strong)] focus:ring-2 focus:ring-[color:var(--brand-soft)] focus:border-[color:var(--brand)] outline-none transition"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-semibold text-[color:var(--muted)]">Nội dung chuyển khoản</label>
          <input 
            type="text"
            className="w-full h-11 px-4 bg-[color:var(--surface-strong)] border border-[color:var(--line-strong)] rounded-2xl text-[color:var(--foreground-strong)] placeholder:text-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--brand-soft)] focus:border-[color:var(--brand)] outline-none transition"
            placeholder="Ví dụ: Thanh toan don hang #123"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <button 
        onClick={handleGenerate}
        className="w-full md:w-auto px-8 py-3 bg-[color:var(--brand)] text-white font-bold rounded-2xl hover:bg-[color:var(--brand-strong)] shadow-[0_12px_24px_-8px_var(--brand-glow)] transition-all active:scale-[0.98]"
      >
        Tạo mã QR
      </button>

      {qrUrl && (
        <div className="mt-10 flex flex-col items-center border-t border-[color:var(--line)] pt-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <p className="text-sm text-[color:var(--muted)] mb-6">Gửi ảnh này cho khách hàng để thanh toán:</p>
          <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-[color:var(--brand-soft)]">
            <img src={qrUrl} alt="VietQR" className="w-64 h-auto rounded-xl" />
          </div>
          <button 
             onClick={() => window.open(qrUrl, '_blank')}
             className="mt-6 text-[color:var(--brand)] font-medium text-sm hover:underline flex items-center gap-1"
          >
            Mở ảnh trong tab mới
          </button>
        </div>
      )}
    </div>
  );
}
