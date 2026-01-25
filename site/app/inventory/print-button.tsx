"use client";

import * as React from "react";
import { pdf } from "@react-pdf/renderer";

import type { Component } from "types/inventory";
import { Button } from "@/app/components/ui/button";
import { LabelDocument } from "./LabelDocument";

export function PrintButton({ item }: { item: Component }) {
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
