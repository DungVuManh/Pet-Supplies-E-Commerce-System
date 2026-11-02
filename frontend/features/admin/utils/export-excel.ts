/**
 * Tiện ích xuất file báo cáo Excel (CSV UTF-8 BOM chuẩn cho Microsoft Excel và Google Sheets)
 * Chèn Byte Order Mark (BOM) [0xEF, 0xBB, 0xBF] vào đầu file để Excel luôn nhận diện
 * bảng mã UTF-8 tiếng Việt có dấu, triệt tiêu hoàn toàn lỗi vỡ font / Mojibake.
 */

export interface ExportSection {
  title?: string;
  headers?: string[];
  rows: (string | number | undefined | null)[][];
}

function escapeCsvCell(cell: string | number | undefined | null): string {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell);
  // Nếu có dấu phẩy, dấu ngoặc kép hoặc xuống dòng -> bọc trong ngoặc kép và escape dấu ngoặc kép đôi
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function downloadExcelCsv({
  filename,
  title,
  period,
  sections,
}: {
  filename: string;
  title: string;
  period: string;
  sections: ExportSection[];
}) {
  const lines: string[] = [];

  // Tiêu đề báo cáo và khoảng thời gian
  lines.push(escapeCsvCell(title));
  lines.push(`${escapeCsvCell("Kỳ báo cáo:")},${escapeCsvCell(period)}`);
  lines.push("");

  for (const section of sections) {
    if (section.title) {
      lines.push(escapeCsvCell(section.title));
    }
    if (section.headers && section.headers.length > 0) {
      lines.push(section.headers.map(escapeCsvCell).join(","));
    }
    for (const row of section.rows) {
      lines.push(row.map(escapeCsvCell).join(","));
    }
    lines.push(""); // Dòng trống ngăn cách các bảng
  }

  const csvContent = lines.join("\r\n");

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
