"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateComponents } from "./actions";
import { PartDialog } from "./part-dialog";
import { PrintButton } from "./print-button";

import { Trash2 } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  CATEGORY_KEYS,
  CATEGORY_OPTIONS,
  type Component,
  type ComponentCategory,
} from "types/inventory";

const EDITABLE = [
  "name",
  "category",
  "subcategory",
  "manufacturer",
  "mpn",
  "package",
  "quantity",
  "datasheet",
] as const;
type Field = (typeof EDITABLE)[number];

// Unsaved edits: part id -> changed fields (as typed, so always strings)
type Drafts = Record<string, Partial<Record<Field, string>>>;

const original = (item: Component, field: Field) => String(item[field] ?? "");

const cellInput =
  "h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const changedCell = "bg-amber-100 dark:bg-amber-900/40";

type InventoryTableProps = {
  items: Component[];
  // Set while editing, so the page's Cmd+S handler can save the table
  saveRef: React.MutableRefObject<(() => void) | null>;
};

export function InventoryTable({ items, saveRef }: InventoryTableProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [drafts, setDrafts] = React.useState<Drafts>({});
  const [rowErrors, setRowErrors] = React.useState<Record<string, string>>({});
  const [message, setMessage] = React.useState<string | null>(null);
  const [saving, startSaving] = React.useTransition();

  const dirtyIds = Object.keys(drafts);

  const filteredItems = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [
        item.name,
        item.category,
        item.subcategory,
        item.manufacturer,
        item.mpn,
        item.distributor,
        item.dpn,
        item.datasheet,
      ].some((value) => value?.toString().toLowerCase().includes(q)),
    );
  }, [items, search]);

  const value = (item: Component, field: Field) =>
    drafts[item.id]?.[field] ?? original(item, field);

  const setField = (item: Component, field: Field, next: string) => {
    setMessage(null);
    setDrafts((prev) => {
      const row = { ...prev[item.id] };
      const set = (f: Field, v: string) => {
        if (v === original(item, f)) delete row[f];
        else row[f] = v;
      };
      set(field, next);

      // A new category clears a subcategory that no longer fits.
      if (field === "category") {
        const options = (CATEGORY_OPTIONS[next as ComponentCategory] ??
          []) as readonly string[];
        const sub = row.subcategory ?? original(item, "subcategory");
        if (sub && !options.includes(sub)) set("subcategory", "");
      }

      const { [item.id]: _, ...rest } = prev;
      return Object.keys(row).length ? { ...rest, [item.id]: row } : rest;
    });
  };

  const save = React.useCallback(() => {
    const changes = Object.entries(drafts).map(([id, fields]) => ({
      id,
      changes: fields,
    }));
    if (changes.length === 0 || saving) return;

    startSaving(async () => {
      const result = await updateComponents(changes);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setRowErrors(result.errors);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const id of result.saved) delete next[id];
        return next;
      });
      const failed = Object.keys(result.errors).length;
      setMessage(
        `Saved ${result.saved.length} part${result.saved.length === 1 ? "" : "s"}.` +
          (failed
            ? ` ${failed} couldn't be saved; see the highlighted rows.`
            : ""),
      );
      router.refresh();
    });
  }, [drafts, saving, router]);

  // Let the page's Cmd+S handler reach this save while editing.
  React.useEffect(() => {
    saveRef.current = editing ? save : null;
    return () => {
      saveRef.current = null;
    };
  }, [editing, save, saveRef]);

  // Warn before leaving the page with unsaved edits.
  React.useEffect(() => {
    if (dirtyIds.length === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyIds.length]);

  const toggleEditing = () => {
    if (editing && dirtyIds.length > 0) {
      const discard = window.confirm(
        `Discard unsaved changes to ${dirtyIds.length} part${dirtyIds.length === 1 ? "" : "s"}?`,
      );
      if (!discard) return;
    }
    setDrafts({});
    setRowErrors({});
    setMessage(null);
    setEditing(!editing);
  };

  const textCell = (item: Component, field: Field, extra = "") => (
    <input
      value={value(item, field)}
      onChange={(e) => setField(item, field, e.target.value)}
      className={`${cellInput} ${extra} ${drafts[item.id]?.[field] !== undefined ? changedCell : ""}`}
      aria-label={`${field} for ${item.mpn}`}
    />
  );

  const selectCell = (
    item: Component,
    field: Field,
    options: readonly string[],
  ) => {
    const current = value(item, field);
    // Keep a legacy value selectable even if it's no longer in the list
    const all =
      current && !options.includes(current) ? [current, ...options] : options;
    return (
      <select
        value={current}
        onChange={(e) => setField(item, field, e.target.value)}
        className={`${cellInput} ${drafts[item.id]?.[field] !== undefined ? changedCell : ""}`}
        aria-label={`${field} for ${item.mpn}`}
      >
        {field === "subcategory" && <option value="">—</option>}
        {all.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  };

  return (
    // min-w-0: as a grid item this box would otherwise grow to fit a wide
    // table; with it, the table scrolls inside instead
    <section className="min-w-0 space-y-3 rounded-lg border bg-background p-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Inventory</h2>
          <p className="text-xs text-muted-foreground">
            {editing
              ? "Edit any cell, then press ⌘S or Save to save every change."
              : "Scroll or search to browse all parts in the database."}
          </p>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <div className="flex gap-2">
            <Input
              type="search"
              placeholder="Search by name, category, MPN, DPN…"
              className="h-8 w-full sm:w-64"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {editing && (
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={save}
                disabled={saving || dirtyIds.length === 0}
              >
                {saving
                  ? "Saving…"
                  : dirtyIds.length
                    ? `Save ${dirtyIds.length} change${dirtyIds.length === 1 ? "" : "s"}`
                    : "Save"}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={toggleEditing}
              disabled={saving}
              aria-pressed={editing}
            >
              {editing ? "Done editing" : "Edit table"}
            </Button>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {message ??
              `Showing ${filteredItems.length} of ${items.length} part${items.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </header>

      {filteredItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {items.length === 0
            ? "No parts found yet. Use the form to add your first component."
            : "No parts match your search."}
        </p>
      ) : (
        <div className="max-h-[480px] overflow-y-auto rounded-md border bg-card text-xs sm:text-sm">
          {/* Width limits sit on the text inside cells, not on the cells:
              Safari honors max-width on table cells (Chrome doesn't), which
              left the table narrower than its box. */}
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
              <tr className="border-b">
                <th className="px-2.5 py-2 text-left font-medium">Name</th>
                <th className="px-2.5 py-2 text-left font-medium">Category</th>
                {editing && (
                  <th className="px-2.5 py-2 text-left font-medium">
                    Subcategory
                  </th>
                )}
                <th className="px-2.5 py-2 text-left font-medium">
                  Manufacturer
                </th>
                <th className="px-2.5 py-2 text-left font-medium">Part #</th>
                <th className="px-2.5 py-2 text-left font-medium">Package</th>
                <th className="px-2.5 py-2 text-right font-medium">Qty</th>
                <th className="px-2.5 py-2 text-right font-medium">Actions</th>
                <th className="px-2.5 py-2 text-left font-medium">Datasheet</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const rowError = rowErrors[item.id];
                const category = value(item, "category") as ComponentCategory;
                return (
                  <tr
                    key={item.id}
                    className={`border-b align-top last:border-b-0 hover:bg-muted/60 ${rowError ? "bg-red-50 dark:bg-red-950/30" : ""}`}
                  >
                    {editing ? (
                      <>
                        <td className="min-w-[14rem] px-2 py-1">
                          {textCell(item, "name")}
                          {rowError && (
                            <p className="mt-1 text-[11px] text-destructive">
                              {rowError}
                            </p>
                          )}
                        </td>
                        <td className="min-w-[9rem] px-2 py-1">
                          {selectCell(item, "category", CATEGORY_KEYS)}
                        </td>
                        <td className="min-w-[9rem] px-2 py-1">
                          {selectCell(
                            item,
                            "subcategory",
                            (CATEGORY_OPTIONS[category] ??
                              []) as readonly string[],
                          )}
                        </td>
                        <td className="min-w-[8rem] px-2 py-1">
                          {textCell(item, "manufacturer")}
                        </td>
                        <td className="min-w-[10rem] px-2 py-1">
                          {textCell(item, "mpn", "font-mono")}
                        </td>
                        <td className="min-w-[6rem] px-2 py-1">
                          {textCell(item, "package", "font-mono")}
                        </td>
                        <td className="min-w-[5rem] px-2 py-1">
                          {textCell(item, "quantity", "text-right font-mono")}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2.5 py-1.5 align-middle">
                          <PartDialog part={item}>
                            {/* Safari won't ellipsize text directly in a <button>,
                                so the inner span does the truncating */}
                            <button
                              type="button"
                              className="block w-full min-w-0 overflow-hidden text-left font-medium hover:underline"
                            >
                              <span className="block max-w-[16rem] truncate">
                                {item.name || item.mpn}
                              </span>
                            </button>
                          </PartDialog>
                          {rowError && (
                            <p className="mt-1 text-[11px] text-destructive">
                              {rowError}
                            </p>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5 align-middle text-muted-foreground">
                          <span className="block max-w-[10rem] truncate">
                            {item.category}
                          </span>
                          {item.subcategory && (
                            <span className="block max-w-[10rem] truncate text-[11px] opacity-75">
                              {item.subcategory}
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5 align-middle text-muted-foreground">
                          <span className="block max-w-[9rem] truncate">
                            {item.manufacturer || "-"}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 align-middle text-muted-foreground">
                          <span className="block max-w-[12rem] truncate font-mono text-[11px] sm:text-xs">
                            {item.mpn || "-"}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 align-middle text-muted-foreground">
                          <span className="block max-w-[8rem] truncate font-mono text-[11px] sm:text-xs">
                            {item.package || "-"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-1.5 text-right align-middle font-mono">
                          {item.quantity}
                        </td>
                      </>
                    )}

                    <td className="whitespace-nowrap px-2.5 py-1.5 text-right align-middle">
                      <div className="flex items-center justify-end gap-1">
                        <PrintButton item={item} iconOnly />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          title="Delete part"
                          aria-label={`Delete ${item.mpn || item.name}`}
                          onClick={async () => {
                            const confirmed = window.confirm(
                              "Delete this part from inventory?",
                            );
                            if (!confirmed) return;

                            await fetch("/api/inventory/delete", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: item.id }),
                            });

                            router.refresh();
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>

                    {editing ? (
                      <td className="min-w-[14rem] px-2 py-1">
                        {textCell(item, "datasheet")}
                      </td>
                    ) : (
                      <td className="whitespace-nowrap px-2.5 py-1.5 align-middle text-muted-foreground">
                        {item.datasheet ? (
                          <a
                            href={item.datasheet}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-foreground"
                          >
                            Open
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
