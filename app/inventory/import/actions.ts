"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { authOptions } from "app/api/auth/[...nextauth]/route";
import {
  CATEGORY_KEYS,
  CATEGORY_OPTIONS,
  type ComponentCategory,
} from "types/inventory";
import {
  normalizeManufacturer,
  normalizeMpn,
  normalizePackage,
  stripPackagingSuffix,
} from "lib/inventory-normalize";

const MODEL = "claude-haiku-4-5";
const MAX_PDF_BYTES = 10 * 1024 * 1024;

const anthropic = new Anthropic();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const categoryEnum = z.enum(
  CATEGORY_KEYS as [ComponentCategory, ...ComponentCategory[]],
);

// Model structured output
const InvoiceSchema = z.object({
  distributor: z.string(),
  order_number: z.string().nullable(),
  lines: z.array(
    z.object({
      mpn_as_printed: z.string().nullable(),
      mpn: z.string().nullable(),
      manufacturer: z.string().nullable(),
      dpn: z.string().nullable(),
      description: z.string(),
      quantity: z.number().int(),
      package: z.string().nullable(),
      category: categoryEnum.nullable(),
      subcategory: z.string().nullable(),
    }),
  ),
});

const SUBCATEGORY_GUIDE = CATEGORY_KEYS.map(
  (cat) => `- ${cat}: ${CATEGORY_OPTIONS[cat].join(", ")}`,
).join("\n");

const SYSTEM_PROMPT = `Please extract line items from electronic component distributor invoices and packing slips (Digi-Key, Mouser, LCSC, etc.) so they can be added to a personal parts inventory.

For each purchased component, please return:
- mpn_as_printed: the manufacturer part number exactly as printed, or null if absent.
- mpn: the same part number with any packaging-only suffix removed, so that tape-and-reel, cut-tape, and tube versions of one part share one MPN. Examples: "ATTINY85-20SSNR" → "ATTINY85-20SSN", "LM358DR" → "LM358D", "SN74HC595PWR" → "SN74HC595PW", "MCP1700T-3302E/TT" → "MCP1700-3302E/TT". Only remove characters you are confident denote packaging (reel, tape, tube, tray), never ones that change the part itself (package, temperature grade, tolerance, voltage). If unsure, return it exactly as printed. For passives (resistors, capacitors, inductors, ferrites, crystals), always return it exactly as printed: their packaging codes are embedded mid-number.
- manufacturer: the short, commonly used brand name rather than the full legal name. Drop company suffixes and regional qualifiers (Inc, LLC, Ltd, Co., Corp, Corporation, GmbH, USA, America, Electronics, Industries, Technology, Semiconductor) when the brand is recognizable without them. Examples: "Adafruit Industries LLC" → "Adafruit", "Nexperia USA Inc." → "Nexperia", "Texas Instruments Incorporated" → "Texas Instruments", "Microchip Technology" → "Microchip", "STMicroelectronics" → "STMicroelectronics", "Würth Elektronik" → "Wurth Elektronik", "KYOCERA AVX" → "KYOCERA AVX". Null if absent.
- dpn (distributor part number): as printed, or null.
- description: the distributor's part description, e.g. "RES 10K OHM 1% 1/10W 0402", "CAP CER 0.1UF 10% 50V X7R 0805", "CAP ALUM 100UF 20% 35V RAD", for passives. Please keep them in that broad order for specs. For other components, including ICs, consider using the manufacturer part # as the description.
- quantity: the quantity SHIPPED on this document. If shipped and ordered differ (backorders), use shipped; if a line shipped 0, still include it with quantity 0.
- package: the footprint/package if you can tell from the description (e.g. "0402", "SOT-23-5", "QFN-32"), else null. Note that not all package names will come with dashes: so "SOD323F" or "24QFN" are also valid. Please try to align to standardized names with the package type first and pin count last: "QFN-24" rather than "24QFN", "SOIC-8" rather than "8SOIC" or "8-SOIC", "TSSOP-20" rather than "20-TSSOP".
- category and subcategory: pick the best fit from the list below, or null if nothing fits. The subcategory must be one listed under the chosen category.

Categories and their subcategories:
${SUBCATEGORY_GUIDE}

Skip lines that are not components: shipping, tariffs, handling fees, taxes, tape-and-reel/cut-tape charges, and subtotals. Never invent part numbers; if a value is not on the document, use null.`;

type StockedPart = { id: string; mpn: string; name: string; quantity: number };

export type ReceiptLine = {
  mpn: string;
  // Shown in review when it differs from mpn (packaging suffix removed)
  printedMpn: string;
  manufacturer: string;
  dpn: string;
  name: string;
  quantity: number;
  package: string;
  category: string;
  subcategory: string;
  existing: StockedPart | null;
};

export type ExtractResult =
  | {
      ok: true;
      distributor: string;
      orderNumber: string | null;
      lines: ReceiptLine[];
    }
  | { ok: false; error: string };

async function requireSession() {
  const session = await getServerSession(authOptions as any);
  if (!session) throw new Error("Unauthorized");
}

