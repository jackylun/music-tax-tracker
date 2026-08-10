import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readDb, writeDb } from "@/lib/db";
import { deleteAllReceiptsForTransaction } from "@/lib/receipts";
import { validateTransactionInput } from "@/lib/validate-transaction";
import { getAvailableYears, getTransactions } from "@/lib/stats";
import {
  buildTransactionFieldsWithCurrency,
  exchangeRateErrorResponse,
} from "@/lib/transaction-currency";
import { normalizeTransaction } from "@/lib/transactions";
import type { Receipt } from "@/lib/types";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taxYear = request.nextUrl.searchParams.get("taxYear") ?? undefined;
  let transactions = await getTransactions(taxYear);

  const type = request.nextUrl.searchParams.get("type");
  if (type === "income" || type === "expense") {
    transactions = transactions.filter((t) => t.type === type);
  }

  const category = request.nextUrl.searchParams.get("category");
  if (category) {
    transactions = transactions.filter((t) => t.category === category);
  }

  const search = request.nextUrl.searchParams.get("search")?.toLowerCase();
  if (search) {
    transactions = transactions.filter((t) => {
      const haystack = [
        t.category,
        t.gig_client,
        t.notes,
        t.description,
        t.created_by,
        t.currency,
        t.original_amount.toString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  const years = await getAvailableYears();

  return NextResponse.json({ transactions, years });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = validateTransactionInput(body);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const d = validation.data!;

    const db = await readDb();
    const fields = await buildTransactionFieldsWithCurrency(d, {
      gig_client: (body.gig_client as string | undefined)?.trim() || null,
      notes: (body.notes as string | undefined)?.trim() || null,
      created_by: session.displayName,
    });

    const transaction = { id: db.nextTransactionId, ...fields };

    db.transactions.push(transaction);
    db.nextTransactionId += 1;
    await writeDb(db);

    return NextResponse.json(
      {
        transaction: normalizeTransaction(
          { ...transaction } as Record<string, unknown>
        ),
      },
      { status: 201 }
    );
  } catch (error) {
    const fxError = exchangeRateErrorResponse(error);
    if (fxError) {
      return NextResponse.json({ error: fxError.error }, { status: fxError.status });
    }
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const transactionId = parseInt(id, 10);

  const db = await readDb();
  const existing = db.transactions.find((t) => t.id === transactionId);
  const receipts = (existing?.receipts as Receipt[] | undefined) ?? [];
  await deleteAllReceiptsForTransaction(transactionId, receipts);

  db.transactions = db.transactions.filter((t) => t.id !== transactionId);
  await writeDb(db);

  return NextResponse.json({ ok: true });
}
