"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import TransactionList from "@/components/TransactionList";
import TaxYearFilter from "@/components/TaxYearFilter";
import type { Transaction } from "@/lib/types";

export default function TransactionsClient({
  displayName,
  initialTaxYear,
  initialYears,
  initialTransactions,
  initialTypeFilter = "all",
}: {
  displayName: string;
  initialTaxYear: string;
  initialYears: string[];
  initialTransactions: Transaction[];
  initialTypeFilter?: "all" | "income" | "expense";
}) {
  const [taxYear, setTaxYear] = useState(initialTaxYear);
  const [years] = useState(initialYears);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);

  const loadTransactions = useCallback(async (year: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?taxYear=${encodeURIComponent(year)}`);
      const data = await res.json();
      setTransactions(data.transactions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions(taxYear);
  }, [taxYear, loadTransactions]);

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      <NavBar displayName={displayName} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">Records</h1>
            <p className="page-subtitle">
              Search, filter and manage all entries ·{" "}
              <Link href="/income" className="font-semibold text-brand-700">
                Income
              </Link>
            </p>
          </div>
          <TaxYearFilter years={years} selectedYear={taxYear} onChange={setTaxYear} />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-24 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : (
          <TransactionList
            transactions={transactions}
            taxYear={taxYear}
            initialTypeFilter={initialTypeFilter}
            onChanged={() => loadTransactions(taxYear)}
          />
        )}
      </main>
    </div>
  );
}
