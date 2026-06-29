"use client";

import {
  getExpenseOptions,
  getIncomeOptions,
} from "@/lib/categories";

interface CategorySelectProps {
  type: "income" | "expense";
  value: string;
  onChange: (value: string) => void;
  large?: boolean;
  id?: string;
}

export default function CategorySelect({
  type,
  value,
  onChange,
  large,
  id = "category",
}: CategorySelectProps) {
  const className = large ? "input-field-lg" : "input-field";
  const options =
    type === "income" ? getIncomeOptions(value) : getExpenseOptions(value);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      required
    >
      {options.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
    </select>
  );
}
