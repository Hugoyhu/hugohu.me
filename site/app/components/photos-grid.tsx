"use client";

export type Photo = {
  id: string;
  url: string; // direct CDN link
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
};

export default function PhotosGrid({ photos }: { photos: Photo[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {photos.map((p) => {
        const dateStr = p.date_taken
          ? new Date(p.date_taken).toLocaleDateString()
          : null;
        const formatShutterSpeed = (val?: string | null): string | null => {
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
              1, 2, 3, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30, 40, 50, 60, 80, 100,
              125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600,
              2000, 2500, 3200, 4000, 8000,
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
        };
        const formatCamera = (
          make?: string | null,
          model?: string | null
        ): string | null => {
          const m = (make || "").trim();
          const mdl = (model || "").trim();
          if (!m && !mdl) return null;
          if (!m) return mdl || null;
          if (!mdl) return m || null;
          if (mdl.toLowerCase().startsWith(m.toLowerCase())) return mdl;
          return `${m} ${mdl}`;
        };
        const cameraStr = formatCamera(p.camera_make, p.camera_model);
        return (
          <figure
            key={p.id}
            className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800"
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
                {/* Line 1: title */}
                {p.title && (
                  <div className="font-medium text-lg">{p.title}</div>
                )}

                {/* Line 2: location, date */}
                {(p.location || dateStr) && (
                  <div>{[p.location, dateStr].filter(Boolean).join(" · ")}</div>
                )}

                {/* Line 3: camera model, exposure, iso */}
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

                {/* Line 4: lens, aperture, focal */}
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
        );
      })}
    </div>
  );
}
