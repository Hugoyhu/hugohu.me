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

export {
  CATEGORY_OPTIONS,
  CATEGORY_KEYS,
  type ComponentCategory,
} from "./categories";

// Single type for components
export type Component = InventoryItem;
