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
  // JSONB
  specs: Record<string, any>;
  rohs: boolean;
  msl: number;
  package: string;
}

export interface ResistorSpecs {
  resistance: string;
  tolerance: string;
  power: string;
}

export interface MicrocontrollerSpecs {
  core: string;
  flash: string;
  memory: string;
}

export type ComponentCategory = "Resistors" | "Microcontroller";

// Union type for components with category-specific specs
export type Component =
  | (InventoryItem & { category: "Resistors"; specs: ResistorSpecs })
  | (InventoryItem & {
      category: "Microcontroller";
      specs: MicrocontrollerSpecs;
    });

// Category options and spec field hints used by the inventory UI
export const CATEGORY_OPTIONS: Record<ComponentCategory, string[]> = {
  Resistors: ["Chip / SMD", "Through-hole", "Network / Array"],
  Microcontroller: ["General purpose", "Low-power", "High-performance"],
};

export const CATEGORY_KEYS: ComponentCategory[] = Object.keys(
  CATEGORY_OPTIONS,
).sort() as ComponentCategory[];

export const SPEC_FIELD_HINTS: Record<ComponentCategory, string[]> = {
  Resistors: ["resistance", "tolerance", "power"],
  Microcontroller: ["core", "flash", "memory"],
};
