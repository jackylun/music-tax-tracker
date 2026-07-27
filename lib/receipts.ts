import { del, get, list, put } from "@vercel/blob";
import { randomUUID } from "crypto";
import type { Receipt } from "./types";

export const ALLOWED_RECEIPT_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10 MB
const BLOB_ACCESS = "private" as const;

function receiptPathname(transactionId: number, filename: string): string {
  return `receipts/${transactionId}/${filename}`;
}

function receiptReference(receipt: Receipt): string {
  return receipt.pathname ?? receipt.url ?? "";
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
    access: BLOB_ACCESS,
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
    pathname: blob.pathname,
  };
}

export function receiptExists(_transactionId: number, receipt: Receipt): boolean {
  return Boolean(receiptReference(receipt));
}

export async function getReceiptStream(receipt: Receipt) {
  const reference = receiptReference(receipt);
  if (!reference) {
    throw new Error("Receipt not found");
  }

  const result = await get(reference, { access: BLOB_ACCESS });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("Receipt not found");
  }

  return result;
}

export async function getReceiptBuffer(receipt: Receipt): Promise<Buffer> {
  const result = await getReceiptStream(receipt);
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

export async function deleteReceiptFile(
  _transactionId: number,
  receipt: Receipt
): Promise<void> {
  const reference = receiptReference(receipt);
  if (!reference) return;

  try {
    await del(reference);
  } catch (error) {
    console.error("Receipt delete error:", error);
    throw error;
  }
}

export async function deleteAllReceiptsForTransaction(
  transactionId: number,
  receipts: Receipt[] = []
): Promise<void> {
  const references = new Set(
    receipts.map((receipt) => receiptReference(receipt)).filter(Boolean)
  );

  try {
    const { blobs } = await list({ prefix: `receipts/${transactionId}/` });
    for (const blob of blobs) {
      references.add(blob.pathname ?? blob.url);
    }
  } catch (error) {
    console.error("Receipt list error:", error);
  }

  await Promise.all(
    [...references].map((reference) =>
      del(reference).catch((error) => {
        console.error("Receipt delete error:", error);
      })
    )
  );
}
