import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getSession } from "@/lib/auth";
import { getReceiptPath, receiptExists } from "@/lib/receipts";
import { getTransactionById } from "@/lib/stats";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; receiptId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam, receiptId } = await params;
  const transactionId = parseInt(idParam, 10);
  const transaction = getTransactionById(transactionId);

  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const receipt = transaction.receipts?.find((r) => r.id === receiptId);
  if (!receipt || !receiptExists(transactionId, receipt)) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const filePath = getReceiptPath(transactionId, receipt);
  const buffer = fs.readFileSync(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": receipt.mime_type,
      "Content-Disposition": `inline; filename="${receipt.original_name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
