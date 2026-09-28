"use client";

import * as Dialog from "@radix-ui/react-dialog";

import { Button } from "@/app/components/ui/button";
import type { Component } from "types/inventory";

export type ExistingChoice = "increment" | "overwrite";

// Asked when the add form is saved with an MPN that's already in stock.
export function ExistingPartDialog({
  part,
  quantity,
  onChoose,
  onCancel,
}: {
  part: Component | null;
  quantity: number;
  onChoose: (choice: ExistingChoice) => void;
  onCancel: () => void;
}) {
  const current = part?.quantity ?? 0;

  return (
    <Dialog.Root
      open={part !== null}
      onOpenChange={(open) => !open && onCancel()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-neutral-300 bg-[#efede5] p-5 shadow-lg dark:border-neutral-600 dark:bg-[#4b4842]">
          <Dialog.Title className="text-base font-semibold">
            Already in inventory
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            <span className="font-mono">{part?.mpn}</span> ({part?.name}) is
            already stocked, with {current} on hand.
          </Dialog.Description>

          <div className="mt-5 flex flex-col gap-2">
            <Button type="button" onClick={() => onChoose("increment")}>
              Add {quantity} to stock ({current} → {current + quantity})
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onChoose("overwrite")}
            >
              Overwrite: replace its details, set quantity to {quantity}
            </Button>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
