import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCurrentUkTaxYear } from "@/lib/tax-year";
import { getAvailableYears, getTransactions } from "@/lib/stats";
import TransactionsClient from "./TransactionsClient";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const initialTypeFilter =
    params.type === "expense"
      ? "expense"
      : params.type === "income"
        ? "income"
        : "all";

  const taxYear = getCurrentUkTaxYear();
  const years = await getAvailableYears();
  const transactions = await getTransactions(taxYear);

  return (
    <TransactionsClient
      displayName={session.displayName}
      initialTaxYear={taxYear}
      initialYears={years}
      initialTransactions={transactions}
      initialTypeFilter={initialTypeFilter}
    />
  );
}
