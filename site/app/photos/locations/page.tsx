import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { PhotoCard, type Photo } from "app/components/photos-grid";
import { PhotoNavbar } from "app/components/photonav";

function cloudinaryPreview(url: string, transform = "w_1200,f_auto"): string {
  try {
    const idx = url.indexOf("/upload/");
    if (idx === -1) return url;
    const before = url.slice(0, idx + "/upload/".length);
    const after = url.slice(idx + "/upload/".length);
    if (
      after.startsWith("w_") ||
      after.startsWith("c_") ||
      after.startsWith("f_")
    ) {
      return url;
    }
    return `${before}${transform}/${after}`;
  } catch {
    return url;
  }
}

async function getPhotosByTrip(): Promise<Record<string, Photo[]>> {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return {};

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("images")
    .select(
      "id,url,title,time,location,camera_model,lens,focal_length,aperture,iso,exposure,trip"
    )
    .order("time", { ascending: false });

  if (error || !data) return {};

  const grouped: Record<string, Photo[]> = {};

  for (const row of data as any[]) {
    const isoNum = row.iso != null ? Number(row.iso) : null;
    const originalUrl = typeof row.url === "string" ? row.url : "";
    const previewUrl = cloudinaryPreview(originalUrl);
    const tripRaw: string | null = row.trip ?? null;
    const trip = tripRaw ? tripRaw.trim() : "";

    // Skip images without a valid trip value instead of grouping as "Uncategorized"
    if (!trip) {
      continue;
    }

    const photo: Photo = {
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
      trip,
    };

    if (!grouped[trip]) grouped[trip] = [];
    grouped[trip].push(photo);
  }

  return grouped;
}

function getLatestTimestamp(photos: Photo[]): number {
  let latest = -Infinity;
  for (const photo of photos) {
    if (!photo.date_taken) continue;
    const t = new Date(photo.date_taken).getTime();
    if (Number.isFinite(t) && t > latest) {
      latest = t;
    }
  }
  return latest;
}

export const revalidate = 60;

export default async function ComponentsPhotosPage() {
  headers();
  const grouped = await getPhotosByTrip();
  const categories = Object.keys(grouped).sort((a, b) => {
    const latestA = getLatestTimestamp(grouped[a] || []);
    const latestB = getLatestTimestamp(grouped[b] || []);

    if (latestA !== latestB) {
      // Most recent first
      return latestB - latestA;
    }

    return a.localeCompare(b);
  });

  return (
    <section>
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">
        Locations
      </h1>
      <PhotoNavbar />
      <div className="space-y-10">
        {categories.map((category) => {
          const photos = grouped[category];
          if (!photos || photos.length === 0) return null;
          return (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight overflow:auto">
                {category}
              </h2>
              <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="flex-none w-64 md:w-72 lg:w-84"
                  >
                    <PhotoCard photo={photo} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
