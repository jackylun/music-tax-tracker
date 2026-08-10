import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchGbpRate, ExchangeRateError } from "@/lib/exchange-rates";
import { isValidCurrency, type CurrencyCode } from "@/lib/currency";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currency = request.nextUrl.searchParams.get("currency") ?? "EUR";
  const date = request.nextUrl.searchParams.get("date");

  if (!isValidCurrency(currency)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Valid date required" }, { status: 400 });
  }

  try {
    const result = await fetchGbpRate(currency as CurrencyCode, date);
    return NextResponse.json({
      currency: result.currency,
      rate: result.rate,
      date: result.rateDate,
      requestedDate: result.requestedDate,
      source: result.source,
    });
  } catch (error) {
    const message =
      error instanceof ExchangeRateError
        ? error.message
        : "Exchange rate service unavailable";
    const status = error instanceof ExchangeRateError ? 404 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
