"use client";

import * as React from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { pdf } from "@react-pdf/renderer";

import { LabelDocument } from "./LabelDocument";

import { Button } from "@/app/components/ui/button";
import type { Component } from "types/inventory";

async function downloadLabel(part: Component) {
  const blob = await pdf(<LabelDocument item={part} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${part.mpn || part.name || "label"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 border-b border-neutral-300 py-1.5 last:border-b-0 dark:border-neutral-600">
      <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="break-words">{children || "—"}</dd>
    </div>
  );
}

export function PartDialog({
  part,
  children,
}: {
  part: Component;
  children?: React.ReactElement;
}) {
  const [downloading, setDownloading] = React.useState(false);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        {children ?? (
          <button
            type="button"
            className="rounded-md border px-2.5 py-1.5 text-left text-xs hover:bg-muted"
          >
            <span className="font-mono font-medium">{part.mpn}</span>
            <span className="text-muted-foreground">
              {" "}
              · {part.package || "—"} · qty {part.quantity}
            </span>
          </button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-neutral-300 bg-[#efede5] p-5 shadow-lg dark:border-neutral-600 dark:bg-[#4b4842]">
          <Dialog.Title className="font-mono text-base font-semibold">
            {part.mpn}
          </Dialog.Title>
          <Dialog.Description className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">
            {part.name}
          </Dialog.Description>

          <dl className="mt-4 text-sm">
            <Row label="Manufacturer">{part.manufacturer}</Row>
            <Row label="Category">
              {[part.category, part.subcategory].filter(Boolean).join(" / ")}
            </Row>
            <Row label="Package">{part.package}</Row>
            <Row label="Quantity">{part.quantity}</Row>
            <Row label="RoHS / MSL">
              {part.rohs ? "RoHS" : "Non-RoHS"} / MSL {part.msl}
            </Row>
            <Row label="Distributor">
              {[part.distributor, part.dpn].filter(Boolean).join(" · ")}
            </Row>
            <Row label="Datasheet">
              {part.datasheet && (
                <a
                  href={part.datasheet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Open datasheet
                </a>
              )}
            </Row>
            {part.spec?.trim() && <Row label="Notes">{part.spec}</Row>}
          </dl>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/inventory/${part.id}`}
              className="text-xs text-neutral-600 underline underline-offset-2 dark:text-neutral-300"
            >
              Full part page
            </Link>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true);
                  try {
                    await downloadLabel(part);
                  } finally {
                    setDownloading(false);
                  }
                }}
              >
                {downloading ? "Preparing…" : "Download label"}
              </Button>
              <Dialog.Close asChild>
                <Button type="button" size="sm">
                  Close
                </Button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
