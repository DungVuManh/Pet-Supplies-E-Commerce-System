// Accent-insensitive search, mirroring the frontend `matchesQuery`: the query is
// split into words, and every word must appear in at least one of the fields.

const accentClasses = {
 a: "aàáảãạăằắẳẵặâầấẩẫậ",
 d: "dđ",
 e: "eèéẻẽẹêềếểễệ",
 i: "iìíỉĩị",
 o: "oòóỏõọôồốổỗộơờớởỡợ",
 u: "uùúủũụưừứửữự",
 y: "yỳýỷỹỵ",
};

/** Lowercase, accent-free words of a query; "Đỗ Khánh" → ["do", "khanh"]. */
export function searchTokens(query) {
 if (typeof query !== "string") return [];
 return query.toLocaleLowerCase("vi").normalize("NFD").replace(/\p{M}/gu, "")
  .replace(/đ/g, "d").replace(/[^a-z0-9@.]+/g, " ").trim().split(" ").filter(Boolean);
}

function characterPattern(character) {
 const letters = accentClasses[character];
 if (letters) return `[${letters}${letters.toLocaleUpperCase("vi")}]`;
 return character === "." ? "\\." : character;
}

/**
 * Regex for one query word that matches its accented and unaccented spellings in
 * any case, so "duc" matches "Đức". Digits may be separated by whitespace in the
 * stored value, so "0934567890" matches "0934 567 890".
 */
export function accentInsensitiveRegex(token) {
 const separator = /^\d+$/.test(token) ? "\\s*" : "";
 return new RegExp([...token].map(characterPattern).join(separator), "i");
}

/** MongoDB filter requiring every query word in one of `fields`; `{}` for an empty query. */
export function searchFilter(query, fields) {
 const tokens = searchTokens(query);
 if (tokens.length === 0) return {};
 return {
  $and: tokens.map((token) => {
   const regex = accentInsensitiveRegex(token);
   return { $or: fields.map((field) => ({ [field]: regex })) };
  }),
 };
}