async function loadInventoryByMpn() {
  const { data, error } = await supabaseAdmin
    .from(process.env.SUPABASE_INV_TABLE_NAME!)
    .select("id, mpn, name, quantity");
  if (error) throw new Error(error.message);

  const byMpn = new Map<string, StockedPart>();
  for (const row of data ?? []) {
    if (row.mpn) byMpn.set(normalizeMpn(row.mpn), row);
  }
  return byMpn;
}

// Step 1: PDF -> proposed changes. Nothing is written w/o approval
export async function extractInvoice(
  formData: FormData,
): Promise<ExtractResult> {
  await requireSession();

  const file = formData.get("invoice");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a PDF to upload." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "Only PDF invoices are supported." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, error: "PDF is larger than 10 MB." };
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");

  let response;
  try {
    response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data },
            },
            { type: "text", text: "Extract the component line items." },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(InvoiceSchema) },
    });
  } catch (error) {
    console.error("Invoice extraction failed", error);
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `Claude API error (${error.status}).` };
    }
    return { ok: false, error: "Could not reach Claude." };
  }

  if (response.stop_reason === "max_tokens") {
    return { ok: false, error: "Invoice too long to extract in one pass." };
  }
  const invoice = response.parsed_output;
  if (!invoice) {
    return { ok: false, error: "Claude did not return usable line items." };
  }

  const inventory = await loadInventoryByMpn();

  const lines: ReceiptLine[] = invoice.lines.map((line) => {
    const printedMpn = line.mpn_as_printed?.trim() ?? "";
    let mpn = stripPackagingSuffix(printedMpn, line.mpn?.trim() ?? "");

    // Match on either form, so a part already stocked under its reel MPN
    // is incremented rather than duplicated. Existing rows keep their MPN.
    const existing =
      (mpn && inventory.get(normalizeMpn(mpn))) ||
      (printedMpn && inventory.get(normalizeMpn(printedMpn))) ||
      null;
    if (existing) mpn = existing.mpn;

    const category = line.category ?? "";
    const validSub =
      line.category &&
      line.subcategory &&
      (CATEGORY_OPTIONS[line.category] as readonly string[]).includes(
        line.subcategory,
      );

    return {
      mpn,
      printedMpn,
      manufacturer: normalizeManufacturer(line.manufacturer ?? ""),
      dpn: line.dpn ?? "",
      name: line.description,
      quantity: Math.max(0, line.quantity),
      package: normalizePackage(line.package),
      category,
      subcategory: validSub ? line.subcategory! : "",
      existing,
    };
  });

  return {
    ok: true,
    distributor: invoice.distributor,
    orderNumber: invoice.order_number,
    lines,
  };
}

const ApplyLineSchema = z.object({
  mpn: z.string().trim().min(1),
  manufacturer: z.string(),
  dpn: z.string(),
  name: z.string().trim().min(1),
  quantity: z.number().int().min(0),
  package: z.string(),
  category: z.string(),
  subcategory: z.string(),
});

const ApplySchema = z.object({
  distributor: z.string(),
  lines: z.array(ApplyLineSchema).min(1),
});

export type ApplyResult =
  | { ok: true; updated: number; inserted: number }
  | { ok: false; error: string };

// Step 2: confirmed changes -> database. Re-validates and re-matches on the
// server rather than trusting what the client sends back.
export async function applyReceipt(input: unknown): Promise<ApplyResult> {
  await requireSession();

  const parsed = ApplySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Every included line needs an MPN and name." };
  }
  const { distributor, lines } = parsed.data;

  // Merge duplicate MPNs (split shipments on one invoice)
  const merged = new Map<string, z.infer<typeof ApplyLineSchema>>();
  for (const line of lines) {
    const key = normalizeMpn(line.mpn);
    const prev = merged.get(key);
    merged.set(
      key,
      prev ? { ...prev, quantity: prev.quantity + line.quantity } : line,
    );
  }

  const inventory = await loadInventoryByMpn();
  const table = process.env.SUPABASE_INV_TABLE_NAME!;

  const updates: Array<{ id: string; quantity: number }> = [];
  const inserts: Array<Record<string, unknown>> = [];

  for (const [key, line] of Array.from(merged)) {
    const existing = inventory.get(key);
    if (existing) {
      updates.push({
        id: existing.id,
        quantity: existing.quantity + line.quantity,
      });
      continue;
    }
    if (!(CATEGORY_KEYS as string[]).includes(line.category)) {
      return { ok: false, error: `Pick a category for ${line.mpn}.` };
    }
    inserts.push({
      name: line.name,
      manufacturer: normalizeManufacturer(line.manufacturer),
      mpn: line.mpn.trim(),
      distributor,
      dpn: line.dpn,
      category: line.category,
      subcategory: line.subcategory,
      quantity: line.quantity,
      package: line.package,
      spec: null,
      rohs: true,
      msl: 1,
    });
  }

  const results = await Promise.all([
    ...updates.map(({ id, quantity }) =>
      supabaseAdmin.from(table).update({ quantity }).eq("id", id),
    ),
    ...(inserts.length ? [supabaseAdmin.from(table).insert(inserts)] : []),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidatePath("/inventory");
  return { ok: true, updated: updates.length, inserted: inserts.length };
}
