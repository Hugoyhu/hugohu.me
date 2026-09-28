"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { applyReceipt, extractInvoice, type ReceiptLine } from "./actions";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  CATEGORY_KEYS,
  CATEGORY_OPTIONS,
  type ComponentCategory,
} from "types/inventory";

type ReviewLine = ReceiptLine & { include: boolean };

const selectClass =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function ImportForm() {
  const router = useRouter();
  const [lines, setLines] = React.useState<ReviewLine[] | null>(null);
  const [distributor, setDistributor] = React.useState("");
  const [orderNumber, setOrderNumber] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [extracting, startExtract] = React.useTransition();
  const [applying, startApply] = React.useTransition();

  const updateLine = (index: number, patch: Partial<ReviewLine>) =>
    setLines((prev) =>
      prev ? prev.map((l, i) => (i === index ? { ...l, ...patch } : l)) : prev,
    );

  const handleExtract = (formData: FormData) => {
    setError(null);
    startExtract(async () => {
      const result = await extractInvoice(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDistributor(result.distributor);
      setOrderNumber(result.orderNumber);
      setLines(
        result.lines.map((l) => ({
          ...l,
          include: l.quantity > 0 && l.mpn !== "",
        })),
      );
    });
  };

  const handleApply = () => {
    if (!lines) return;
    setError(null);
    const included = lines
      .filter((l) => l.include)
      .map(({ include, existing, printedMpn, ...line }) => line);

    startApply(async () => {
      const result = await applyReceipt({ distributor, lines: included });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/inventory");
    });
  };

  const includedCount = lines?.filter((l) => l.include).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <form action={handleExtract} className="flex flex-wrap items-end gap-3">
        <Input
          type="file"
          name="invoice"
          accept="application/pdf"
          required
          className="max-w-sm"
        />
        <Button type="submit" disabled={extracting}>
          {extracting ? "Reading invoice…" : "Extract line items"}
        </Button>
      </form>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {lines && (
        <section className="space-y-3 rounded-lg border bg-background p-4">
          <header className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">
                Review {lines.length} line{lines.length === 1 ? "" : "s"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {distributor}
                {orderNumber ? ` · Order ${orderNumber}` : ""} · Existing parts
                get the quantity added; new parts are created.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleApply}
              disabled={applying || includedCount === 0}
            >
              {applying
                ? "Applying…"
                : `Apply ${includedCount} line${includedCount === 1 ? "" : "s"}`}
            </Button>
          </header>

          {lines.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No component lines found in this PDF.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border bg-card text-xs sm:text-sm">
              <table className="w-full border-collapse">
                <thead className="bg-muted/70">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium" />
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">MPN</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Package</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Category
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <ReviewRow
                      key={i}
                      line={line}
                      onChange={(patch) => updateLine(i, patch)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ReviewRow({
  line,
  onChange,
}: {
  line: ReviewLine;
  onChange: (patch: Partial<ReviewLine>) => void;
}) {
  const category = line.category as ComponentCategory | "";
  const subOptions = category ? CATEGORY_OPTIONS[category] : [];

  return (
    <tr
      className={`border-b align-top last:border-b-0 ${line.include ? "" : "opacity-50"}`}
    >
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={line.include}
          onChange={(e) => onChange({ include: e.target.checked })}
          aria-label={`Include ${line.mpn || line.name}`}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        {line.existing ? (
          <span className="text-muted-foreground">
            {line.existing.quantity} →{" "}
            <span className="font-medium text-foreground">
              {line.existing.quantity + line.quantity}
            </span>
          </span>
        ) : (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
            New
          </span>
        )}
      </td>
      <td className="min-w-[10rem] px-3 py-2">
        <Input
          value={line.mpn}
          onChange={(e) => onChange({ mpn: e.target.value, existing: null })}
          placeholder="Missing MPN"
          className="h-8 font-mono text-xs"
        />
        {line.printedMpn &&
          line.printedMpn.toUpperCase() !== line.mpn.toUpperCase() && (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              printed: {line.printedMpn}
            </p>
          )}
        {line.manufacturer && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {line.manufacturer}
          </p>
        )}
      </td>
      <td className="min-w-[14rem] px-3 py-2">
        <Input
          value={line.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-8 text-xs"
        />
      </td>
      <td className="min-w-[6rem] px-3 py-2">
        <Input
          value={line.package}
          onChange={(e) => onChange({ package: e.target.value })}
          className="h-8 font-mono text-xs"
        />
      </td>
      <td className="min-w-[10rem] px-3 py-2">
        {line.existing ? (
          <span className="text-muted-foreground">Already stocked</span>
        ) : (
          <div className="flex flex-col gap-1">
            <select
              value={category}
              onChange={(e) =>
                onChange({ category: e.target.value, subcategory: "" })
              }
              className={selectClass}
            >
              <option value="" disabled>
                Category
              </option>
              {CATEGORY_KEYS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={line.subcategory}
              onChange={(e) => onChange({ subcategory: e.target.value })}
              disabled={!category}
              className={selectClass}
            >
              <option value="">Subcategory</option>
              {subOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <Input
          type="number"
          min={0}
          value={line.quantity}
          onChange={(e) =>
            onChange({ quantity: Math.max(0, Number(e.target.value) || 0) })
          }
          className="ml-auto h-8 w-20 text-right font-mono text-xs"
        />
      </td>
    </tr>
  );
}
