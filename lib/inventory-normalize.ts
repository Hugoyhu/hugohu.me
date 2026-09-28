// Formatting rules for the invoice import. Everything here is
// deterministic: the model proposes values, these functions make their
// format consistent.

export const normalizeMpn = (mpn: string) => mpn.trim().toUpperCase();

export const normalizeManufacturer = (name: string) =>
  name.trim().toUpperCase();

// Package type first, pin count last:
//   "8SOIC", "8-SOIC (0.154\", 3.90mm Width)" -> "SOIC-8"
//   "24-VFQFN Exposed Pad"                    -> "VFQFN-24"
//   "TQFP32", "SOT23"                         -> "TQFP-32", "SOT-23"
// Anything else (0402, SOT-23-5, SOD323F) is returned as-is minus
// Digi-Key's parenthetical size notes.
export function normalizePackage(pkg: string | null) {
  if (!pkg) return "";
  const base = pkg.split("(")[0].trim();
  const pinsFirst = base.match(/^(\d+)[-\s]?([A-Za-z][A-Za-z0-9]*)\b/);
  if (pinsFirst) return `${pinsFirst[2].toUpperCase()}-${pinsFirst[1]}`;
  const noDash = base.match(/^([A-Za-z]+)(\d+)$/);
  if (noDash) return `${noDash[1].toUpperCase()}-${noDash[2]}`;
  return base;
}

// Accept a suffix-stripped MPN only if it was made by deleting a few
// characters from the printed one; otherwise keep what was printed.
export function stripPackagingSuffix(printed: string, stripped: string) {
  if (!printed) return stripped;
  if (!stripped || stripped.length > printed.length) return printed;
  if (printed.length - stripped.length > 4) return printed;

  const a = printed.toUpperCase();
  const b = stripped.toUpperCase();
  let i = 0;
  for (const ch of a) if (ch === b[i]) i++;
  return i === b.length ? stripped : printed;
}
