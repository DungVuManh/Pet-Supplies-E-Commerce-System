/** "Thương hiệu Mới" → "THUONG-HIEU-MOI". Shared by the seed and the Admin API, so their codes match. */
export function codeFrom(name) {
 return name.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "D").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** The code prefix of each kind. Breeds are numbered (`BR-001`); the others come from the name. */
export const MASTER_DATA_PREFIXES = { petType: "PET", breed: "BR", brand: "BRD", unit: "UNIT", shippingMethod: "SHIP" };

const NAME_PART_LENGTH = 40;

/**
 * The first free code for a new row. `taken` holds the codes of that kind already
 * in use. A name-based code that is taken gets `-2`, `-3`, and so on.
 */
export function nextMasterDataCode(kind, name, taken) {
 const prefix = MASTER_DATA_PREFIXES[kind];
 const used = new Set(taken);
 if (kind === "breed") {
  const highest = Math.max(0, ...[...used].map((code) => Number(/^BR-(\d+)$/.exec(code)?.[1]) || 0));
  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
 }
 const base = `${prefix}-${codeFrom(name).slice(0, NAME_PART_LENGTH).replace(/-$/, "") || "X"}`;
 if (!used.has(base)) return base;
 for (let suffix = 2; ; suffix += 1) {
  if (!used.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
 }
}
