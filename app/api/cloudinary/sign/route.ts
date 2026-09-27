import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v2 as cloudinary } from "cloudinary";
import { authOptions } from "app/api/auth/[...nextauth]/route";

// signed upload
export async function POST() {
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary is not configured" },
      { status: 500 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ timestamp }, apiSecret);

  return NextResponse.json({ signature, timestamp, cloudName, apiKey });
}
