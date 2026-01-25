"use client";

import dynamic from "next/dynamic";
import { LabelDocument } from "../LabelDocument";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false },
);

const mockItem: any = {
  id: "1",
  created_at: "2026-01-01",
  name: "ATMEGA328P-PU",
  manufacturer: "Microchip",
  mpn: "ATMEGA328P-PU",
  distributor: "Digi-Key",
  category: "Microcontroller",
  subcategory: "8-bit AVR",
  quantity: 50,
  package: "DIP-28",
  rohs: true,
  msl: 3,
  specs: {
    clock: "20MHz",
    flash: "32KB",
    ram: "2KB",
    voltage: "1.8-5.5V",
  },
};

export default function DesignPage() {
  return (
    <div className="flex h-screen w-screen items-left justify-left bg-background">
      <PDFViewer style={{ width: 960, height: 640 }}>
        <LabelDocument item={mockItem} />
      </PDFViewer>
    </div>
  );
}
