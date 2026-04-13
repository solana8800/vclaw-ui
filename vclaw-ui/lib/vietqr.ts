/**
 * VietQR Utility for VClaw
 * Generates VietQR (NAPAS 247) compliant QR strings and URLs.
 */

export interface VietQRConfig {
  bankId: string; // e.g., 'vcb', 'tcb', 'mbb'
  accountNo: string;
  accountName: string;
  amount?: number;
  description?: string;
}

/**
 * Generates a quick link for VietQR via VietQR.io (for MVP simplicity)
 * Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>
 */
export function generateVietQRUrl(config: VietQRConfig): string {
  const { bankId, accountNo, amount, description, accountName } = config;
  const baseUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png`;
  
  const params = new URLSearchParams();
  if (amount) params.append('amount', amount.toString());
  if (description) params.append('addInfo', description);
  if (accountName) params.append('accountName', accountName);
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Standard VietQR String generation (Draft logic for offline use)
 * Based on EMVCo standards used by NAPAS
 */
export function generateVietQRString(config: VietQRConfig): string {
  // Implementation of EMVCo CRC-16 etc. would go here.
  // For MVP, we'll focus on the image URL approach.
  return `vietqr://payment?bank=${config.bankId}&account=${config.accountNo}`;
}
