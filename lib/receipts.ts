import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Receipt } from "./types";

const RECEIPTS_DIR = path.join(process.cwd(), "data", "receipts");

export const ALLOWED_RECEIPT_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10 MB

export function ensureReceiptsDir(transactionId: number) {
  const dir = path.join(RECEIPTS_DIR, String(transactionId));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function validateReceiptFile(file: File): string | null {
  if (!ALLOWED_RECEIPT_TYPES[file.type]) {
    return "Only JPG, PNG and PDF files are allowed";
  }
  if (file.size > MAX_RECEIPT_SIZE) {
    return "File must be under 10 MB";
  }
  return null;
}

export async function saveReceiptFile(
  transactionId: number,
  file: File,
  uploadedBy: string
): Promise<Receipt> {
  const error = validateReceiptFile(file);
  if (error) throw new Error(error);

  const id = randomUUID();
  const ext = ALLOWED_RECEIPT_TYPES[file.type];
  const filename = `${id}${ext}`;
  const dir = ensureReceiptsDir(transactionId);
  const filePath = path.join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return {
    id,
    filename,
    original_name: file.name,
    mime_type: file.type,
    uploaded_at: new Date().toISOString(),
    uploaded_by: uploadedBy,
  };
}

export function getReceiptPath(
  transactionId: number,
  receipt: Receipt
): string {
  return path.join(RECEIPTS_DIR, String(transactionId), receipt.filename);
}

export function deleteReceiptFile(transactionId: number, receipt: Receipt) {
  const filePath = getReceiptPath(transactionId, receipt);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function deleteAllReceiptsForTransaction(transactionId: number) {
  const dir = path.join(RECEIPTS_DIR, String(transactionId));
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function receiptExists(transactionId: number, receipt: Receipt): boolean {
  return fs.existsSync(getReceiptPath(transactionId, receipt));
}
