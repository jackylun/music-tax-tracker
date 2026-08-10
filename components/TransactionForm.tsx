"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [exchangeRateDate, setExchangeRateDate] = useState(
    initial?.exchange_rate_date ?? ""
  );
  const [rateSource, setRateSource] = useState<string>(
    initial?.rate_source ?? ""
  );
  const [manualGbpAmount, setManualGbpAmount] = useState(
    initial?.gbp_manual_override ? String(initial.amount_gbp) : ""
  );
  const [rateManualOverride, setRateManualOverride] = useState(
    initial?.rate_manual_override ?? false
  );
  const [gbpManualOverride, setGbpManualOverride] = useState(
    initial?.gbp_manual_override ?? false
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

  const initialCurrencyRef = useRef(initial?.currency ?? "GBP");
  const initialDateRef = useRef(initial?.date ?? date);
  const skipAutoFetchRef = useRef(isEdit);

  const gbpPreview = useMemo(() => {
    if (currency === "GBP") {
      const amt = parseFloat(originalAmount);
      if (isNaN(amt)) return null;
      return roundMoney(amt);
    }
    if (gbpManualOverride) {
      const gbp = parseFloat(manualGbpAmount);
      if (isNaN(gbp)) return null;
      return roundMoney(gbp);
    }
    const amt = parseFloat(originalAmount);
    const rate = parseFloat(exchangeRate);
    if (isNaN(amt) || isNaN(rate)) return null;
    return roundMoney(amt * rate);
  }, [
    originalAmount,
    exchangeRate,
    currency,
    gbpManualOverride,
    manualGbpAmount,
  ]);

  const fetchExchangeRate = useCallback(async () => {
    if (currency === "GBP") return;
    setFetchingRate(true);
    setError("");
    try {
      const res = await fetch(
        `/api/exchange-rate?currency=${currency}&date=${encodeURIComponent(date)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not fetch rate");
      setExchangeRate(String(data.rate));
      setExchangeRateDate(data.date ?? date);
      setRateSource(data.source ?? "frankfurter");
      setRateManualOverride(false);
      setGbpManualOverride(false);
      setManualGbpAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rate fetch failed");
    } finally {
      setFetchingRate(false);
    }
  }, [currency, date]);

  useEffect(() => {
    if (currency === "GBP") {
      setExchangeRate("1");
      setExchangeRateDate(date);
      setRateSource("frankfurter");
      setRateManualOverride(false);
      setGbpManualOverride(false);
      setManualGbpAmount("");
      return;
    }

    if (skipAutoFetchRef.current) {
      skipAutoFetchRef.current = false;
      return;
    }

    const currencyChanged = currency !== initialCurrencyRef.current;
    const dateChanged = date !== initialDateRef.current;
    if (isEdit && !currencyChanged && !dateChanged && !rateManualOverride && !gbpManualOverride) {
      return;
    }

    if (!rateManualOverride && !gbpManualOverride) {
      fetchExchangeRate();
    }
  }, [
    currency,
    date,
    isEdit,
    fetchExchangeRate,
    rateManualOverride,
    gbpManualOverride,
  ]);

  useEffect(() => {
    if (paymentStatus === "Paid" && !paidDate) {
      setPaidDate(new Date().toISOString().slice(0, 10));
    }
  }, [paymentStatus, paidDate]);

  function handleTypeChange(newType: "income" | "expense") {
    setType(newType);
    if (!isEdit) {
      setCategory(getDefaultCategory(newType));
    }
  }

  function handleAmountChange(value: string) {
    const decimals = getDecimalPlaces(currency);
    const pattern = decimals === 0 ? /^\d*$/ : /^\d*\.?\d{0,2}$/;
    if (value === "" || pattern.test(value)) {
      setOriginalAmount(value);
    }
  }

  function handleExchangeRateChange(value: string) {
    if (/^\d*\.?\d{0,6}$/.test(value) || value === "") {
      setExchangeRate(value);
      setRateManualOverride(true);
      setGbpManualOverride(false);
      setManualGbpAmount("");
      setRateSource("manual");
      setExchangeRateDate(date);
    }
  }

  function handleManualGbpChange(value: string) {
    if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
      setManualGbpAmount(value);
      setGbpManualOverride(true);
      setRateManualOverride(false);
      setRateSource("manual");
      setExchangeRateDate(date);
    }
  }

  function enableAutoRate() {
    setRateManualOverride(false);
    setGbpManualOverride(false);
    setManualGbpAmount("");
    fetchExchangeRate();
  }

  function validateBeforeSubmit(): string | null {
    if (currency === "GBP") return null;
    if (gbpManualOverride) {
      const gbp = parseFloat(manualGbpAmount);
      if (isNaN(gbp) || gbp <= 0) {
        return "Enter the actual GBP amount from your bank or card.";
      }
      return null;
    }
    if (rateManualOverride) {
      const rate = parseFloat(exchangeRate);
      if (isNaN(rate) || rate <= 0) {
        return "Enter a valid exchange rate.";
      }
      return null;
    }
    const rate = parseFloat(exchangeRate);
    if (fetchingRate) {
      return "Waiting for exchange rate…";
    }
    if (isNaN(rate) || rate <= 0) {
      return "Exchange rate is required. Fetch a rate or enter one manually.";
    }
    if (rate === 1) {
      return "Foreign currency cannot use a 1:1 rate unless you enter it manually.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validateBeforeSubmit();
    if (validationError) {
      setError(validationError);
      return;
    }

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
      date,
      gig_client: gigClient,
      notes,
      rate_manual_override: rateManualOverride,
      gbp_manual_override: gbpManualOverride,
    };

    if (currency === "GBP") {
      payload.exchange_rate = 1;
    } else if (gbpManualOverride) {
      payload.amount_gbp = manualGbpAmount;
    } else {
      payload.exchange_rate = exchangeRate;
    }

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
        <div className="space-y-4">
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
                onChange={(e) => handleExchangeRateChange(e.target.value)}
                className={inputClass}
                disabled={gbpManualOverride}
                required={!gbpManualOverride}
              />
              <button
                type="button"
                onClick={enableAutoRate}
                disabled={fetchingRate}
                className="btn-secondary shrink-0 px-4"
              >
                {fetchingRate ? "…" : "Fetch rate"}
              </button>
            </div>
            {exchangeRateDate && !gbpManualOverride && (
              <p className="mt-1 text-xs text-slate-500">
                Rate date: {exchangeRateDate}
                {exchangeRateDate !== date ? " (nearest available business day)" : ""}
                {rateSource ? ` · Source: ${rateSource}` : ""}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={gbpManualOverride}
                onChange={(e) => {
                  setGbpManualOverride(e.target.checked);
                  if (e.target.checked) {
                    setRateManualOverride(false);
                    setRateSource("manual");
                    setExchangeRateDate(date);
                  } else {
                    enableAutoRate();
                  }
                }}
              />
              Enter actual GBP amount from bank/card
            </label>
            {gbpManualOverride && (
              <input
                type="text"
                inputMode="decimal"
                value={manualGbpAmount}
                onChange={(e) => handleManualGbpChange(e.target.value)}
                className={`${inputClass} mt-2`}
                placeholder="0.00"
                required
              />
            )}
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
        disabled={loading || fetchingRate}
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
