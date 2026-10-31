export const fmtMoney = (v: number, currency = "USD", digits = 2) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

export const fmtSignedMoney = (v: number, currency = "USD", digits = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtMoney(Math.abs(v), currency, digits)}`;

export const fmtNumber = (v: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

export const fmtPct = (v: number, digits = 1, signed = false) =>
  `${signed && v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}%`;
