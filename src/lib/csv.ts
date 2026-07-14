// Converts rows to CSV with zero transformation of their values — used for
// exporting raw source records (API JSON / CSV rows) unmodified. A missing
// value (null/undefined) is written as the literal text `null`, never blank
// or 0, so "not reported" stays distinguishable from a real measurement.
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = (v: unknown) => JSON.stringify(v === undefined ? null : v);
  const lines = [
    keys.join(","),
    ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
