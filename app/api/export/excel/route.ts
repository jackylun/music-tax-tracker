import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { reportToExcel, transactionsToExcel } from "@/lib/excel";
import { getCurrentUkTaxYear } from "@/lib/tax-year";
import { getReportData, getTransactions } from "@/lib/stats";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taxYear =
    request.nextUrl.searchParams.get("taxYear") ?? getCurrentUkTaxYear();
  const format = request.nextUrl.searchParams.get("format") || "report";

  let buffer: Buffer;
  let filename: string;

  if (format === "transactions") {
    const transactions = await getTransactions(taxYear);
    buffer = await transactionsToExcel(transactions, taxYear);
    filename = `music-tax-transactions-${taxYear.replace("/", "-")}.xlsx`;
  } else {
    const report = await getReportData(taxYear);
    buffer = await reportToExcel(report);
    filename = `music-tax-report-${taxYear.replace("/", "-")}.xlsx`;
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
