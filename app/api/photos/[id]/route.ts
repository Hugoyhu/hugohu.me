import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

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

export async function DELETE(
  _req: NextRequest,
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

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const idNum = Number(id);
  const { data, error: fetchError } = await supabase
    .from("images")
    .select("url")
    .eq("id", Number.isFinite(idNum) ? idNum : id)
    .single();

  if (fetchError) {
    console.error("Error fetching image for delete", fetchError);
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 }
    );
  }

  const imageUrl: string | null = (data as any)?.url ?? null;

  if (imageUrl) {
    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (cloudName && apiKey && apiSecret) {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        });

        const publicId = getCloudinaryPublicId(imageUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
    } catch (e) {
      console.error("Error deleting from Cloudinary", e);
      // continue and try to delete Supabase row regardless
    }
  }

  const { error: deleteError } = await supabase
    .from("images")
    .delete()
    .eq("id", Number.isFinite(idNum) ? idNum : id);

  if (deleteError) {
    console.error("Error deleting image row", deleteError);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function getCloudinaryPublicId(imageUrl: string): string | null {
  try {
    const urlObj = new URL(imageUrl);
    const parts = urlObj.pathname.split("/upload/");
    if (parts.length < 2) return null;
    let after = parts[1]; // e.g. "v1700000000/folder/name.jpg" or "folder/name.jpg"

    const segments = after.split("/");
    if (segments.length > 1 && /^v\d+$/.test(segments[0] ?? "")) {
      segments.shift();
    }

    const pathWithExt = segments.join("/");
    return pathWithExt.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
}
