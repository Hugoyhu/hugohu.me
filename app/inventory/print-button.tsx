"use client";

import * as React from "react";
import { pdf } from "@react-pdf/renderer";
import { Printer } from "lucide-react";

import type { Component } from "types/inventory";
import { Button } from "@/app/components/ui/button";
import { LabelDocument } from "./LabelDocument";

export function PrintButton({
  item,
  iconOnly = false,
}: {
  item: Component;
  iconOnly?: boolean;
}) {
  const [isPrinting, setIsPrinting] = React.useState(false);

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const blob = await pdf(<LabelDocument item={item} />).toBlob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.mpn || item.name || "label"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsPrinting(false);
    }
  };

  if (iconOnly) {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={handlePrint}
        disabled={isPrinting}
        title="Print label"
        aria-label={`Print label for ${item.mpn || item.name}`}
      >
        <Printer />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handlePrint}
      disabled={isPrinting}
    >
      {isPrinting ? "Printing…" : "Print"}
    </Button>
  );
}
