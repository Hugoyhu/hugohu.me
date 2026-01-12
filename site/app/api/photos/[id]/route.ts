import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const body = await req.json();

  const update: Record<string, any> = {};
  const allowedFields = [
    "title",
    "location",
    "camera_model",
    "lens",
    "focal_length",
    "aperture",
    "iso",
    "exposure",
    "category",
    "trip",
    "featured",
  ];

  for (const field of allowedFields) {
    if (field in body) {
      update[field] = body[field];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const idNum = Number(id);

  const { error } = await supabase
    .from("images")
    .update(update)
    .eq("id", Number.isFinite(idNum) ? idNum : id)
    .single();

  if (error) {
    console.error("Error updating image", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
