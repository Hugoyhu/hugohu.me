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

// Category options and spec field hints used by the inventory UI
export const CATEGORY_OPTIONS = {
  Resistors: ["Chip / SMD", "Through-hole", "Network / Array"],
  Ferrites: ["Chip / SMD"],
  Microcontroller: [
    "AVR-8",
    "ARM-M0",
    "ARM-M0+",
    "ARM-M33",
    "ARM-M4",
    "ARM-M7",
    "PIC-32",
    "RF / Wireless",
  ],
  Capacitors: [
    "Ceramic / MLCC",
    "Film",
    "Tantalum",
    "Aluminum-Polymer",
    "Aluminum-Electrolytic",
  ],
  Connectors: [
    "USB",
    "2.54mm",
    "1.27mm",
    "IC Socket",
    "FPC",
    "Audio",
    "Storage",
  ],
  "Integrated Circuit": ["PMIC", "Boost Converter", "Sensor", "DAC/ADC"],
  Breakouts: [
    "Microcontroller",
    "SBC",
    "Power",
    "Sensor",
    "Audio",
    "Input",
    "Wireless",
    "Storage",
  ],
  Switches: ["Navigation / Joystick", "Push Button", "Slide Switch"],
} as const;

export type ComponentCategory = keyof typeof CATEGORY_OPTIONS;

// Single type for components
export type Component = InventoryItem;

export const CATEGORY_KEYS: ComponentCategory[] = Object.keys(
  CATEGORY_OPTIONS,
).sort() as ComponentCategory[];
