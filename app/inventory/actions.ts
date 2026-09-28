"use server";

import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CATEGORY_KEYS,
  CATEGORY_OPTIONS,
  type ComponentCategory,
} from "types/inventory";
import { normalizeManufacturer } from "lib/inventory-normalize";

// Initialize Admin bypass for RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Only keep well-formed http(s) links
function toHttpUrl(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

// get
export async function getInventory() {
  // Check if logged in via NextAuth
  const session = await getServerSession();

  if (!session || !session.user) {
    throw new Error("You must be logged in to see inventory");
  }

  const table_name = process.env.SUPABASE_INV_TABLE_NAME!;
  // Use admin client
  const { data, error } = await supabaseAdmin
    .from(table_name)
    .select("*")
    // category, then name, then id: a stable order, so rows don't jump
    // around after a save
    .order("category")
    .order("name")
    .order("id");

  if (error) throw error;
  return data;
}

// Add a part. If its MPN is already in the inventory, the form must say
// what to do (the add form asks the user): "increment" adds the entered
// quantity to the existing part; "overwrite" replaces its details.
export async function upsertComponent(formData: FormData) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  // extract fields
  const category = formData.get("category") as ComponentCategory | null;
  const specRaw = formData.get("spec");
  const spec =
    typeof specRaw === "string" ? specRaw.trim() : specRaw?.toString().trim();

  const rawData = {
    name: ((formData.get("name") as string) ?? "").trim(),
    manufacturer: ((formData.get("manufacturer") as string) ?? "")
      .trim()
      .toUpperCase(),
    mpn: ((formData.get("mpn") as string) ?? "").trim(),
    distributor: ((formData.get("distributor") as string) ?? "").trim(),
    dpn: ((formData.get("dpn") as string) ?? "").trim(),
    category: (category || "") as string,
    subcategory: formData.get("subcategory") as string,
    quantity: parseInt(formData.get("quantity") as string),
    package: ((formData.get("package") as string) ?? "").trim(),
    spec: spec || null,
    datasheet: toHttpUrl(formData.get("datasheet")),
    rohs: (formData.get("rohs") as string) === "true",
    msl: parseInt((formData.get("msl") as string) || "0"),
  };

  const table_name = process.env.SUPABASE_INV_TABLE_NAME!;
  const mode = formData.get("existingMode");

  // Case-insensitive match; escape ilike's wildcards so MPNs match literally
  const pattern = rawData.mpn.replace(/[\\%_]/g, "\\$&");
  const { data: matches, error: lookupError } = await supabaseAdmin
    .from(table_name)
    .select("id, quantity")
    .ilike("mpn", pattern)
    .limit(1);
  if (lookupError) throw new Error(lookupError.message);
  const existing = matches?.[0];

  let error;
  if (!existing) {
    ({ error } = await supabaseAdmin.from(table_name).insert(rawData));
  } else if (mode === "increment") {
    const added = Number.isFinite(rawData.quantity) ? rawData.quantity : 0;
    ({ error } = await supabaseAdmin
      .from(table_name)
      .update({ quantity: (existing.quantity ?? 0) + added })
      .eq("id", existing.id));
  } else if (mode === "overwrite") {
    ({ error } = await supabaseAdmin
      .from(table_name)
      .update(rawData)
      .eq("id", existing.id));
  } else {
    // Never overwrite silently (e.g. the part was added in another tab)
    throw new Error(
      `${rawData.mpn} is already in the inventory. Reload and try again.`,
    );
  }

  if (error) throw new Error(error.message);

  // refresh page data
  revalidatePath("/inventory");
}

export async function deleteComponent(id: string) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const table_name = process.env.SUPABASE_INV_TABLE_NAME!;
  const { error } = await supabaseAdmin.from(table_name).delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/inventory");
}

// ---------------------------------------------------------------------------
// Bulk edit from the table: each row's changed fields, saved by id

const EDITABLE_FIELDS = [
  "name",
  "manufacturer",
  "mpn",
  "category",
  "subcategory",
  "package",
  "quantity",
  "datasheet",
] as const;

const UpdateSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      changes: z.record(z.string(), z.unknown()),
    }),
  )
  .min(1)
  .max(500);

export type UpdateResult =
  | { ok: true; saved: string[]; errors: Record<string, string> }
  | { ok: false; error: string };

// Validates one row's changes against the rules the add form follows.
function buildUpdate(
  changes: Record<string, unknown>,
  current: { category: string; subcategory: string },
): { update: Record<string, string | number | null> } | { error: string } {
  const update: Record<string, string | number | null> = {};
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  for (const field of EDITABLE_FIELDS) {
    if (!(field in changes)) continue;
    const raw = changes[field];
    switch (field) {
      case "name":
      case "mpn":
        if (!text(raw)) return { error: `${field === "mpn" ? "MPN" : "Name"} can't be empty.` };
        update[field] = text(raw);
        break;
      case "manufacturer":
        update.manufacturer = normalizeManufacturer(text(raw));
        break;
      case "package":
        update.package = text(raw);
        break;
      case "quantity": {
        const n = typeof raw === "number" ? raw : Number(text(raw));
        if (!Number.isInteger(n) || n < 0) {
          return { error: "Quantity must be a whole number, 0 or more." };
        }
        update.quantity = n;
        break;
      }
      case "datasheet": {
        if (!text(raw)) {
          update.datasheet = null;
          break;
        }
        const url = toHttpUrl(text(raw));
        if (!url) return { error: "Datasheet must be an http(s) link." };
        update.datasheet = url;
        break;
      }
      case "category":
        if (!(CATEGORY_KEYS as string[]).includes(text(raw))) {
          return { error: `Unknown category "${text(raw)}".` };
        }
        update.category = text(raw);
        break;
      case "subcategory":
        update.subcategory = text(raw);
        break;
    }
  }

  // The subcategory must belong to the (possibly new) category.
  const category = (update.category ?? current.category) as ComponentCategory;
  const options = (CATEGORY_OPTIONS[category] ?? []) as readonly string[];
  const subcategory = (update.subcategory ?? current.subcategory) as string;
  if (subcategory && !options.includes(subcategory)) {
    if ("subcategory" in update) {
      return { error: `"${subcategory}" isn't a ${category} subcategory.` };
    }
    update.subcategory = ""; // category changed; old subcategory no longer fits
  }

  return { update };
}

export async function updateComponents(input: unknown): Promise<UpdateResult> {
  const session = await getServerSession();
  if (!session) return { ok: false, error: "Unauthorized" };

  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nothing valid to save." };

  const table_name = process.env.SUPABASE_INV_TABLE_NAME!;
  const { data: rows, error } = await supabaseAdmin
    .from(table_name)
    .select("id, mpn, category, subcategory")
    .in(
      "id",
      parsed.data.map((row) => row.id),
    );
  if (error) return { ok: false, error: error.message };
  const current = new Map((rows ?? []).map((row) => [row.id, row]));

  const saved: string[] = [];
  const errors: Record<string, string> = {};

  // Rows are saved one by one so a bad row doesn't block the rest.
  for (const { id, changes } of parsed.data) {
    const row = current.get(id);
    if (!row) {
      errors[id] = "This part no longer exists.";
      continue;
    }
    const built = buildUpdate(changes, {
      category: row.category ?? "",
      subcategory: row.subcategory ?? "",
    });
    if ("error" in built) {
      errors[id] = built.error;
      continue;
    }
    if (Object.keys(built.update).length === 0) {
      saved.push(id);
      continue;
    }
    const result = await supabaseAdmin
      .from(table_name)
      .update(built.update)
      .eq("id", id);
    if (result.error) {
      errors[id] =
        result.error.code === "23505"
          ? `Another part already has MPN ${built.update.mpn}.`
          : result.error.message;
    } else {
      saved.push(id);
    }
  }

  revalidatePath("/inventory");
  return { ok: true, saved, errors };
}
