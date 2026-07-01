import PhotosGrid, { type Photo } from "app/components/photos-grid";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { PhotoNavbar } from "app/components/photonav";

function cloudinaryPreview(url: string, transform = "w_1200,f_auto"): string {
  try {
    const idx = url.indexOf("/upload/");
    if (idx === -1) return url;
    const before = url.slice(0, idx + "/upload/".length);
    const after = url.slice(idx + "/upload/".length);
    // avoid duplicating transform if present
    if (
      after.startsWith("w_") ||
      after.startsWith("c_") ||
      after.startsWith("f_")
    ) {
      return url; // already has a transform
    }
    return `${before}${transform}/${after}`;
  } catch {
    return url;
  }
}

async function getPhotos(): Promise<Photo[]> {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("images")
    .select(
      "id,url,title,time,location,camera_model,lens,focal_length,aperture,iso,exposure,category,trip,featured",
    )
    .eq("featured", true)
    .order("time", { ascending: false })
    .limit(60);

  if (error || !data) return [];

  return data.map((row: any) => {
    const isoNum = row.iso != null ? Number(row.iso) : null;
    const originalUrl = typeof row.url === "string" ? row.url : "";
    const previewUrl = cloudinaryPreview(originalUrl);
    return {
      id: String(row.id ?? previewUrl),
      url: previewUrl,
      fullUrl: originalUrl,
      title: row.title ?? null,
      date_taken: row.time ?? null,
      location: row.location ?? null,
      camera_make: null,
      camera_model: row.camera_model ?? null,
      lens: row.lens ?? null,
      focal_length: row.focal_length ?? null,
      aperture: row.aperture ?? null,
      shutter_speed: row.exposure ?? null,
      iso: Number.isFinite(isoNum) ? (isoNum as number) : null,
      category: row.category ?? null,
      trip: row.trip ?? null,
      featured: row.featured ?? null,
    } as Photo;
  });
}

export const revalidate = 60; // cache for 1 minute

export default async function PhotosPage() {
  headers();
  const photos = await getPhotos();

  return (
    <section>
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Photos</h1>
      <PhotoNavbar />
      {/* Centered viewport-width wrapper without negative margins */}
      <div>
        <div>
          <PhotosGrid photos={photos} />
        </div>
      </div>
    </section>
  );
}
