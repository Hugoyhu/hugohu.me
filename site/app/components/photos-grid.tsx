"use client";

import { useEffect, useState } from "react";

export type Photo = {
  id: string;
  // preview-sized URL used in grids/strips
  url: string;
  // optional full-size URL (original asset); modal falls back to `url` if missing
  fullUrl?: string | null;
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
  const p = photo;
  const dateStr = p.date_taken
    ? new Date(p.date_taken).toLocaleDateString()
    : null;
  const cameraStr = formatCamera(p.camera_make, p.camera_model);

  const [isOpen, setIsOpen] = useState(false);

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
            <img
              src={p.fullUrl || p.url}
              alt={p.title || "photo"}
              className="w-full h-auto max-h-[80vh] object-contain rounded-md shadow-lg"
            />
            {(p.title || p.location) && (
              <div className="mt-3 text-sm text-neutral-200">
                {p.title && (
                  <div className="font-medium text-base">{p.title}</div>
                )}
                {p.location && (
                  <div className="text-xs text-neutral-300">{p.location}</div>
                )}
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
