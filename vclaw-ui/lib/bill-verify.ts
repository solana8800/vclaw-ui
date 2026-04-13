/**
 * Bill Verification Utility for VClaw
 * Uses Vision capabilities to verify bank transfer screenshots.
 */

export interface BillVerificationResult {
  status: 'success' | 'pending' | 'failed';
  amount?: number;
  transactionId?: string;
  timestamp?: string;
  senderName?: string;
  receiverName?: string;
  confidence: number; // 0 to 1
  note?: string;
}

/**
 * Mock OCR analysis for the frontend.
 * In production, the Agent (Backend) will perform real vision analysis
 * and update the database/UI.
 */
export function verifyBillMock(imageUrl: string): Promise<BillVerificationResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 'success',
        amount: 50000,
        transactionId: 'FT230410123456',
        timestamp: '2026-04-13 14:05:22',
        senderName: 'NGUYEN VAN A',
        confidence: 0.95,
        note: 'Giao dịch khớp với số tiền đơn hàng.'
      });
    }, 2000);
  });
}
