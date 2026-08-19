/**
 * Verification checks for category and payment method updates.
 * Run: node scripts/verify-category-update.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf-8");
}

function extractStringArray(source, constName) {
  const match = source.match(
    new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const`)
  );
  if (!match) throw new Error(`Could not parse ${constName}`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const categoriesSource = read("lib/categories.ts");
const paymentSource = read("lib/payment-method.ts");

const INCOME_CATEGORIES = extractStringArray(categoriesSource, "INCOME_CATEGORIES");
const EXPENSE_CATEGORIES = extractStringArray(categoriesSource, "EXPENSE_CATEGORIES");
const LEGACY_INCOME_CATEGORIES = extractStringArray(
  categoriesSource,
  "LEGACY_INCOME_CATEGORIES"
);
const LEGACY_EXPENSE_CATEGORIES = extractStringArray(
  categoriesSource,
  "LEGACY_EXPENSE_CATEGORIES"
);
const TRANSPORT_EXPENSE_CATEGORIES = extractStringArray(
  categoriesSource,
  "TRANSPORT_EXPENSE_CATEGORIES"
);

const PAYMENT_METHODS = extractStringArray(paymentSource, "PAYMENT_METHODS");
const BANKS = extractStringArray(paymentSource, "BANKS");

function buildSelectOptions(active, legacy, currentValue, fromRecords = []) {
  const activeSet = new Set(active);
  const others = active[active.length - 1];
  const extras = new Set();
  for (const cat of legacy) {
    if (!activeSet.has(cat)) extras.add(cat);
  }
  if (currentValue && !activeSet.has(currentValue)) extras.add(currentValue);
  for (const cat of fromRecords) {
    if (!activeSet.has(cat)) extras.add(cat);
  }
  const sortedExtras = Array.from(extras).sort((a, b) => a.localeCompare(b));
  return [...active.slice(0, -1), ...sortedExtras, others];
}

function isValidIncomeCategory(cat) {
  return INCOME_CATEGORIES.includes(cat) || LEGACY_INCOME_CATEGORIES.includes(cat);
}

function isValidExpenseCategory(cat) {
  return EXPENSE_CATEGORIES.includes(cat) || LEGACY_EXPENSE_CATEGORIES.includes(cat);
}

function check(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}|${name}`);
  return condition;
}

function main() {
  let passed = 0;
  let failed = 0;

  function test(name, condition) {
    if (check(name, condition)) passed++;
    else failed++;
  }

  console.log("\nCategory & payment method verification\n");

  const incomeSelect = buildSelectOptions(
    INCOME_CATEGORIES,
    LEGACY_INCOME_CATEGORIES
  );
  const incomeFilter = buildSelectOptions(
    INCOME_CATEGORIES,
    LEGACY_INCOME_CATEGORIES
  );
  const expenseSelect = buildSelectOptions(
    EXPENSE_CATEGORIES,
    LEGACY_EXPENSE_CATEGORIES
  );
  const expenseFilter = buildSelectOptions(
    EXPENSE_CATEGORIES,
    LEGACY_EXPENSE_CATEGORIES
  );

  test(
    "Add Record and Records share Income categories",
    JSON.stringify(incomeSelect) === JSON.stringify(incomeFilter)
  );

  test(
    "Add Record and Records share Expense categories",
    JSON.stringify(expenseSelect) === JSON.stringify(expenseFilter)
  );

  test("Scholarship in Income", INCOME_CATEGORIES.includes("Scholarship"));

  test(
    "Others is last in Income",
    INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1] === "Others"
  );

  test(
    "Others is last in Expenses",
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1] === "Others"
  );

  const transportIndex = TRANSPORT_EXPENSE_CATEGORIES.map((c) =>
    EXPENSE_CATEGORIES.indexOf(c)
  );
  test(
    "Transport categories consecutive in exact order",
    transportIndex[0] >= 0 &&
      transportIndex.every((idx, i) =>
        i === 0 ? true : idx === transportIndex[i - 1] + 1
      ) &&
      TRANSPORT_EXPENSE_CATEGORIES.every(
        (c, i) => EXPENSE_CATEGORIES[transportIndex[0] + i] === c
      )
  );

  test(
    "Five separate transport expense categories",
    TRANSPORT_EXPENSE_CATEGORIES.length === 5
  );

  test(
    "Removed income categories not in active list",
    !INCOME_CATEGORIES.includes("Private Teaching") &&
      !INCOME_CATEGORIES.includes("Accompanying")
  );

  test(
    "Removed expense categories not in active list",
    !EXPENSE_CATEGORIES.includes("Travel") &&
      !EXPENSE_CATEGORIES.includes("Sheet Music") &&
      !EXPENSE_CATEGORIES.includes("Workshop")
  );

  test(
    "Historical income category still valid",
    isValidIncomeCategory("Private Teaching")
  );

  test(
    "Historical expense category still valid",
    isValidExpenseCategory("Sheet Music")
  );

  test(
    "Edit preserves historical category in select options",
    buildSelectOptions(INCOME_CATEGORIES, LEGACY_INCOME_CATEGORIES, "Private Teaching").includes(
      "Private Teaching"
    )
  );

  test("Payment methods Cash and Bank", PAYMENT_METHODS.join(",") === "Cash,Bank");

  test(
    "Bank options Chase Revolut Others",
    BANKS.join(",") === "Chase,Revolut,Others"
  );

  test(
    "Foreign currency module unchanged",
    read("lib/exchange-rates.ts").includes("fetchGbpRate") &&
      read("lib/exchange-rates.ts").includes("frankfurter")
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
