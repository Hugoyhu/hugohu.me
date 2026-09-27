"use client";

import { useState } from "react";
import exifr from "exifr";

type UploadResult = {
  secure_url: string;
  public_id: string;
};

type UploadSignature = {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
};

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [trip, setTrip] = useState("");
  const [featured, setFeatured] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSavedMsg(null);

    if (!file) {
      setError("Please choose an image file");
      return;
    }

    setLoading(true);
    try {
      // signed upload
      const signRes = await fetch("/api/cloudinary/sign", { method: "POST" });
      if (!signRes.ok) {
        const text = await signRes.text();
        throw new Error(text || `Could not sign upload (${signRes.status})`);
      }
      const { signature, timestamp, cloudName, apiKey } =
        (await signRes.json()) as UploadSignature;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: "POST", body: formData },
      );

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error(text || `Upload failed (${uploadRes.status})`);
      }

      const data = await uploadRes.json();
      setResult({ secure_url: data.secure_url, public_id: data.public_id });

      // Extract EXIF and auto-save to Supabase
      let exifData: any = null;
      try {
        exifData = await exifr.parse(file);
      } catch (_) {}

      const camera_model = exifData?.Model;
      const time = exifData?.DateTimeOriginal
        ? new Date(exifData.DateTimeOriginal).toISOString()
        : exifData?.CreateDate
          ? new Date(exifData.CreateDate).toISOString()
          : null;
      const exposure = exifData?.ExposureTime
        ? `${exifData.ExposureTime}s`
        : exifData?.ShutterSpeedValue
          ? `${exifData.ShutterSpeedValue}`
          : null;
      const aperture = exifData?.FNumber ? `${exifData.FNumber}` : null;
      const focal_length = exifData?.FocalLength
        ? `${exifData.FocalLength}`
        : null;
      const iso = exifData?.ISO ? `${exifData.ISO}` : null;
      const lens =
        exifData?.LensModel ||
        exifData?.Lens ||
        (Array.isArray(exifData?.LensSpecification)
          ? exifData.LensSpecification.join(" ")
          : exifData?.LensSpecification
            ? String(exifData.LensSpecification)
            : null);

      const saveRes = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: data.secure_url,
          camera_model,
          lens,
          time,
          exposure,
          aperture,
          focal_length,
          iso,
          location,
          title,
          category,
          trip,
          featured,
        }),
      });

      if (!saveRes.ok) {
        const text = await saveRes.text();
        setSavedMsg(`Save failed: ${text}`);
      } else {
        setSavedMsg("Saved to Supabase");
      }
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-3">
      <div className="space-y-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Location
          </span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Category
          </span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Trip
          </span>
          <input
            value={trip}
            onChange={(e) => setTrip(e.target.value)}
            className="border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
          />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Featured
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Image file
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-500" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-2 space-y-2">
          <img
            src={result.secure_url}
            alt="Uploaded preview"
            className="w-full h-auto rounded-md border border-neutral-200 dark:border-neutral-800"
          />
          <div className="text-sm">
            <div className="break-all">
              Link:{" "}
              <a
                href={result.secure_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {result.secure_url}
              </a>
            </div>
            <div className="text-neutral-600 dark:text-neutral-400">
              Public ID: {result.public_id}
            </div>
          </div>
          {savedMsg && (
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {savedMsg}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
