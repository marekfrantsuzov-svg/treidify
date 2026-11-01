/**
 * Pure conversion of platform deals into Treidify rows. Tested against hand-worked examples in sync.test.ts.
 * MT5 reports one deal per fill: entry "in" opens or adds, "out" closes or reduces, "inout" reverses.
 * A position is closed when its out volume equals its in volume. MT4 accounts arrive from MetaApi in the same
 * shape, with one in and one out deal per ticket.
 */
import type { MetaDeal } from "./metaapi";

export type DealType = "buy" | "sell" | "balance" | "credit" | "commission" | "swap" | "bonus" | "correction" | "other";
export type DealEntry = "in" | "out" | "inout" | "out_by" | "none";
export interface NormDeal { externalId: string; positionId: string | null; orderId: string | null; symbol: string | null; type: DealType; entry: DealEntry; volume: number | null; price: number | null; profit: number; commission: number; swap: number; fee: number; time: Date; comment: string | null; stopLoss: number | null; takeProfit: number | null }

const TYPE: Record<string, DealType> = {
  DEAL_TYPE_BUY: "buy", DEAL_TYPE_SELL: "sell", DEAL_TYPE_BALANCE: "balance", DEAL_TYPE_CREDIT: "credit",
  DEAL_TYPE_COMMISSION: "commission", DEAL_TYPE_COMMISSION_DAILY: "commission", DEAL_TYPE_COMMISSION_MONTHLY: "commission",
  DEAL_TYPE_INTEREST: "swap", DEAL_TYPE_BONUS: "bonus", DEAL_TYPE_CORRECTION: "correction",
};
const ENTRY: Record<string, DealEntry> = { DEAL_ENTRY_IN: "in", DEAL_ENTRY_OUT: "out", DEAL_ENTRY_INOUT: "inout", DEAL_ENTRY_OUT_BY: "out_by" };

export function normaliseDeal(d: MetaDeal): NormDeal {
  return {
    externalId: String(d.id), positionId: d.positionId ? String(d.positionId) : null, orderId: d.orderId ? String(d.orderId) : null,
    symbol: d.symbol ?? null, type: TYPE[d.type] ?? "other", entry: d.entryType ? ENTRY[d.entryType] ?? "none" : "none",
    volume: d.volume ?? null, price: d.price ?? null, profit: d.profit ?? 0, commission: d.commission ?? 0, swap: d.swap ?? 0, fee: 0,
    time: new Date(d.time), comment: d.comment ?? null, stopLoss: d.stopLoss ?? null, takeProfit: d.takeProfit ?? null,
  };
}

export interface ClosedRow { positionId: string; symbol: string; side: "buy" | "sell"; volume: number; openPrice: number; closePrice: number; openTime: Date; closeTime: Date; profit: number; commission: number; swap: number; fee: number; stopLoss: number | null; takeProfit: number | null }

const EPS = 1e-6;
const vwap = (ds: NormDeal[]) => { const v = ds.reduce((s, d) => s + (d.volume ?? 0), 0); return v ? ds.reduce((s, d) => s + (d.volume ?? 0) * (d.price ?? 0), 0) / v : 0; };

export function closedPositions(deals: readonly NormDeal[]): ClosedRow[] {
  const byPos = new Map<string, NormDeal[]>();
  for (const d of deals) if ((d.type === "buy" || d.type === "sell") && d.positionId) byPos.set(d.positionId, [...(byPos.get(d.positionId) ?? []), d]);
  const out: ClosedRow[] = [];
  for (const [pid, ds] of byPos) {
    ds.sort((a, b) => a.time.getTime() - b.time.getTime());
    const ins = ds.filter((d) => d.entry === "in"), outs = ds.filter((d) => d.entry === "out" || d.entry === "out_by");
    if (!ins.length || !outs.length || ds.some((d) => d.entry === "inout")) continue; // reversals are left open rather than guessed
    const vin = ins.reduce((s, d) => s + (d.volume ?? 0), 0), vout = outs.reduce((s, d) => s + (d.volume ?? 0), 0);
    if (Math.abs(vin - vout) > EPS) continue; // partially closed: still open
    out.push({
      positionId: pid, symbol: ins[0]!.symbol ?? "?", side: ins[0]!.type as "buy" | "sell", volume: vin,
      openPrice: vwap(ins), closePrice: vwap(outs), openTime: ins[0]!.time, closeTime: outs.at(-1)!.time,
      profit: ds.reduce((s, d) => s + d.profit, 0), commission: ds.reduce((s, d) => s + d.commission, 0), swap: ds.reduce((s, d) => s + d.swap, 0), fee: ds.reduce((s, d) => s + d.fee, 0),
      stopLoss: outs.at(-1)!.stopLoss ?? ins[0]!.stopLoss, takeProfit: outs.at(-1)!.takeProfit ?? ins[0]!.takeProfit,
    });
  }
  return out.sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());
}

/** Balance and credit operations become cash flows, so deposits never count as trading profit. */
export function cashFlows(deals: readonly NormDeal[]) {
  return deals.filter((d) => d.type === "balance" || d.type === "credit" || d.type === "bonus" || d.type === "correction").map((d) => ({
    externalId: d.externalId, at: d.time, amount: d.profit,
    kind: d.type === "balance" ? (d.profit >= 0 ? "deposit" : "withdrawal") : d.type,
  }));
}
