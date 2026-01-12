import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = process.env.SUPABASE_URL;
    const key =
      process.env.SUPABASE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json(
        {
          error: "Missing Supabase server env (SUPABASE_URL, SUPABASE_SECRET)",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key);

    const payload = {
      url: body.url,
      camera_model: body.camera_model ?? null,
      lens: body.lens ?? null,
      time: body.time ?? null,
      exposure: body.exposure ?? null,
      aperture: body.aperture ?? null,
      focal_length: body.focal_length ?? null,
      iso: body.iso ?? null,
      location: body.location ?? null,
      title: body.title ?? null,
      category: body.category ?? null,
      trip: body.trip ?? null,
      featured: Boolean(body.featured ?? false),
    };

    const { error } = await supabase.from("images").insert(payload);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Insert error" },
      { status: 500 }
    );
  }
}
