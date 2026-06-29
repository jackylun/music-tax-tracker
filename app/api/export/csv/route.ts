import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { reportToCsv, transactionsToCsv } from "@/lib/csv";
import { getCurrentUkTaxYear } from "@/lib/tax-year";
import { getReportData, getTransactions } from "@/lib/stats";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taxYear =
    request.nextUrl.searchParams.get("taxYear") ?? getCurrentUkTaxYear();
  const format = request.nextUrl.searchParams.get("format") || "transactions";

  let csv: string;
  let filename: string;

  if (format === "report") {
    const report = getReportData(taxYear);
    csv = reportToCsv(report);
    filename = `music-tax-report-${taxYear.replace("/", "-")}.csv`;
  } else {
    const transactions = getTransactions(taxYear);
    csv = transactionsToCsv(transactions);
    filename = `music-tax-transactions-${taxYear.replace("/", "-")}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
