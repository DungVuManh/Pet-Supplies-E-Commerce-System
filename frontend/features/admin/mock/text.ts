/** Accent- and case-insensitive text key; "Đỗ Khánh" → "do khanh". */
export function searchKey(value: string) {
  return value.toLocaleLowerCase("vi").normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/[^a-z0-9@.]+/g, " ").trim();
}

/** URL slug from a Vietnamese name; "Vệ sinh & cát mèo" → "ve-sinh-cat-meo". */
export function slugify(value: string) {
  return searchKey(value).replace(/[@.]/g, " ").trim().split(/\s+/).filter(Boolean).join("-");
}

/** Every word of the query must appear somewhere in the given fields. */
export function matchesQuery(query: string, ...fields: string[]) {
  const haystack = searchKey(fields.join(" "));
  // Digits also match across spaces so "0934567890" finds "0934 567 890"; words must match as written.
  const digits = haystack.replace(/\s+/g, "");
  return searchKey(query).split(" ").filter(Boolean).every((token) => haystack.includes(token) || (/^\d+$/.test(token) && digits.includes(token)));
}
