"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export type Photo = {
  id: string;
  // preview-sized URL used in grids/strips
  url: string;
  // optional full-size URL (original asset); modal falls back to `url` if missing
  fullUrl?: string | null;
  featured?: boolean | null;
  title?: string | null;
  date_taken?: string | null;
  location?: string | null;
  camera_make?: string | null;
  camera_model?: string | null;
  lens?: string | null;
  focal_length?: string | null;
  aperture?: string | null;
  shutter_speed?: string | null;
  iso?: number | null;
  category?: string | null;
  trip?: string | null;
};

function formatShutterSpeed(val?: string | null): string | null {
  if (!val) return null;
  const raw = val.trim();
  // already a fraction like 1/125
  if (/^\s*1\s*\/\s*\d+\s*$/.test(raw)) return raw.replace(/\s+/g, "");
  // extract first number (e.g., "0.008s" -> 0.008)
  const match = raw.match(/[0-9]*\.?[0-9]+/);
  if (!match) return raw;
  const n = parseFloat(match[0]);
  if (!isFinite(n)) return raw;
  if (n > 0 && n < 1) {
    const preferred = [
      1, 2, 3, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125,
      160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500,
      3200, 4000, 8000,
    ];
    const target = 1 / n;
    let denom = preferred[0];
    let bestDiff = Math.abs(preferred[0] - target);
    for (let i = 1; i < preferred.length; i++) {
      const d = Math.abs(preferred[i] - target);
      if (d < bestDiff) {
        bestDiff = d;
        denom = preferred[i];
      }
    }
    return `1/${denom}`;
  }
  // keep integers and decimals as-is (strip trailing 's')
  return n.toString();
}

function formatCamera(
  make?: string | null,
  model?: string | null
): string | null {
  const m = (make || "").trim();
  const mdl = (model || "").trim();
  if (!m && !mdl) return null;
  if (!m) return mdl || null;
  if (!mdl) return m || null;
  if (mdl.toLowerCase().startsWith(m.toLowerCase())) return mdl;
  return `${m} ${mdl}`;
}

