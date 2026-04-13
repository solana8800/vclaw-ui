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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-6">
      <h3 className="text-lg font-medium text-slate-900 mb-4">Xác minh Bill chuyển khoản (AI OCR)</h3>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Tải lên ảnh chụp màn hình</label>
        <input 
          type="file" 
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {previewUrl && (
        <div className="mb-6 flex justify-center">
          <img src={previewUrl} alt="Preview" className="max-w-xs h-auto rounded border border-slate-200 shadow-sm" />
        </div>
      )}

      <button 
        onClick={handleVerify}
        disabled={!previewUrl || isVerifying}
        className={`w-full md:w-auto px-6 py-2 rounded-md font-medium text-white transition-colors ${
          !previewUrl || isVerifying ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isVerifying ? 'Đang phân tích ảnh...' : 'Xác minh ngay'}
      </button>

      {result && (
        <div className="mt-8 p-4 rounded-md border border-green-200 bg-green-50">
          <div className="flex items-center mb-3">
            <span className="bg-green-500 text-white p-1 rounded-full mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>
            <span className="font-bold text-green-800">Xác minh thành công</span>
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-sm text-green-900">
            <div className="font-medium text-green-700">Người gửi:</div>
            <div>{result.sender}</div>
            <div className="font-medium text-green-700">Số tiền:</div>
            <div className="font-bold">{result.amount.toLocaleString('vi-VN')} VNĐ</div>
            <div className="font-medium text-green-700">Mã GD:</div>
            <div>{result.transactionId}</div>
            <div className="font-medium text-green-700">Thời gian:</div>
            <div>{result.time}</div>
          </div>
        </div>
      )}
    </div>
  );
}
