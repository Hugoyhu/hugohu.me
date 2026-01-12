import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure via CLOUDINARY_URL or explicit keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(_req: Request) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      return NextResponse.json(
        { error: "Missing CLOUDINARY_API_SECRET" },
        { status: 500 }
      );
    }

    const signature = cloudinary.utils.api_sign_request(
      { timestamp },
      apiSecret
    );
    return NextResponse.json({
      signature,
      timestamp,
      stringToSign: `timestamp=${timestamp}`,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Signature error" },
      { status: 500 }
    );
  }
}
