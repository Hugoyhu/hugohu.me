// Inventory chat assistant. Claude sees the whole inventory (it's small) and
// answers with text plus tool calls: show_parts renders part cards and
// make_labels prepares a label PDF. Both are read-only. Server-only; the
// server action in app/inventory/chat-actions.ts wraps this with a sign-in
// check.
//
// Routing: each message goes to Haiku first. Questions answerable from the
// inventory data stay there; if the answer needs knowledge of what parts do
// (capabilities, specs), Haiku calls `escalate` and the message is re-run on
// Sonnet, which knows parts far better.

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

import type { InventoryItem } from "types/inventory";
import { normalizeMpn } from "lib/inventory-normalize";

const MAX_HISTORY = 10; // previous messages sent with each request
const MAX_TURNS = 4; // model round trips per message

// List prices per token, for the per-message cost shown in the chat.
const MODELS = {
  fast: {
    id: "claude-haiku-4-5",
    input: 1 / 1_000_000,
    cacheWrite: 1.25 / 1_000_000,
    cacheRead: 0.1 / 1_000_000,
    output: 5 / 1_000_000,
  },
  smart: {
    id: "claude-sonnet-5",
    input: 2 / 1_000_000,
    cacheWrite: 2.5 / 1_000_000,
    cacheRead: 0.2 / 1_000_000,
    output: 10 / 1_000_000,
  },
} as const;
type Tier = keyof typeof MODELS;

const anthropic = new Anthropic();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  // MPNs of the parts shown with an assistant reply, so "those" works
  partMpns?: string[];
};

export type ChatReply =
  | {
      ok: true;
      text: string;
      parts: InventoryItem[];
      labelParts: InventoryItem[];
      costUsd: number;
      model: "haiku" | "sonnet";
    }
  | { ok: false; error: string };

// "routed" is the default; the others force one model (used for testing).
export type ChatMode = "routed" | "fast" | "smart";

const SHARED_RULES = `You are the assistant for a personal electronic-components inventory. The full inventory is listed below. You help find parts, answer questions about what's in stock, and prepare labels.

- Only refer to parts that are in the inventory, using their exact MPN. Whenever your answer involves specific parts, call show_parts with them so they appear as cards; don't list many MPNs in your text.
- To print labels, call make_labels with the parts. If a request is ambiguous (e.g. "10k resistors" matches several packages), ask which ones first. "Those" or "them" means the parts shown most recently.
- If nothing in stock fits, say so plainly.
- Keep replies short: one to three sentences of plain text, no markdown.`;

const KNOWLEDGE_RULE = `
- For facts not in the inventory data (what a part does, electrical specs), you may use general knowledge of well-known parts, but say so, e.g. "from general knowledge, check the datasheet for exact figures". If you don't know, say so. Never invent specs.`;

const ESCALATE_RULE = `
- Answer only from the inventory data listed below (MPN, name, manufacturer, category, package, quantity, notes). If answering needs knowledge about what parts do or their capabilities or specs beyond that data (e.g. which chips have USB, what can level-shift, flash size, supply voltage, which part suits a project), call escalate immediately instead of answering or calling other tools.`;

const PART_LIST_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    mpns: {
      type: "array",
      items: { type: "string" },
      description: "Exact MPNs from the inventory",
    },
  },
  required: ["mpns"],
  additionalProperties: false,
};

const PART_TOOLS: Anthropic.Tool[] = [
  {
    name: "show_parts",
    description:
      "Show inventory parts to the user as cards. Use whenever your reply involves specific parts.",
    strict: true,
    input_schema: PART_LIST_SCHEMA,
  },
  {
    name: "make_labels",
    description:
      "Prepare a PDF with one label per part for the user to download.",
    strict: true,
    input_schema: PART_LIST_SCHEMA,
  },
];

const ESCALATE_TOOL: Anthropic.Tool = {
  name: "escalate",
  description:
    "Hand this message to a model with deeper knowledge of electronic parts. Use when the answer depends on what parts do or their specs, not just the inventory data.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      reason: { type: "string", description: "What knowledge is needed" },
    },
    required: ["reason"],
    additionalProperties: false,
  },
};

async function loadInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabaseAdmin
    .from(process.env.SUPABASE_INV_TABLE_NAME!)
    .select("*")
    .order("category");
  if (error) throw new Error(error.message);
  return (data ?? []) as InventoryItem[];
}

// One compact line per part keeps the whole inventory around 4-5k tokens.
function inventorySnapshot(items: InventoryItem[]) {
  const lines = items.map((it) =>
    [
      it.mpn,
      it.name,
      it.manufacturer,
      [it.category, it.subcategory].filter(Boolean).join(" / "),
      it.package || "-",
      `qty ${it.quantity}`,
      it.spec?.trim() || "",
    ]
      .join(" | ")
      .replace(/ \| $/, ""),
  );
  return `Inventory (${items.length} parts; MPN | name | manufacturer | category | package | quantity | notes):\n${lines.join("\n")}`;
}

