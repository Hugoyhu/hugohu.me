import { NextResponse } from "next/server";

import { deleteComponent } from "@/app/inventory/actions";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await deleteComponent(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting component", error);
    return NextResponse.json(
      { error: "Failed to delete component" },
      { status: 500 },
    );
  }
}
