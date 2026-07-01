import Link from "next/link";

import { getInventory } from "./actions";
import type { Component } from "types/inventory";

import { Button } from "@/app/components/ui/button";
import { InventoryForm } from "./inventory-form";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  let items: Component[] = [];
  let errorMessage: string | null = null;

  try {
    items = (await getInventory()) as Component[];
  } catch (error) {
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = "Unable to load inventory.";
    }
  }

  const isAuthError = errorMessage?.toLowerCase().includes("logged in");
  const InventoryFormAny = InventoryForm as any;

  return (
    <main className="mx-auto flex w-full max-w-8xl flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Electronic Component Parts Inventory
          </p>
        </div>
      </header>

      {errorMessage ? (
        <section className="rounded-lg border bg-background p-6">
          <h2 className="text-base font-medium">Inventory unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAuthError
              ? "You must be signed in to view inventory."
              : errorMessage}
          </p>
          {isAuthError && (
            <div className="mt-4">
              <Button asChild>
                <Link href="/auth/signin">Go to sign-in</Link>
              </Button>
            </div>
          )}
        </section>
      ) : (
        <InventoryFormAny items={items} />
      )}
    </main>
  );
}
