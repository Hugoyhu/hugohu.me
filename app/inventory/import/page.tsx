import Link from "next/link";

import { ImportForm } from "./import-form";

export default function ImportInvoicePage() {
  return (
    <main className="mx-auto flex w-full max-w-8xl flex-col gap-8 p-4 sm:p-8">
      <header>
        <Link
          href="/inventory"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Inventory
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Import invoice
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a distributor invoice PDF. Claude extracts the line items,
          parts added to inventory upon approval.
        </p>
      </header>

      <ImportForm />
    </main>
  );
}
