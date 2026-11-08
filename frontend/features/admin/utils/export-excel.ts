/**
 * Tiện ích xuất file báo cáo Excel (CSV UTF-8 BOM chuẩn cho Microsoft Excel và Google Sheets)
 * Chèn Byte Order Mark (BOM) [0xEF, 0xBB, 0xBF] vào đầu file để Excel luôn nhận diện
 * bảng mã UTF-8 tiếng Việt có dấu, triệt tiêu hoàn toàn lỗi vỡ font / Mojibake.
 */

export type CsvCell = string | number | undefined | null;

export interface ExportSection {
  title?: string;
  headers?: string[];
  rows: CsvCell[][];
}

/** Text that a spreadsheet would run as a formula: it starts with =, +, -, @, a tab, or a carriage return. */
const FORMULA_START = /^[=+\-@\t\r]/;
/** A plain amount such as "-5", "+84", or "-1.000 ₫" is safe to leave as it is. */
const PLAIN_NUMBER = /^[+-]?[\d.,\s]+(?:\s?[₫%])?$/;

/**
 * One quoted CSV cell. Customer-entered text such as a name could otherwise run
 * as a formula when the file is opened, so such text gets a leading apostrophe.
 */
export function escapeCsvCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return '""';
  let text = String(cell);
  if (typeof cell === "string" && FORMULA_START.test(text) && !PLAIN_NUMBER.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** The file's text, without the BOM. `period` is left out when there is none, as in a list export. */
export function buildCsv({ title, period, sections }: { title: string; period?: string; sections: ExportSection[] }) {
  const lines: string[] = [];

  // Tiêu đề báo cáo và khoảng thời gian
  lines.push(escapeCsvCell(title));
  if (period) lines.push(`${escapeCsvCell("Kỳ báo cáo:")},${escapeCsvCell(period)}`);
  lines.push("");

  for (const section of sections) {
    if (section.title) lines.push(escapeCsvCell(section.title));
    if (section.headers && section.headers.length > 0) lines.push(section.headers.map(escapeCsvCell).join(","));
    for (const row of section.rows) lines.push(row.map(escapeCsvCell).join(","));
    lines.push(""); // Dòng trống ngăn cách các bảng
  }

  return lines.join("\r\n");
}

export function downloadExcelCsv({
  filename,
  title,
  period,
  sections,
}: {
  filename: string;
  title: string;
  period?: string;
  sections: ExportSection[];
}) {
  const csvContent = buildCsv({ title, period, sections });

  // Chèn mã BOM UTF-8 (\xEF\xBB\xBF) trực tiếp ở đầu binary stream
  // Giúp Microsoft Excel tự động mở bằng bảng mã Unicode UTF-8 thay vì ANSI/Windows-1252
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
