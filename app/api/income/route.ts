import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCurrentUkTaxYear } from "@/lib/tax-year";
import { getAvailableYears, getIncomePageStats } from "@/lib/stats";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taxYear =
    request.nextUrl.searchParams.get("taxYear") ?? getCurrentUkTaxYear();

  const { transactions, breakdown } = await getIncomePageStats(taxYear);
  const years = await getAvailableYears();

  return NextResponse.json({ transactions, breakdown, years, taxYear });
}
