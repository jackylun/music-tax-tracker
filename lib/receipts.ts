import { del, list, put } from "@vercel/blob";
import { randomUUID } from "crypto";
import type { Receipt } from "./types";

export const ALLOWED_RECEIPT_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10 MB

function receiptPathname(transactionId: number, filename: string): string {
  return `receipts/${transactionId}/${filename}`;
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
  const pathname = receiptPathname(transactionId, filename);

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: false,
  });

  return {
    id,
    filename,
    original_name: file.name,
    mime_type: file.type,
    uploaded_at: new Date().toISOString(),
    uploaded_by: uploadedBy,
    url: blob.url,
  };
}

export function receiptExists(_transactionId: number, receipt: Receipt): boolean {
  return Boolean(receipt.url);
}

export async function getReceiptBuffer(receipt: Receipt): Promise<Buffer> {
  if (!receipt.url) {
    throw new Error("Receipt not found");
  }

  const response = await fetch(receipt.url);
  if (!response.ok) {
    throw new Error("Receipt not found");
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function deleteReceiptFile(
  _transactionId: number,
  receipt: Receipt
): Promise<void> {
  if (!receipt.url) return;

  try {
    await del(receipt.url);
  } catch (error) {
    console.error("Receipt delete error:", error);
    throw error;
  }
}

export async function deleteAllReceiptsForTransaction(
  transactionId: number,
  receipts: Receipt[] = []
): Promise<void> {
  const urls = new Set(
    receipts.map((receipt) => receipt.url).filter(Boolean) as string[]
  );

  try {
    const { blobs } = await list({ prefix: `receipts/${transactionId}/` });
    for (const blob of blobs) {
      urls.add(blob.url);
    }
  } catch (error) {
    console.error("Receipt list error:", error);
  }

  await Promise.all(
    [...urls].map((url) =>
      del(url).catch((error) => {
        console.error("Receipt delete error:", error);
      })
    )
  );
}
