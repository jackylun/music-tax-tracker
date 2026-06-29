import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readDb, writeDb } from "@/lib/db";
import { saveReceiptFile, deleteReceiptFile } from "@/lib/receipts";
import { getTransactionById } from "@/lib/stats";
import type { Receipt } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const transactionId = parseInt(idParam, 10);
  const transaction = getTransactionById(transactionId);

  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const receipt = await saveReceiptFile(
      transactionId,
      file,
      session.displayName
    );

    const db = readDb();
    const index = db.transactions.findIndex((t) => t.id === transactionId);
    const existing = db.transactions[index];
    const receipts = (existing.receipts as Receipt[] | undefined) ?? [];
    receipts.push(receipt);
    existing.receipts = receipts;
    writeDb(db);

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const transactionId = parseInt(idParam, 10);
  const receiptId = request.nextUrl.searchParams.get("receiptId");

  if (!receiptId) {
    return NextResponse.json({ error: "Missing receiptId" }, { status: 400 });
  }

  const db = readDb();
  const index = db.transactions.findIndex((t) => t.id === transactionId);
  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = db.transactions[index];
  const allReceipts = (existing.receipts as Receipt[] | undefined) ?? [];
  const removed = allReceipts.find((r) => r.id === receiptId);
  existing.receipts = allReceipts.filter((r) => r.id !== receiptId);

  if (removed) {
    deleteReceiptFile(transactionId, removed);
  }

  writeDb(db);

  return NextResponse.json({ ok: true });
}