// Recent history as model messages. Assistant turns carry a note of the
// parts they showed, so follow-ups like "print labels for those" resolve.
function historyMessages(history: ChatTurn[]): Anthropic.MessageParam[] {
  const recent = history.slice(-MAX_HISTORY);
  while (recent.length && recent[0].role !== "user") recent.shift();
  return recent.map((turn) => ({
    role: turn.role,
    content:
      turn.role === "assistant" && turn.partMpns?.length
        ? `${turn.text}\n[Parts shown: ${turn.partMpns.join(", ")}]`
        : turn.text,
  }));
}

type LoopResult =
  | {
      kind: "answer";
      text: string;
      parts: InventoryItem[];
      labelParts: InventoryItem[];
      costUsd: number;
    }
  | { kind: "escalate"; costUsd: number };

// One model's tool loop for a single user message.
async function runLoop(
  tier: Tier,
  canEscalate: boolean,
  items: InventoryItem[],
  history: ChatTurn[],
  message: string,
): Promise<LoopResult> {
  const model = MODELS[tier];
  const byMpn = new Map(items.map((it) => [normalizeMpn(it.mpn ?? ""), it]));
  const rules = SHARED_RULES + (canEscalate ? ESCALATE_RULE : KNOWLEDGE_RULE);
  const tools = canEscalate ? [...PART_TOOLS, ESCALATE_TOOL] : PART_TOOLS;

  const messages: Anthropic.MessageParam[] = [
    ...historyMessages(history),
    { role: "user", content: message },
  ];
  const shown = new Map<string, InventoryItem>();
  const labels = new Map<string, InventoryItem>();
  const textParts: string[] = [];
  let costUsd = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: model.id,
      max_tokens: 1024,
      system: [
        { type: "text", text: rules },
        {
          type: "text",
          text: inventorySnapshot(items),
          cache_control: { type: "ephemeral" },
        },
      ],
      tools,
      messages,
    });
    messages.push({ role: "assistant", content: response.content });

    const u = response.usage;
    costUsd +=
      u.input_tokens * model.input +
      (u.cache_creation_input_tokens ?? 0) * model.cacheWrite +
      (u.cache_read_input_tokens ?? 0) * model.cacheRead +
      u.output_tokens * model.output;

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.some((b) => b.name === "escalate")) {
      return { kind: "escalate", costUsd };
    }

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        textParts.push(block.text.trim());
      }
    }
    if (response.stop_reason !== "tool_use") break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUses) {
      const mpns = (block.input as { mpns?: unknown }).mpns;
      const list = Array.isArray(mpns) ? mpns.map(String) : [];

      // Every part must exist; unknown MPNs go back to the model.
      const found = list.map((m) => byMpn.get(normalizeMpn(m)));
      const missing = list.filter((_, i) => !found[i]);
      if (list.length === 0 || missing.length) {
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          is_error: true,
          content: list.length
            ? `Not in the inventory: ${missing.join(", ")}. Use MPNs exactly as listed.`
            : "No MPNs given.",
        });
        continue;
      }

      const target = block.name === "make_labels" ? labels : shown;
      for (const item of found as InventoryItem[]) target.set(item.id, item);
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content:
          block.name === "make_labels"
            ? `A PDF with ${list.length} label(s) is ready for the user to download.`
            : `Showing ${list.length} part(s) to the user.`,
      });
    }
    messages.push({ role: "user", content: results });
  }

  return {
    kind: "answer",
    text: textParts.join("\n\n") || "Done.",
    parts: Array.from(shown.values()),
    labelParts: Array.from(labels.values()),
    costUsd,
  };
}

export async function runInventoryChat(
  history: ChatTurn[],
  message: string,
  mode: ChatMode = "routed",
): Promise<ChatReply> {
  try {
    const items = await loadInventory();
    let costUsd = 0;

    if (mode !== "smart") {
      const fast = await runLoop("fast", mode === "routed", items, history, message);
      costUsd += fast.costUsd;
      if (fast.kind === "answer") {
        return { ok: true, ...fast, costUsd, model: "haiku" };
      }
    }

    const smart = await runLoop("smart", false, items, history, message);
    costUsd += smart.costUsd;
    if (smart.kind !== "answer") throw new Error("Unexpected escalation");
    return { ok: true, ...smart, costUsd, model: "sonnet" };
  } catch (error) {
    console.error("Inventory chat failed", error);
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `Claude API error (${error.status}).` };
    }
    return { ok: false, error: "Could not reach Claude." };
  }
}
