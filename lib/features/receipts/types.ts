/**
 * Receipt attachments for transactions (JPG, PNG, PDF).
 * Implemented in lib/receipts.ts and app/api/transactions/[id]/receipts/
 */
export type ReceiptType = "image/jpeg" | "image/png" | "application/pdf";

export interface ReceiptMeta {
  id: string;
  transaction_id: number;
  filename: string;
  mime_type: ReceiptType;
  uploaded_at: string;
  uploaded_by: string;
}

export function receiptsFeatureEnabled(): boolean {
  return true;
}
