import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCurrentUkTaxYear } from "@/lib/tax-year";
import { getAvailableYears, getIncomePageStats } from "@/lib/stats";
import IncomeClient from "./IncomeClient";

export default async function IncomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const taxYear = getCurrentUkTaxYear();
  const { transactions, breakdown } = await getIncomePageStats(taxYear);

  return (
    <IncomeClient
      displayName={session.displayName}
      initialTaxYear={taxYear}
      initialYears={await getAvailableYears()}
      initialTransactions={transactions}
      initialBreakdown={breakdown}
    />
  );
}
