/**
 * Future: HMRC Self Assessment tax year report (6 Apr – 5 Apr).
 */
export interface HmrcReport {
  tax_year: string;
  period_start: string;
  period_end: string;
  total_turnover: number;
  total_allowable_expenses: number;
  net_profit: number;
  generated_at: string;
}

/** Placeholder — not yet implemented */
export function hmrcReportEnabled(): boolean {
  return false;
}
