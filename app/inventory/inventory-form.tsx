"use client";

import * as React from "react";
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
import { LabelDocument } from "./LabelDocument";
import { useFormVisibility } from "./form-visibility";
import { InventoryTable } from "./inventory-table";
import {
  ExistingPartDialog,
  type ExistingChoice,
} from "./existing-part-dialog";
import { normalizeMpn } from "lib/inventory-normalize";

type InventoryFormProps = {
  items: Component[];
};

export function InventoryForm({ items }: InventoryFormProps) {
  const { showForm } = useFormVisibility();
  const showFormRef = React.useRef(showForm);
  showFormRef.current = showForm;
  const [category, setCategory] = React.useState<
    ComponentCategory | undefined
  >();
  const [subcategory, setSubcategory] = React.useState<string | undefined>();
  const [selectedItem, setSelectedItem] = React.useState<Component | null>(
    null,
  );
  const [formKey, setFormKey] = React.useState(0);

  const subcategoryOptions = category ? (CATEGORY_OPTIONS[category] ?? []) : [];

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

  // Cmd+S / Ctrl+S saves instead of the browser's "Save Page": the table's
  // edits while it's in edit mode, otherwise the add form.
  const formRef = React.useRef<HTMLFormElement>(null);
  const tableSaveRef = React.useRef<(() => void) | null>(null);
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s")
        return;
      event.preventDefault();
      if (event.repeat) return;
      if (tableSaveRef.current) {
        tableSaveRef.current();
        return;
      }
      if (!showFormRef.current) return;
      // requestSubmit runs validation and onSubmit, same as clicking Save
      formRef.current?.requestSubmit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  // Saving an MPN that's already in stock asks first: add to its stock or
  // overwrite it. The choice travels to the server in a hidden field.
  const [existingPrompt, setExistingPrompt] = React.useState<{
    part: Component;
    quantity: number;
  } | null>(null);
  const existingModeRef = React.useRef<HTMLInputElement>(null);
  const choiceMadeRef = React.useRef(false);

  const handleExistingChoice = (choice: ExistingChoice) => {
    if (existingModeRef.current) existingModeRef.current.value = choice;
    choiceMadeRef.current = true;
    setExistingPrompt(null);
    formRef.current?.requestSubmit();
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const mpnInput = form.elements.namedItem("mpn") as HTMLInputElement | null;

    if (choiceMadeRef.current) {
      choiceMadeRef.current = false; // this submit carries the user's choice
    } else {
      if (existingModeRef.current) existingModeRef.current.value = "";
      const mpn = mpnInput?.value.trim() ?? "";
      const existing = mpn
        ? items.find((it) => normalizeMpn(it.mpn ?? "") === normalizeMpn(mpn))
        : undefined;
      if (existing) {
        event.preventDefault();
        const qtyInput = form.elements.namedItem(
          "quantity",
        ) as HTMLInputElement | null;
        setExistingPrompt({
          part: existing,
          quantity: Math.max(0, parseInt(qtyInput?.value ?? "0") || 0),
        });
        return;
      }
    }

    if (typeof window !== "undefined" && mpnInput?.value) {
      window.localStorage.setItem("inventory:lastMpnForLabel", mpnInput.value);
    }
  };

  return (
    <div
      className={`mt-4 grid gap-6 ${showForm ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : ""}`}
    >
      {/* Hidden rather than unmounted, so a half-filled form survives */}
      <form
        ref={formRef}
        key={formKey}
        action={upsertComponent}
        className={showForm ? "grid gap-4 sm:grid-cols-2" : "hidden"}
        onSubmit={handleFormSubmit}
        onKeyDown={handleFormKeyDown}
      >
        <input type="hidden" name="existingMode" ref={existingModeRef} />
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
          <Label htmlFor="datasheet">Datasheet URL (optional)</Label>
          <Input
            id="datasheet"
            name="datasheet"
            type="url"
            placeholder="https://…/datasheet.pdf"
            defaultValue={selectedItem?.datasheet ?? ""}
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
            If the MPN is already stocked, you'll be asked whether to add to it
            or overwrite it.
          </p>
        </div>
      </form>
      <InventoryTable items={items} saveRef={tableSaveRef} />
      <ExistingPartDialog
        part={existingPrompt?.part ?? null}
        quantity={existingPrompt?.quantity ?? 0}
        onChoose={handleExistingChoice}
        onCancel={() => setExistingPrompt(null)}
      />
    </div>
  );
}
