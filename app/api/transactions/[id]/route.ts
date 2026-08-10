import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readDb, writeDb } from "@/lib/db";
import { getTransactionById } from "@/lib/stats";
import {
  buildTransactionFieldsWithCurrency,
  exchangeRateErrorResponse,
} from "@/lib/transaction-currency";
import { normalizeTransaction } from "@/lib/transactions";
import { validateTransactionInput } from "@/lib/validate-transaction";
import type { Receipt } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const transaction = await getTransactionById(parseInt(id, 10));
  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ transaction });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    const body = await request.json();
    const validation = validateTransactionInput(body);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const db = await readDb();
    const index = db.transactions.findIndex((t) => t.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existing = db.transactions[index];
    const d = validation.data!;

    const fields = await buildTransactionFieldsWithCurrency(
      d,
      {
        gig_client: (body.gig_client as string | undefined)?.trim() || null,
        notes: (body.notes as string | undefined)?.trim() || null,
        created_by: existing.created_by as string,
        created_at: existing.created_at as string,
        receipts: (existing.receipts as Receipt[] | undefined) ?? [],
      },
      existing
    );

    db.transactions[index] = { id, ...fields };
    await writeDb(db);

    return NextResponse.json({
      transaction: normalizeTransaction(db.transactions[index]),
    });
  } catch (error) {
    const fxError = exchangeRateErrorResponse(error);
    if (fxError) {
      return NextResponse.json({ error: fxError.error }, { status: fxError.status });
    }
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}
