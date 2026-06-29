import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isValidCurrency, type CurrencyCode } from "@/lib/currency";

/** Fetch GBP exchange rate via Frankfurter (ECB data). */
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

  if (currency === "GBP") {
    return NextResponse.json({ currency: "GBP", rate: 1, date: date ?? "latest" });
  }

  try {
    const endpoint = date
      ? `https://api.frankfurter.app/${date}?from=${currency}&to=GBP`
      : `https://api.frankfurter.app/latest?from=${currency}&to=GBP`;

    const res = await fetch(endpoint, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not fetch exchange rate" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rate = data.rates?.GBP as number | undefined;

    if (!rate) {
      return NextResponse.json(
        { error: "Rate not available for this date" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      currency: currency as CurrencyCode,
      rate,
      date: data.date,
    });
  } catch {
    return NextResponse.json(
      { error: "Exchange rate service unavailable" },
      { status: 503 }
    );
  }
}
