/** UK HMRC tax year: 6 April – 5 April */

export function getUkTaxYear(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  if (month > 3 || (month === 3 && day >= 6)) {
    return `${year}/${String(year + 1).slice(2)}`;
  }
  return `${year - 1}/${String(year).slice(2)}`;
}

export function getCurrentUkTaxYear(): string {
  return getUkTaxYear(new Date().toISOString().slice(0, 10));
}

export function getUkTaxYearStart(taxYear: string): string {
  const startYear = parseInt(taxYear.split("/")[0], 10);
  return `${startYear}-04-06`;
}

export function getUkTaxYearEnd(taxYear: string): string {
  const startYear = parseInt(taxYear.split("/")[0], 10);
  return `${startYear + 1}-04-05`;
}

export function isDateInTaxYear(dateStr: string, taxYear: string): boolean {
  return getUkTaxYear(dateStr) === taxYear;
}

export function getAvailableTaxYears(dates: string[]): string[] {
  const current = getCurrentUkTaxYear();
  const years = new Set<string>([current]);

  for (const date of dates) {
    years.add(getUkTaxYear(date));
  }

  return Array.from(years).sort((a, b) => {
    const ay = parseInt(a.split("/")[0], 10);
    const by = parseInt(b.split("/")[0], 10);
    return by - ay;
  });
}

export function formatTaxYearLabel(taxYear: string): string {
  return `Tax Year ${taxYear}`;
}
