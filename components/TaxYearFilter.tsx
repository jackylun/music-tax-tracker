"use client";

interface TaxYearFilterProps {
  years: string[];
  selectedYear: string;
  onChange: (year: string) => void;
}

export default function TaxYearFilter({
  years,
  selectedYear,
  onChange,
}: TaxYearFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="tax-year-filter" className="text-sm font-semibold text-slate-600">
        Tax Year
      </label>
      <select
        id="tax-year-filter"
        value={selectedYear}
        onChange={(e) => onChange(e.target.value)}
        className="input-field w-auto min-w-[120px] py-2"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StatCard({
  label,
  amount,
  variant,
  compact,
}: {
  label: string;
  amount: number;
  variant: "income" | "expense" | "profit" | "neutral";
  compact?: boolean;
}) {
  const colors = {
    income: "border-emerald-200 bg-emerald-50 text-emerald-900",
    expense: "border-rose-200 bg-rose-50 text-rose-900",
    profit: "border-brand-200 bg-brand-50 text-brand-900",
    neutral: "border-slate-200 bg-white text-slate-900",
  };

  return (
    <div className={`card border ${colors[variant]} ${compact ? "p-4" : ""}`}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p
        className={`mt-1 font-bold tracking-tight ${
          compact ? "text-xl" : "text-2xl sm:text-3xl"
        }`}
      >
        {formatMoney(amount)}
      </p>
    </div>
  );
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(amount);
}
