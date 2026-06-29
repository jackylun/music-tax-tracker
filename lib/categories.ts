export const INCOME_CATEGORIES = [
  "Performance",
  "Teaching - KCL",
  "Teaching - Private",
  "Accompanying",
  "Recording Session",
  "Arranging",
  "Competition Prize",
  "Grant",
  "Festival",
  "Other",
] as const;

/** Legacy categories kept for existing records */
export const LEGACY_INCOME_CATEGORIES = [
  "KCL Teaching",
  "Private Teaching",
  "Accompaniment",
  "Musical Director",
  "Church Service",
  "Theatre",
  "Online Teaching",
  "Other Income",
  "Piano Teaching",
  "Composition",
  "Royalties",
] as const;

export const EXPENSE_CATEGORY_GROUPS = [
  {
    group: "Travel & Living",
    categories: ["Travel", "Accommodation", "Meals"],
  },
  {
    group: "Music & Training",
    categories: [
      "Instrument Repair",
      "Sheet Music",
      "Music Books",
      "Software",
      "Recording Equipment",
      "Professional Training",
      "Private Lessons",
      "Masterclass",
      "Workshop",
      "Music Camp",
    ],
  },
  {
    group: "Business",
    categories: ["Insurance", "Accountant", "Phone", "Internet", "Other"],
  },
] as const;

export const EXPENSE_CATEGORIES = EXPENSE_CATEGORY_GROUPS.flatMap(
  (g) => g.categories
);

/** Legacy categories kept for existing records */
export const LEGACY_EXPENSE_CATEGORIES = [
  "Flights",
  "Train",
  "Bus",
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
  "Other Expense",
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

export function getIncomeOptions(currentValue?: string): string[] {
  const options = new Set<string>([...INCOME_CATEGORIES]);
  if (currentValue && !options.has(currentValue)) {
    options.add(currentValue);
  }
  return Array.from(options);
}

export function getExpenseOptions(currentValue?: string): string[] {
  const options = new Set<string>([...EXPENSE_CATEGORIES]);
  if (currentValue && !options.has(currentValue)) {
    options.add(currentValue);
  }
  return Array.from(options);
}

export function getExpenseGroup(category: string): string | null {
  for (const group of EXPENSE_CATEGORY_GROUPS) {
    if ((group.categories as readonly string[]).includes(category)) {
      return group.group;
    }
  }
  return null;
}

export function getDefaultCategory(type: "income" | "expense"): string {
  return type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
}

export const ALL_CATEGORIES = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
] as const;
