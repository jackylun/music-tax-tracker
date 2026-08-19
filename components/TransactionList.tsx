"use client";

import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { getGbpAmount, getTransactionNotes } from "@/lib/transactions";
import { getEffectivePaymentStatus } from "@/lib/income";
import { getCategoryFilterOptions } from "@/lib/categories";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import AmountDisplay from "./AmountDisplay";
import EditTransactionModal from "./EditTransactionModal";
import PaymentStatusBadge from "./PaymentStatusBadge";
import ReceiptViewer from "./ReceiptViewer";

type SortField = "date" | "amount" | "category";

interface TransactionListProps {
  transactions: Transaction[];
  taxYear: string;
  initialTypeFilter?: "all" | "income" | "expense";
  onChanged: () => void;
}

export default function TransactionList({
  transactions,
  taxYear,
  initialTypeFilter = "all",
  onChanged,
}: TransactionListProps) {
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">(
    initialTypeFilter
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const categoryOptions = useMemo(() => {
    return getCategoryFilterOptions(
      typeFilter,
      transactions.map((t) => t.category)
    );
  }, [transactions, typeFilter]);

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    if (currencyFilter !== "all") {
      result = result.filter((t) => t.currency === currencyFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => {
        const haystack = [
          t.category,
          t.gig_client,
          t.notes,
          t.description,
          t.created_by,
          t.currency,
          t.original_amount.toString(),
          getGbpAmount(t).toString(),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "amount":
          cmp = getGbpAmount(a) - getGbpAmount(b);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [
    transactions,
    typeFilter,
    categoryFilter,
    currencyFilter,
    search,
    sortField,
    sortAsc,
  ]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this record?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
      onChanged();
    } finally {
      setDeletingId(null);
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="card py-12 text-center">
        <p className="text-4xl">🎹</p>
        <p className="mt-3 font-semibold text-slate-700">
          No records for tax year {taxYear}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Tap Add to log your first income or expense.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search gig, client, category, notes…"
          className="input-field"
        />

        <div className="flex flex-wrap gap-2">
          {(["all", "income", "expense"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                typeFilter === f
                  ? "bg-brand-700 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field py-2"
          >
            <option value="all">All categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="input-field py-2"
          >
            <option value="all">All currencies</option>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="input-field py-2"
          >
            <option value="date">Sort: Date</option>
            <option value="amount">Sort: Amount</option>
            <option value="category">Sort: Category</option>
          </select>

          <button
            onClick={() => setSortAsc((v) => !v)}
            className="btn-secondary justify-between"
          >
            {sortAsc ? "Oldest / Lowest first" : "Newest / Highest first"}
          </button>
        </div>

        <p className="text-sm text-slate-500">
          {filtered.length} of {transactions.length} records · All GBP totals use converted amounts
        </p>

        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="card py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        t.type === "income"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {t.type}
                    </span>
                    <span className="font-semibold text-slate-800">{t.category}</span>
                    {t.type === "income" && (
                      <PaymentStatusBadge status={getEffectivePaymentStatus(t)} />
                    )}
                  </div>
                  {t.gig_client && (
                    <p className="mt-1 font-medium text-slate-700">{t.gig_client}</p>
                  )}
                  {getTransactionNotes(t) && (
                    <p className="mt-1 text-sm text-slate-500">{getTransactionNotes(t)}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    {formatDate(t.date)} · {t.created_by}
                  </p>
                  <ReceiptViewer
                    transactionId={t.id}
                    receipts={t.receipts ?? []}
                    onChanged={onChanged}
                  />
                </div>
                <AmountDisplay transaction={t} size="lg" />
              </div>
              <div className="mt-3 flex gap-4 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setEditing(t)}
                  className="text-sm font-semibold text-brand-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={deletingId === t.id}
                  className="text-sm font-semibold text-rose-600"
                >
                  {deletingId === t.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="py-8 text-center text-slate-500">No records match your filters.</p>
        )}
      </div>

      {editing && (
        <EditTransactionModal
          transaction={editing}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}
    </>
  );
}
