"use client";

import { useId, useState, type FormEvent } from "react";
import { control, secondaryButton } from "./staff-ui";
import type { Period, GroupBy } from "../analytics/types";
import { periodError, reportQuery } from "../analytics/query";

// Optional props keep existing pages buildable until their integration commits.
export function ReportControls({ performance = false, period, query = "", onChange }: {
  performance?: boolean; period?: Period; query?: string; onChange?: (query: string) => void;
}) {
  const errorId = useId();
  const params = new URLSearchParams(query);
  const initial = { dateFrom: params.get("dateFrom") ?? period?.dateFrom ?? "", dateTo: params.get("dateTo") ?? period?.dateTo ?? "",
    groupBy: (params.get("groupBy") ?? period?.groupBy ?? "day") as GroupBy };
  const source = JSON.stringify(initial);
  const [previous, setPrevious] = useState(source);
  const [draft, setDraft] = useState<Period>(initial);
  const [error, setError] = useState<string | null>(null);
  if (previous !== source && (period || params.has("dateFrom") || params.has("dateTo"))) {
    setPrevious(source); setDraft(initial); setError(null);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const issue = periodError(draft); setError(issue);
    if (!issue) onChange?.(reportQuery(draft, performance));
  }
  return <form onSubmit={submit} className="space-y-3" aria-label="Bộ lọc báo cáo">
    <div className="flex flex-wrap items-end gap-4">
      <label className="grid w-full min-w-0 gap-2 font-medium sm:w-auto">Từ ngày
        <input type="date" required min="2000-01-01" max="2099-12-31" className={`${control} w-full`} value={draft.dateFrom}
          aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}
          onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })} /></label>
      <label className="grid w-full min-w-0 gap-2 font-medium sm:w-auto">Đến ngày
        <input type="date" required min="2000-01-01" max="2099-12-31" className={`${control} w-full`} value={draft.dateTo}
          onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })} /></label>
      {!performance && <label className="grid gap-2 font-medium">Nhóm theo
        <select className={control} value={draft.groupBy} onChange={(e) => setDraft({ ...draft, groupBy: e.target.value as GroupBy })}>
          <option value="day">Ngày</option><option value="week">Tuần</option><option value="month">Tháng</option>
        </select></label>}
      <button type="submit" disabled={!onChange} className={secondaryButton}>Áp dụng</button>
      <button type="button" disabled={!onChange} className={secondaryButton} onClick={() => onChange?.("")}>7 ngày gần nhất</button>
      <span className="text-xs text-muted">{performance ? "Chỉ dữ liệu của bạn" : "Toàn cửa hàng"} · UTC+07</span>
    </div>
    {error && <p id={errorId} role="alert" className="text-danger">{error}</p>}
  </form>;
}
