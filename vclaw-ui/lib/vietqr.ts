/**
 * VietQR Utility for VClaw
 * Generates VietQR (NAPAS 247) compliant QR strings and URLs.
 */

interface VietQRConfig {
  bankId: string; // e.g., 'vcb', 'tcb', 'mbb'
  accountNo: string;
  accountName: string;
  amount?: number;
  description?: string;
}

/**
 * Sinh link ảnh QR VietQR (NAPAS 247) — đây là URL duy nhất hợp lệ để khách quét CK trong luồng VClaw.
 * Định dạng: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-print.png?amount=<VND>&addInfo=<...>&accountName=<...>
 * Không dùng URL khác (vd. website shop /payment/...) thay cho link này khi gửi khách.
 */
export function generateVietQRUrl(config: VietQRConfig): string {
  const { bankId, accountNo, amount, description, accountName } = config;
  const baseUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-print.png`;
  
  const params = new URLSearchParams();
  if (amount) params.append('amount', amount.toString());
  if (description) params.append('addInfo', description);
  if (accountName) params.append('accountName', accountName);
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