export function PhotoCard({ photo }: { photo: Photo }) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [localPhoto, setLocalPhoto] = useState(photo);
  useEffect(() => setLocalPhoto(photo), [photo]);

  const p = localPhoto;
  const dateStr = p.date_taken
    ? new Date(p.date_taken).toLocaleDateString()
    : null;
  const cameraStr = formatCamera(p.camera_make, p.camera_model);

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: p.title ?? "",
    location: p.location ?? "",
    camera_model: p.camera_model ?? "",
    lens: p.lens ?? "",
    focal_length: p.focal_length ?? "",
    aperture: p.aperture ?? "",
    shutter_speed: p.shutter_speed ?? "",
    iso: p.iso != null ? String(p.iso) : "",
    featured: Boolean(p.featured ?? false),
  });

  useEffect(() => {
    setForm({
      title: p.title ?? "",
      location: p.location ?? "",
      camera_model: p.camera_model ?? "",
      lens: p.lens ?? "",
      focal_length: p.focal_length ?? "",
      aperture: p.aperture ?? "",
      shutter_speed: p.shutter_speed ?? "",
      iso: p.iso != null ? String(p.iso) : "",
      featured: Boolean(p.featured ?? false),
    });
  }, [p]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  async function handleSave() {
    if (!isAuthenticated) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${encodeURIComponent(photo.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title || null,
          location: form.location || null,
          camera_model: form.camera_model || null,
          lens: form.lens || null,
          focal_length: form.focal_length || null,
          aperture: form.aperture || null,
          exposure: form.shutter_speed || null,
          iso:
            form.iso && !Number.isNaN(Number(form.iso))
              ? Number(form.iso)
              : null,
          featured: Boolean(form.featured),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      setLocalPhoto((prev) => ({
        ...prev,
        title: form.title || null,
        location: form.location || null,
        camera_model: form.camera_model || null,
        lens: form.lens || null,
        focal_length: form.focal_length || null,
        aperture: form.aperture || null,
        shutter_speed: form.shutter_speed || null,
        iso:
          form.iso && !Number.isNaN(Number(form.iso)) ? Number(form.iso) : null,
        featured: Boolean(form.featured),
      }));
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "Error saving changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <figure
        className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 cursor-zoom-in"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={p.url}
          alt={p.title || "photo"}
          className="w-full h-auto object-cover"
          loading="lazy"
        />
        {(p.title ||
          p.location ||
          dateStr ||
          p.camera_model ||
          p.lens ||
          p.focal_length ||
          p.aperture ||
          p.shutter_speed ||
          p.iso) && (
          <figcaption className="p-2 text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
            {p.title && <div className="font-medium text-lg">{p.title}</div>}

            {(p.location || dateStr) && (
              <div>{[p.location, dateStr].filter(Boolean).join(" · ")}</div>
            )}

            {(cameraStr || p.shutter_speed || p.iso) && (
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                {[
                  cameraStr,
                  p.shutter_speed
                    ? `${formatShutterSpeed(p.shutter_speed)}s`
                    : null,
                  p.iso ? `ISO ${p.iso}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}

            {(p.lens || p.aperture || p.focal_length) && (
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                {[
                  p.lens ? `${p.lens}` : null,
                  p.focal_length ? `${p.focal_length}mm` : null,
                  p.aperture ? `f/${p.aperture}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
          </figcaption>
        )}
      </figure>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-2 right-2 rounded-full bg-black/60 text-white px-3 py-1 text-sm hover:bg-black/80"
              onClick={() => setIsOpen(false)}
              aria-label="Close image"
            >
              close
            </button>
            {isAuthenticated && (
              <button
                type="button"
                className="absolute top-2 left-2 rounded-full bg-black/60 text-white px-3 py-1 text-sm hover:bg-black/80"
                onClick={() => setIsEditing((v) => !v)}
              >
                {isEditing ? "cancel edit" : "edit"}
              </button>
            )}
            <img
              src={p.fullUrl || p.url}
              alt={p.title || "photo"}
              className="w-full h-auto max-h-[80vh] object-contain rounded-md shadow-lg"
            />
            {(p.title || p.location || dateStr) && !isEditing && (
              <div className="mt-3 text-sm text-neutral-200 space-y-1">
                {p.title && (
                  <div className="font-medium text-base">{p.title}</div>
                )}
                {(p.location || dateStr) && (
                  <div className="text-xs text-neutral-300">
                    {[p.location, dateStr].filter(Boolean).join(" · ")}
                  </div>
                )}
                {(cameraStr ||
                  p.shutter_speed ||
                  p.iso ||
                  p.lens ||
                  p.aperture ||
                  p.focal_length) && (
                  <div className="text-[11px] text-neutral-300/90 space-y-0.5">
                    {(cameraStr || p.shutter_speed || p.iso) && (
                      <div>
                        {[
                          cameraStr,
                          p.shutter_speed
                            ? `${formatShutterSpeed(p.shutter_speed)}s`
                            : null,
                          p.iso ? `ISO ${p.iso}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                    {(p.lens || p.aperture || p.focal_length) && (
                      <div>
                        {[
                          p.lens ? `${p.lens}` : null,
                          p.focal_length ? `${p.focal_length}mm` : null,
                          p.aperture ? `f/${p.aperture}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {isEditing && (
              <div className="mt-4 text-sm text-neutral-200 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-neutral-300">Title</span>
                    <input
                      className="rounded border border-neutral-600 bg-black/40 px-2 py-1 text-sm text-neutral-50"
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-neutral-300">Location</span>
                    <input
                      className="rounded border border-neutral-600 bg-black/40 px-2 py-1 text-sm text-neutral-50"
                      value={form.location}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, location: e.target.value }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-neutral-300">Camera model</span>
                    <input
                      className="rounded border border-neutral-600 bg-black/40 px-2 py-1 text-sm text-neutral-50"
                      value={form.camera_model}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, camera_model: e.target.value }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-neutral-300">Lens</span>
                    <input
                      className="rounded border border-neutral-600 bg-black/40 px-2 py-1 text-sm text-neutral-50"
                      value={form.lens}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lens: e.target.value }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-neutral-300">Focal length</span>
                    <input
                      className="rounded border border-neutral-600 bg-black/40 px-2 py-1 text-sm text-neutral-50"
                      value={form.focal_length}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, focal_length: e.target.value }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-neutral-300">Aperture</span>
                    <input
                      className="rounded border border-neutral-600 bg-black/40 px-2 py-1 text-sm text-neutral-50"
                      value={form.aperture}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, aperture: e.target.value }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-neutral-300">Shutter speed</span>
                    <input
                      className="rounded border border-neutral-600 bg-black/40 px-2 py-1 text-sm text-neutral-50"
                      value={form.shutter_speed}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          shutter_speed: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-neutral-300">ISO</span>
                    <input
                      className="rounded border border-neutral-600 bg-black/40 px-2 py-1 text-sm text-neutral-50"
                      value={form.iso}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, iso: e.target.value }))
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs mt-1 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, featured: e.target.checked }))
                      }
                    />
                    <span className="text-neutral-300">Featured</span>
                  </label>
                </div>
                {error && <div className="text-xs text-red-400">{error}</div>}
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    className="rounded bg-neutral-700 px-3 py-1 text-neutral-50 hover:bg-neutral-600 disabled:opacity-60"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "saving..." : "save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function PhotosGrid({ photos }: { photos: Photo[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {photos.map((p) => (
        <PhotoCard key={p.id} photo={p} />
      ))}
    </div>
  );
}
