"use client";

import * as React from "react";
import { pdf } from "@react-pdf/renderer";

import { askInventory } from "./chat-actions";
import { LabelsDocument } from "./LabelDocument";
import { PartDialog } from "./part-dialog";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import type { Component } from "types/inventory";

type Message = {
  role: "user" | "assistant";
  text: string;
  parts?: Component[];
  labelParts?: Component[];
  costUsd?: number;
  model?: "haiku" | "sonnet";
};

async function downloadLabels(items: Component[]) {
  const blob = await pdf(<LabelsDocument items={items} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `labels-${items.length}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Safari can drop the download if the URL is freed right away
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function InventoryChat() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [draft, setDraft] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setDraft("");

    // The server only needs text plus which parts each reply showed.
    const history = messages.map((m) => ({
      role: m.role,
      text: m.text,
      partMpns: [...(m.parts ?? []), ...(m.labelParts ?? [])].map((p) => p.mpn),
    }));
    setMessages((prev) => [...prev, { role: "user", text: message }]);

    startTransition(async () => {
      const reply = await askInventory({ history, message });
      if (!reply.ok) {
        setError(reply.error);
        return;
      }
      // Labels download straight away, like the Print button
      if (reply.labelParts.length > 0) {
        void downloadLabels(reply.labelParts);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: reply.text,
          parts: reply.parts,
          labelParts: reply.labelParts,
          costUsd: reply.costUsd,
          model: reply.model,
        },
      ]);
    });
  };

  return (
    <section className="rounded-lg border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium">Ask your inventory</span>
        <span className="text-xs text-muted-foreground">
          {open ? "Hide" : "natural language search and ask"}
        </span>
      </button>

      {open && (
        <div className="border-t px-4 pb-4">
          <div
            ref={listRef}
            className="max-h-[420px] space-y-3 overflow-y-auto py-3 text-sm"
          >
            {messages.map((m, i) =>
              m.role === "user" ? (
                <p
                  key={i}
                  className="ml-auto w-fit max-w-[80%] rounded-lg bg-muted px-3 py-2"
                >
                  {m.text}
                </p>
              ) : (
                <div key={i} className="max-w-[90%] space-y-2">
                  <p className="whitespace-pre-line">{m.text}</p>

                  {m.parts && m.parts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {m.parts.map((p) => (
                        <PartDialog key={p.id} part={p} />
                      ))}
                    </div>
                  )}

                  {m.labelParts && m.labelParts.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => downloadLabels(m.labelParts!)}
                    >
                      Download {m.labelParts.length} label
                      {m.labelParts.length === 1 ? "" : "s"} again
                    </Button>
                  )}

                  {m.costUsd !== undefined && (
                    <p className="text-[10px] text-muted-foreground">
                      ~{(m.costUsd * 100).toFixed(2)}¢
                      {m.model
                        ? ` · via ${m.model === "haiku" ? "Haiku" : "Sonnet"}`
                        : ""}
                    </p>
                  )}
                </div>
              ),
            )}

            {pending && (
              <p className="text-xs text-muted-foreground">Thinking…</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex gap-2"
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={pending}
            />
            <Button type="submit" disabled={pending || !draft.trim()}>
              Send
            </Button>
          </form>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Defaults to Haiku 4.5, escalates to Sonnet 5 as needed.
          </p>
        </div>
      )}
    </section>
  );
}
