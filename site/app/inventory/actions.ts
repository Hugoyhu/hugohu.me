"use server";

import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { SPEC_FIELD_HINTS, type ComponentCategory } from "types/inventory";

// Initialize Admin bypass for RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// get
export async function getInventory() {
  // Check if logged in via NextAuth
  const session = await getServerSession();

  if (!session || !session.user) {
    throw new Error("You must be logged in to see inventory");
  }

  // Use admin client
  const { data, error } = await supabaseAdmin
    .from("components")
    .select("*")
    .order("category");

  if (error) throw error;
  return data;
}

// upsert based on MPN (update if exists, insert if not)
export async function upsertComponent(formData: FormData) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  // extract fields
  const category = formData.get("category") as ComponentCategory | null;

  const specs: Record<string, any> = {};
  if (category && SPEC_FIELD_HINTS[category]) {
    for (const key of SPEC_FIELD_HINTS[category]) {
      const raw = formData.get(`spec_${key}`);
      const value =
        typeof raw === "string" ? raw.trim() : raw?.toString().trim();
      if (value) {
        specs[key] = value;
      }
    }
  }

  const rawData = {
    name: formData.get("name") as string,
    manufacturer: formData.get("manufacturer") as string,
    mpn: formData.get("mpn") as string,
    distributor: formData.get("distributor") as string,
    dpn: formData.get("dpn") as string,
    category: (category || "") as string,
    subcategory: formData.get("subcategory") as string,
    quantity: parseInt(formData.get("quantity") as string),
    package: formData.get("package") as string,
    specs,
    rohs: (formData.get("rohs") as string) === "true",
    msl: parseInt((formData.get("msl") as string) || "0"),
  };

  // Upsert: if mpn exists, update; otherwise insert
  const { error } = await supabaseAdmin
    .from("components")
    .upsert(rawData, { onConflict: "mpn" });

  if (error) throw new Error(error.message);

  // refresh page data
  revalidatePath("/inventory");
}

export async function deleteComponent(id: string) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  const { error } = await supabaseAdmin
    .from("components")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/inventory");
}
