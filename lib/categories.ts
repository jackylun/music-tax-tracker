/** Active income categories for new records (A–Z, "Others" last). */
export const INCOME_CATEGORIES = [
  "Accompaniment",
  "Church",
  "Competition Prize",
  "Festival",
  "Grant",
  "Meals",
  "Performance",
  "Private Event",
  "Scholarship",
  "Teaching - KCL",
  "Teaching - Private",
  "Others",
] as const;

/** Removed income categories — valid on existing records only, not shown for new records. */
export const LEGACY_INCOME_CATEGORIES = [
  "Accompanying",
  "Arranging",
  "Church Service",
  "Composition",
  "KCL Teaching",
  "Musical Director",
  "Online Teaching",
  "Other",
  "Other Income",
  "Piano Teaching",
  "Private Teaching",
  "Recording Session",
  "Royalties",
  "Royalties Theatre",
  "Theatre",
] as const;

/** Shared active income list for Add Record, Records filters, and reports. */
export function getActiveIncomeCategories(): readonly string[] {
  return INCOME_CATEGORIES;
}

/**
 * Active expense categories for new records.
 * Transport categories appear consecutively; "Others" is always last.
 */
export const EXPENSE_CATEGORIES = [
  "Accommodation",
  "Accountant",
  "Instrument Repair",
  "Insurance",
  "Internet",
  "Masterclass",
  "Meals",
  "Music Books",
  "Music Camp",
  "Phone",
  "Private Lessons",
  "Professional Training",
  "Recording Equipment",
  "Software",
  "Flight Tickets",
  "Train",
  "Bus",
  "Uber",
  "Other Transport",
  "Others",
] as const;

/** Removed or historical expense categories — valid on existing records only. */
export const LEGACY_EXPENSE_CATEGORIES = [
  "Travel",
  "Sheet Music",
  "Workshop",
  "Other",
  "Other Expense",
  "Flights",
  "Underground",
  "Uber / Taxi",
  "Parking",
  "Toll",
  "Fuel",
  "Clothing",
  "Photography",
  "Audio Recording",
  "Video Recording",
  "Piano Tuning",
  "Instrument Purchase",
  "Equipment",
  "Software Subscription",
  "Website Hosting",
  "Office Supplies",
  "Professional Fees",
  "Bank Charges",
  "Advertising",
  "Printing",
  "Hotel",
  "Music",
  "Business",
  "General",
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function isValidIncomeCategory(cat: string): boolean {
  return (
    (INCOME_CATEGORIES as readonly string[]).includes(cat) ||
    (LEGACY_INCOME_CATEGORIES as readonly string[]).includes(cat)
  );
}

export function isValidExpenseCategory(cat: string): boolean {
  return (
    (EXPENSE_CATEGORIES as readonly string[]).includes(cat) ||
    (LEGACY_EXPENSE_CATEGORIES as readonly string[]).includes(cat)
  );
}

function buildIncomeOptions(opts: {
  currentValue?: string;
  fromRecords?: string[];
}): string[] {
  const active = [...INCOME_CATEGORIES];
  const activeSet = new Set<string>(active);
  const others = active[active.length - 1];
  const extras = new Set<string>();

  if (opts.currentValue && !activeSet.has(opts.currentValue)) {
    extras.add(opts.currentValue);
  }
  for (const cat of opts.fromRecords ?? []) {
    if (!activeSet.has(cat)) extras.add(cat);
  }

  if (extras.size === 0) {
    return active;
  }

  const sortedExtras = Array.from(extras).sort((a, b) => a.localeCompare(b));
  return [...active.slice(0, -1), ...sortedExtras, others];
}

function buildSelectOptions(
  active: readonly string[],
  legacy: readonly string[],
  currentValue?: string,
  fromRecords?: string[]
): string[] {
  const activeSet = new Set<string>(active);
  const others = active[active.length - 1];
  const extras = new Set<string>();

  for (const cat of legacy) {
    if (!activeSet.has(cat)) extras.add(cat);
  }
  if (currentValue && !activeSet.has(currentValue)) {
    extras.add(currentValue);
  }
  for (const cat of fromRecords ?? []) {
    if (!activeSet.has(cat)) extras.add(cat);
  }

  const sortedExtras = Array.from(extras).sort((a, b) => a.localeCompare(b));
  return [...active.slice(0, -1), ...sortedExtras, others];
}

/** Dropdown options for Add/Edit Record (active categories + current value if historical). */
export function getIncomeSelectOptions(currentValue?: string): string[] {
  return buildIncomeOptions({ currentValue });
}

/** Filter dropdown for Income lists — same active list; adds in-use historical categories only. */
export function getIncomeFilterOptions(fromRecords: string[] = []): string[] {
  return buildIncomeOptions({ fromRecords });
}

/** Dropdown options for Add/Edit Record (includes current value if historical). */
export function getExpenseSelectOptions(currentValue?: string): string[] {
  return buildSelectOptions(
    EXPENSE_CATEGORIES,
    LEGACY_EXPENSE_CATEGORIES,
    currentValue
  );
}

/** @deprecated Use getIncomeSelectOptions */
export const getIncomeOptions = getIncomeSelectOptions;

/** @deprecated Use getExpenseSelectOptions */
export const getExpenseOptions = getExpenseSelectOptions;

/** Filter dropdown options for Expense lists/reports (includes legacy + in-use categories). */
export function getExpenseFilterOptions(fromRecords: string[] = []): string[] {
  return buildSelectOptions(
    EXPENSE_CATEGORIES,
    LEGACY_EXPENSE_CATEGORIES,
    undefined,
    fromRecords
  );
}

/** Combined filter options when type is unknown or "all". */
export function getCategoryFilterOptions(
  type: "income" | "expense" | "all",
  fromRecords: string[] = []
): string[] {
  if (type === "income") return getIncomeFilterOptions(fromRecords);
  if (type === "expense") return getExpenseFilterOptions(fromRecords);
  const combined = new Set<string>([
    ...getIncomeFilterOptions(fromRecords),
    ...getExpenseFilterOptions(fromRecords),
  ]);
  return Array.from(combined).sort((a, b) => a.localeCompare(b));
}

export function getDefaultCategory(type: "income" | "expense"): string {
  return type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
}

export const ALL_CATEGORIES = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
] as const;

/** Transport expense categories in display order. */
export const TRANSPORT_EXPENSE_CATEGORIES = [
  "Flight Tickets",
  "Train",
  "Bus",
  "Uber",
  "Other Transport",
] as const;
