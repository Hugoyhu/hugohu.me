"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";

import { upsertComponent } from "./actions";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  CATEGORY_KEYS,
  CATEGORY_OPTIONS,
  type ComponentCategory,
  type Component,
} from "types/inventory";
import { PrintButton } from "./print-button";
import { LabelDocument } from "./LabelDocument";

type InventoryFormProps = {
  items: Component[];
};

export function InventoryForm({ items }: InventoryFormProps) {
  const router = useRouter();
  const [category, setCategory] = React.useState<
    ComponentCategory | undefined
  >();
  const [subcategory, setSubcategory] = React.useState<string | undefined>();
  const [selectedItem, setSelectedItem] = React.useState<Component | null>(
    null,
  );
  const [formKey, setFormKey] = React.useState(0);
  const [search, setSearch] = React.useState("");

  const subcategoryOptions = category ? (CATEGORY_OPTIONS[category] ?? []) : [];

  const filteredItems = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const values: Array<string | number | null | undefined> = [
        item.name,
        item.category,
        item.subcategory,
        item.manufacturer,
        item.mpn,
        item.distributor,
        item.dpn,
      ];

      return values.some((value) =>
        value?.toString().toLowerCase().includes(q),
      );
    });
  }, [items, search]);

  const handleAutoPrintLabel = React.useCallback(async (item: Component) => {
    try {
      const blob = await pdf(<LabelDocument item={item} />).toBlob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.mpn || item.name || "label"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to auto-print label", error);
    }
  }, []);

  // persist across saves
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const storedCategory = window.localStorage.getItem(
      "inventory:lastCategory",
    ) as ComponentCategory | null;
    const storedSubcategory = window.localStorage.getItem(
      "inventory:lastSubcategory",
    );

    if (storedCategory && CATEGORY_KEYS.includes(storedCategory)) {
      setCategory(storedCategory);
      if (storedSubcategory) {
        setSubcategory(storedSubcategory);
      }
    }
  }, []);

  // persist drop down
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (category) {
      window.localStorage.setItem("inventory:lastCategory", category);
    }
    if (subcategory) {
      window.localStorage.setItem("inventory:lastSubcategory", subcategory);
    } else {
      window.localStorage.removeItem("inventory:lastSubcategory");
    }
  }, [category, subcategory]);

  // After a save, auto-download a label for the last-saved MPN
  React.useEffect(() => {
    if (typeof window === "undefined" || !items.length) return;

    const lastMpn = window.localStorage.getItem("inventory:lastMpnForLabel");
    if (!lastMpn) return;

    const item = items.find((it) => it.mpn === lastMpn);
    window.localStorage.removeItem("inventory:lastMpnForLabel");

    if (item) {
      void handleAutoPrintLabel(item);
    }
  }, [items, handleAutoPrintLabel]);

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    const tag = target.tagName.toLowerCase();
    const isTextarea = tag === "textarea";
    const isButton = tag === "button";
    const isSubmitInput =
      tag === "input" &&
      (target as HTMLInputElement).type &&
      (target as HTMLInputElement).type.toLowerCase() === "submit";

    if (isTextarea || isButton || isSubmitInput) return;

    event.preventDefault();
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const mpnInput = form.elements.namedItem("mpn") as HTMLInputElement | null;

    if (typeof window !== "undefined" && mpnInput?.value) {
      window.localStorage.setItem("inventory:lastMpnForLabel", mpnInput.value);
    }
  };

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form
        key={formKey}
        action={upsertComponent}
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={handleFormSubmit}
        onKeyDown={handleFormKeyDown}
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="RES 100 OHM 5% 1/10W 0603"
            defaultValue={selectedItem?.name ?? ""}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input
            id="manufacturer"
            name="manufacturer"
            placeholder="Yageo"
            defaultValue={selectedItem?.manufacturer ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mpn">MPN</Label>
          <Input
            id="mpn"
            name="mpn"
            placeholder="RC0603FR-0710KL"
            defaultValue={selectedItem?.mpn ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="distributor">Distributor</Label>
          <Input
            id="distributor"
            name="distributor"
            placeholder="Digi-Key"
            defaultValue={selectedItem?.distributor ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dpn">Distributor part number</Label>
          <Input
            id="dpn"
            name="dpn"
            placeholder="311-10.0KHRCT-ND"
            defaultValue={selectedItem?.dpn ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <select
            name="category"
            value={category ?? ""}
            onChange={(event) => {
              const value =
                (event.target.value as ComponentCategory | "") || undefined;
              setCategory(value);
              setSubcategory(undefined);
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Select category
            </option>
            {CATEGORY_KEYS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Subcategory</Label>
          <select
            name="subcategory"
            value={subcategory ?? ""}
            onChange={(event) => {
              const value = event.target.value || undefined;
              setSubcategory(value);
            }}
            disabled={!category}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled>
              {category ? "Select subcategory" : "Select category first"}
            </option>
            {subcategoryOptions.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={0}
            defaultValue={selectedItem ? selectedItem.quantity : 0}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="package">Package</Label>
          <Input
            id="package"
            name="package"
            placeholder="0603"
            defaultValue={selectedItem?.package ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rohs">RoHS</Label>
          <select
            id="rohs"
            name="rohs"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            defaultValue={selectedItem ? String(selectedItem.rohs) : "true"}
          >
            <option value="" disabled>
              Select RoHS status
            </option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="msl">MSL</Label>
          <Input
            id="msl"
            name="msl"
            placeholder="1-6"
            defaultValue={selectedItem ? String(selectedItem.msl) : "1"}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="spec">Spec (optional)</Label>
          <Textarea
            id="spec"
            name="spec"
            placeholder="e.g. 10kΩ ±1% 0.1W, 0603, 50V"
            defaultValue={selectedItem?.spec ?? ""}
            rows={2}
          />
        </div>

        <div className="sm:col-span-2 flex items-center justify-between gap-2">
          <Button type="submit">Save component</Button>
          <p className="text-[11px] text-muted-foreground">
            New or existing parts are upserted based on MPN.
          </p>
        </div>
      </form>
      <section className="space-y-3 rounded-lg border bg-background p-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-medium">Inventory</h2>
            <p className="text-xs text-muted-foreground">
              Scroll or search to browse all parts in the database.
            </p>
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <Input
              type="search"
              placeholder="Search by name, category, MPN, DPN…"
              className="h-8 w-full"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span className="text-[11px] text-muted-foreground">
              Showing {filteredItems.length} of {items.length} part
              {items.length === 1 ? "" : "s"}
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
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Subcategory
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Manufacturer
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Part #</th>
                  <th className="px-3 py-2 text-right font-medium">Package</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>

                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-b-0 hover:bg-muted/60"
                  >
                    <td className="max-w-[10rem] px-3 py-1.5 align-middle">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="block truncate font-medium hover:underline"
                      >
                        {item.name || item.mpn}
                      </Link>
                    </td>
                    <td className="max-w-[8rem] px-3 py-1.5 align-middle text-muted-foreground">
                      <span className="block truncate">{item.category}</span>
                    </td>
                    <td className="max-w-[8rem] px-3 py-1.5 align-middle text-muted-foreground">
                      <span className="block truncate">
                        {item.subcategory || "-"}
                      </span>
                    </td>
                    <td className="max-w-[10rem] px-3 py-1.5 align-middle text-muted-foreground">
                      <span className="block truncate">
                        {item.manufacturer || "-"}
                      </span>
                    </td>
                    <td className="max-w-[10rem] px-3 py-1.5 align-middle text-muted-foreground">
                      <span className="block truncate font-mono text-[11px] sm:text-xs">
                        {item.mpn || "-"}
                      </span>
                    </td>
                    <td className="max-w-[10rem] px-3 py-1.5 align-middle text-muted-foreground">
                      <span className="block truncate font-mono text-[11px] sm:text-xs">
                        {item.package || "-"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right align-middle font-mono">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right align-middle">
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[11px]"
                          onClick={() => {
                            setSelectedItem(item);
                            setCategory(item.category as ComponentCategory);
                            setSubcategory(item.subcategory || undefined);
                            setFormKey((key) => key + 1);
                          }}
                        >
                          Edit
                        </Button>

                        <PrintButton item={item} />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[11px] text-destructive"
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
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
