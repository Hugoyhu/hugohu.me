"use server";

import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "app/api/auth/[...nextauth]/route";
import { runInventoryChat, type ChatReply } from "lib/inventory-chat";

const InputSchema = z.object({
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(4000),
        partMpns: z.array(z.string()).max(200).optional(),
      }),
    )
    .max(50),
  message: z.string().trim().min(1).max(2000),
});

export async function askInventory(input: unknown): Promise<ChatReply> {
  const session = await getServerSession(authOptions as any);
  if (!session) return { ok: false, error: "Sign in to use the assistant." };

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Message is empty or too long." };

  return runInventoryChat(parsed.data.history, parsed.data.message);
}
