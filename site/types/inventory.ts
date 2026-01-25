export interface InventoryItem {
  id: string;
  name: string;
  manufacturer: string;
  mpn: string;
  distributor: string;
  dpn: string;
  category: string;
  subcategory: string;
  quantity: number;
  // optional spec field
  spec?: string;
  rohs: boolean;
  msl: number;
  package: string;
}

export type ComponentCategory =
  | "Resistors"
  | "Microcontroller"
  | "Capacitors"
  | "Connectors";

// Single type for components
export type Component = InventoryItem;

// Category options and spec field hints used by the inventory UI
export const CATEGORY_OPTIONS: Record<ComponentCategory, string[]> = {
  Resistors: ["Chip / SMD", "Through-hole", "Network / Array"],
  Microcontroller: ["AVR-8", "ARM-M0", "ARM-M33", "ARM-M4", "ARM-M7"],
  Capacitors: ["Ceramic / MLCC", "Film", "Tantalum", "Aluminum-Polymer"],
  Connectors: ["USB", "2.54mm", "1.27mm", "IC Socket"],
};

export const CATEGORY_KEYS: ComponentCategory[] = Object.keys(
  CATEGORY_OPTIONS,
).sort() as ComponentCategory[];
