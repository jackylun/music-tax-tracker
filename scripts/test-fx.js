/**
 * FX integration tests against Frankfurter (no Neon writes).
 * Run: node scripts/test-fx.js
 */

const WEEKDAY = "2024-06-03"; // Monday
const WEEKEND = "2024-06-01"; // Saturday

const CURRENCIES = ["EUR", "USD", "HKD", "JPY", "GBP"];

async function fetchGbpRate(currency, date) {
  if (currency === "GBP") {
    return { currency, rate: 1, date, source: "frankfurter" };
  }

  const endpoint = `https://api.frankfurter.app/${date}?from=${currency}&to=GBP`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${currency} on ${date}`);
  }
  const data = await response.json();
  const rate = data.rates?.GBP;
  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`No rate for ${currency} on ${date}`);
  }
  if (rate === 1) {
    throw new Error(`Unexpected 1:1 rate for ${currency}`);
  }
  return {
    currency,
    rate,
    date: data.date ?? date,
    requestedDate: date,
    source: "frankfurter",
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log("\nFrankfurter FX tests (weekday)\n");

  for (const currency of CURRENCIES) {
    await test(`${currency} -> GBP on ${WEEKDAY}`, async () => {
      const result = await fetchGbpRate(currency, WEEKDAY);
      if (currency === "GBP") {
        assert(result.rate === 1, `GBP rate should be 1, got ${result.rate}`);
      } else {
        assert(result.rate !== 1, `${currency} must not be 1:1`);
        assert(result.rate > 0, "rate must be positive");
        assert(result.date, "rate date required");
      }
      console.log(
        `      ${currency}: rate=${result.rate}, date=${result.date}`
      );
    });
  }

  console.log("\nWeekend / holiday fallback\n");

  await test(`EUR on Saturday ${WEEKEND} uses prior business day`, async () => {
    const result = await fetchGbpRate("EUR", WEEKEND);
    assert(result.date < WEEKEND, `rate date ${result.date} should be before ${WEEKEND}`);
    assert(result.rate !== 1, "EUR must not be 1:1");
    console.log(`      EUR weekend: rate=${result.rate}, date=${result.date}`);
  });

  console.log("\nGBP amount calculation samples\n");

  await test("EUR 100 converts to plausible GBP", async () => {
    const { rate } = await fetchGbpRate("EUR", WEEKDAY);
    const gbp = Math.round(100 * rate * 100) / 100;
    assert(gbp > 50 && gbp < 120, `EUR 100 -> £${gbp} seems wrong`);
    console.log(`      100 EUR = £${gbp.toFixed(2)}`);
  });

  await test("JPY 10000 converts to plausible GBP", async () => {
    const { rate } = await fetchGbpRate("JPY", WEEKDAY);
    const gbp = Math.round(10000 * rate * 100) / 100;
    assert(gbp > 30 && gbp < 120, `JPY 10000 -> £${gbp} seems wrong`);
    console.log(`      10000 JPY = £${gbp.toFixed(2)}`);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
