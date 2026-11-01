/** Monotone cubic path (Fritsch–Carlson): smooth like the reference charts, but never overshoots the data. */
export function smoothPath(xs: number[], ys: number[]): string {
  const n = xs.length;
  if (n === 0) return "";
  if (n < 3) return xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i]!.toFixed(1)}`).join("");
  const dx: number[] = [], m: number[] = [], t: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { dx[i] = xs[i + 1]! - xs[i]!; m[i] = dx[i] ? (ys[i + 1]! - ys[i]!) / dx[i]! : 0; }
  t[0] = m[0]!; t[n - 1] = m[n - 2]!;
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i]! / m[i]!, b = t[i + 1]! / m[i]!, h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]!; t[i + 1] = k * b * m[i]!; }
  }
  let d = `M${xs[0]!.toFixed(1)} ${ys[0]!.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]! / 3;
    d += `C${(xs[i]! + h).toFixed(1)} ${(ys[i]! + t[i]! * h).toFixed(1)} ${(xs[i + 1]! - h).toFixed(1)} ${(ys[i + 1]! - t[i + 1]! * h).toFixed(1)} ${xs[i + 1]!.toFixed(1)} ${ys[i + 1]!.toFixed(1)}`;
  }
  return d;
}
