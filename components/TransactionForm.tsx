"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CategorySelect from "./CategorySelect";
import { getDefaultCategory } from "@/lib/categories";
import ReceiptUpload from "./ReceiptUpload";
import type { Transaction } from "@/lib/types";
import { PAYMENT_STATUSES } from "@/lib/income";
import type { PaymentStatus } from "@/lib/types";
import {
  CURRENCY_LABELS,
  CURRENCY_SYMBOLS,
  getDecimalPlaces,
  roundMoney,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from "@/lib/currency";

interface TransactionFormProps {
  initial?: Transaction;
  onSuccess?: () => void;
  large?: boolean;
}

export default function TransactionForm({
  initial,
  onSuccess,
  large = false,
}: TransactionFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [type, setType] = useState<"income" | "expense">(
    initial?.type ?? "income"
  );
  const [category, setCategory] = useState(
    initial?.category ?? getDefaultCategory("income")
  );
  const [currency, setCurrency] = useState<CurrencyCode>(
    initial?.currency ?? "GBP"
  );
  const [originalAmount, setOriginalAmount] = useState(
    initial ? String(initial.original_amount) : ""
  );
  const [exchangeRate, setExchangeRate] = useState(
    initial && initial.currency !== "GBP"
      ? String(initial.exchange_rate)
      : "1"
  );
  const [date, setDate] = useState(
    initial?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [gigClient, setGigClient] = useState(initial?.gig_client ?? "");
  const [notes, setNotes] = useState(
    initial?.notes ?? initial?.description ?? ""
  );
  const [invoiceDate, setInvoiceDate] = useState(initial?.invoice_date ?? "");
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [paidDate, setPaidDate] = useState(initial?.paid_date ?? "");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    initial?.payment_status ?? "Pending"
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(initial?.id ?? null);
  const [receipts, setReceipts] = useState(initial?.receipts ?? []);
  const [receiptKey, setReceiptKey] = useState(0);

  const gbpPreview = useMemo(() => {
    const amt = parseFloat(originalAmount);
    const rate = currency === "GBP" ? 1 : parseFloat(exchangeRate);
    if (isNaN(amt) || isNaN(rate)) return null;
    return roundMoney(amt * rate);
  }, [originalAmount, exchangeRate, currency]);

  useEffect(() => {
    if (currency === "GBP") {
      setExchangeRate("1");
    }
  }, [currency]);

  useEffect(() => {
    if (paymentStatus === "Paid" && !paidDate) {
      setPaidDate(new Date().toISOString().slice(0, 10));
    }
  }, [paymentStatus, paidDate]);

  async function fetchExchangeRate() {
    if (currency === "GBP") return;
    setFetchingRate(true);
    try {
      const res = await fetch(
        `/api/exchange-rate?currency=${currency}&date=${date}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not fetch rate");
      setExchangeRate(String(data.rate));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rate fetch failed");
    } finally {
      setFetchingRate(false);
    }
  }

  function handleTypeChange(newType: "income" | "expense") {
    setType(newType);
    if (!isEdit) {
      setCategory(getDefaultCategory(newType));
    }
  }

  function handleAmountChange(value: string) {
    const decimals = getDecimalPlaces(currency);
    const pattern =
      decimals === 0 ? /^\d*$/ : /^\d*\.?\d{0,2}$/;
    if (value === "" || pattern.test(value)) {
      setOriginalAmount(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (savedId && !isEdit) {
      router.push(type === "income" ? "/income" : "/transactions");
      router.refresh();
      return;
    }

    setLoading(true);

    const payload: Record<string, unknown> = {
      type,
      category,
      currency,
      original_amount: originalAmount,
      exchange_rate: currency === "GBP" ? 1 : exchangeRate,
      date,
      gig_client: gigClient,
      notes,
    };

    if (type === "income") {
      payload.performance_date = date;
      payload.invoice_date = invoiceDate || null;
      payload.due_date = dueDate || null;
      payload.paid_date = paidDate || null;
      payload.payment_status = paymentStatus;
    }

    try {
      const res = await fetch(
        isEdit || savedId
          ? `/api/transactions/${savedId ?? initial?.id}`
          : "/api/transactions",
        {
          method: isEdit || savedId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const data = await res.json();
      if (!savedId && !isEdit) {
        setSavedId(data.transaction.id);
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(type === "income" ? "/income" : "/transactions");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const toggleClass = large
    ? "min-h-[56px] text-lg font-bold"
    : "min-h-[48px] text-base font-semibold";
  const inputClass = large ? "input-field-lg" : "input-field";
  const labelClass = large ? "label-lg" : "label";
  const showReceiptUpload = savedId ?? initial?.id;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={`grid grid-cols-2 gap-3 rounded-2xl bg-slate-100 p-1.5 ${large ? "p-2" : ""}`}>
        <button
          type="button"
          onClick={() => handleTypeChange("income")}
          className={`rounded-xl transition ${toggleClass} ${
            type === "income"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-slate-600"
          }`}
        >
          Income
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("expense")}
          className={`rounded-xl transition ${toggleClass} ${
            type === "expense"
              ? "bg-rose-600 text-white shadow-md"
              : "text-slate-600"
          }`}
        >
          Expense
        </button>
      </div>

      <div>
        <label className={labelClass} htmlFor="date">
          {type === "income" ? "Performance / Work Date" : "Date"}
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="category">
          {type === "income" ? "Income Category" : "Category"}
        </label>
        <CategorySelect
          type={type}
          value={category}
          onChange={setCategory}
          large={large}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="currency">
          Currency
        </label>
        <select
          id="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          className={inputClass}
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {CURRENCY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="original_amount">
          {type === "income" ? "Agreed Amount" : "Amount"} ({CURRENCY_SYMBOLS[currency]})
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">
            {CURRENCY_SYMBOLS[currency]}
          </span>
          <input
            id="original_amount"
            type="text"
            inputMode={currency === "JPY" ? "numeric" : "decimal"}
            value={originalAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={`${inputClass} pl-12`}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      {currency !== "GBP" && (
        <div>
          <label className={labelClass} htmlFor="exchange_rate">
            Exchange rate (1 {currency} = ? GBP)
          </label>
          <div className="flex gap-2">
            <input
              id="exchange_rate"
              type="text"
              inputMode="decimal"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className={inputClass}
              required
            />
            <button
              type="button"
              onClick={fetchExchangeRate}
              disabled={fetchingRate}
              className="btn-secondary shrink-0 px-4"
            >
              {fetchingRate ? "…" : "Fetch rate"}
            </button>
          </div>
        </div>
      )}

      {gbpPreview != null && (
        <div className="rounded-xl bg-brand-50 px-4 py-3 text-base font-semibold text-brand-900">
          GBP equivalent: £{gbpPreview.toFixed(2)}
        </div>
      )}

      {type === "income" && (
        <>
          <div>
            <label className={labelClass} htmlFor="payment_status">
              Payment Status
            </label>
            <select
              id="payment_status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className={inputClass}
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="invoice_date">
                Invoice Date
              </label>
              <input
                id="invoice_date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="due_date">
                Due Date
              </label>
              <input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="paid_date">
                Paid Date
              </label>
              <input
                id="paid_date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </>
      )}

      <div>
        <label className={labelClass} htmlFor="gig_client">
          Gig / Client
        </label>
        <input
          id="gig_client"
          type="text"
          value={gigClient}
          onChange={(e) => setGigClient(e.target.value)}
          className={inputClass}
          placeholder="e.g. Royal Festival Hall, Jane Smith"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputClass} min-h-[100px] resize-y`}
          placeholder="Additional details for your records"
          rows={3}
        />
      </div>

      {showReceiptUpload && (
        <div>
          <label className={labelClass}>Receipt</label>
          <ReceiptUpload
            key={receiptKey}
            transactionId={showReceiptUpload}
            receipts={receipts}
            onUploaded={async () => {
              const res = await fetch(`/api/transactions/${showReceiptUpload}`);
              const data = await res.json();
              setReceipts(data.transaction.receipts ?? []);
              setReceiptKey((k) => k + 1);
            }}
          />
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`btn-primary w-full ${large ? "min-h-[56px] text-lg" : ""}`}
      >
        {loading
          ? "Saving…"
          : savedId && !isEdit
            ? "Continue to Records"
            : isEdit
              ? "Update Record"
              : "Save Record"}
      </button>

      {savedId && !isEdit && (
        <p className="text-center text-sm text-slate-500">
          Record saved. Upload a receipt above, or tap Continue.
        </p>
      )}
    </form>
  );
}
