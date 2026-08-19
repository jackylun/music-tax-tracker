export const PAYMENT_METHODS = ["Cash", "Bank"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const BANKS = ["Chase", "Revolut", "Others"] as const;
export type Bank = (typeof BANKS)[number];

export function isValidPaymentMethod(
  value: string | null | undefined
): value is PaymentMethod {
  return (
    value != null &&
    value !== "" &&
    (PAYMENT_METHODS as readonly string[]).includes(value)
  );
}

export function isValidBank(value: string | null | undefined): value is Bank {
  return (
    value != null && value !== "" && (BANKS as readonly string[]).includes(value)
  );
}
