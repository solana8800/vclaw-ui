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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-6">
      <h3 className="text-lg font-medium text-slate-900 mb-4">Tạo nhanh VietQR (MVP)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ngân hàng</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Số tài khoản</label>
          <input 
            type="text"
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ví dụ: 0011001234567"
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tên chủ tài khoản</label>
          <input 
            type="text"
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ví dụ: NGUYEN VAN A"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền (VNĐ)</label>
          <input 
            type="number"
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung chuyển khoản</label>
          <input 
            type="text"
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ví dụ: Thanh toan don hang #123"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <button 
        onClick={handleGenerate}
        className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
      >
        Tạo mã QR
      </button>

      {qrUrl && (
        <div className="mt-8 flex flex-col items-center border-t border-slate-100 pt-8">
          <p className="text-sm text-slate-500 mb-4">Gửi ảnh này cho khách hàng để thanh toán:</p>
          <img src={qrUrl} alt="VietQR" className="w-64 h-auto shadow-md border border-slate-200 p-2 bg-white" />
          <button 
             onClick={() => window.open(qrUrl, '_blank')}
             className="mt-4 text-blue-600 text-sm hover:underline"
          >
            Mở ảnh trong tab mới
          </button>
        </div>
      )}
    </div>
  );
}
