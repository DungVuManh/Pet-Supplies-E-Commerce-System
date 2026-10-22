"use client";

import { useState } from "react";
import { control, secondaryButton } from "./staff-ui";

const periods = ["06/10 – 12/10/2026", "Tháng 10/2026"];
const groupings = ["Theo ngày", "Theo tuần", "Theo tháng"];

export function ReportControls({ performance = false }: { performance?: boolean }) {
  const [period, setPeriod] = useState(periods[0]);
  const [grouping, setGrouping] = useState(groupings[0]);
  const [notice, setNotice] = useState("");

  function selectPeriod(value: string) {
    setPeriod(value);
    setNotice(`Đã chọn ${value}. Số liệu hiển thị vẫn là dữ liệu mẫu.`);
  }

  return <>
    <div className="flex flex-wrap items-end gap-4">
      <label className="grid min-w-64 gap-2 font-medium">
        Kỳ {performance ? "đánh giá" : "báo cáo"}
        <select className={control} value={period} onChange={(event) => selectPeriod(event.target.value)}>
          {periods.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="grid min-w-64 gap-2 font-medium">
        {performance ? "Phạm vi công việc" : "Phạm vi"}
        <select className={control} onChange={() => setNotice("Phạm vi hiện dùng một bộ dữ liệu mẫu duy nhất.")}>
          <option>{performance ? "Tất cả bước xử lý" : "Toàn cửa hàng"}</option>
        </select>
      </label>
      {performance
        ? <span className="ml-auto rounded-full bg-brand-subtle px-4 py-3 text-xs font-semibold text-brand">Chỉ hiển thị dữ liệu của bạn</span>
        : <div className="flex flex-wrap gap-2" aria-label="Nhóm kỳ báo cáo">
          {groupings.map((item) => <button key={item} type="button" aria-pressed={grouping === item}
            className={grouping === item ? "rounded-lg bg-brand-subtle px-4 py-3 font-semibold text-brand" : secondaryButton}
            onClick={() => { setGrouping(item); setNotice(`Đã chọn ${item.toLowerCase()}. Biểu đồ vẫn dùng dữ liệu mẫu 7 ngày.`); }}>
            {item}
          </button>)}
        </div>}
    </div>
    {notice && <p role="status" className="rounded-lg bg-brand-subtle p-4 text-brand">{notice}</p>}
  </>;
}
