"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AdminPageHeader, StatusBadge } from "./admin-ui";
import { SystemNav } from "./system-nav";
import { defaultPolicies, type StorePolicy } from "../mock/system";
import { card, control, primaryLink } from "@/components/workspace/workspace-ui";
import { DemoNotice } from "@/components/workspace/demo-notice";

export function StorePoliciesView() {
  const [policies, setPolicies] = useState<StorePolicy[]>(defaultPolicies);
  const [selectedId, setSelectedId] = useState<string>("return");
  const [notice, setNotice] = useState("");

  const selectedPolicy = policies.find((p) => p.id === selectedId) || policies[0];

  const handleUpdatePolicy = (field: keyof StorePolicy, value: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = () => {
    setNotice(`Đã lưu và công bố “${selectedPolicy.title}” thành công (bản demo cập nhật tại chỗ).`);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Hệ thống", "Chính sách cửa hàng"]}
        title="Chính sách cửa hàng"
        subtitle="Quản lý nội dung chính sách hiển thị với khách hàng."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <DemoNotice
              label="Xem trước"
              message="Chức năng xem trước chính sách trên trang khách hàng chưa kết nối backend."
            />
            <button
              type="button"
              onClick={handleSave}
              className={`${primaryLink} min-h-12 px-8`}
            >
              Lưu & công bố
            </button>
          </div>
        }
      />

      <SystemNav />

      {/* Notice */}
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-brand/20 bg-brand-subtle px-6 py-4 text-sm font-medium text-brand"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="text-xs text-muted hover:text-ink"
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left: Policy List */}
        <div className="space-y-4">
          <div className="space-y-3">
            {policies.map((p) => {
              const isSelected = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(p.id);
                    setNotice("");
                  }}
                  className={`w-full rounded-lg border p-4 text-left transition-all ${
                    isSelected
                      ? "border-brand bg-brand-subtle/30 shadow-sm"
                      : "border-line bg-surface hover:border-brand/40 hover:bg-canvas/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-semibold ${isSelected ? "text-brand" : "text-ink"}`}>
                      {p.title}
                    </p>
                  </div>
                  <div className="mt-2">
                    <StatusBadge status={p.status} />
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted">
            Cập nhật lần cuối: {selectedPolicy.lastUpdated}.
          </p>
        </div>

        {/* Right: Policy Editor */}
        <div className="space-y-4">
          <section className={`${card} p-6`}>
            <h2 className="text-xl font-semibold">{selectedPolicy.title}</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="policy-status" className="font-medium">
                  Trạng thái
                </label>
                <select
                  id="policy-status"
                  value={selectedPolicy.status}
                  onChange={(e) => handleUpdatePolicy("status", e.target.value)}
                  className={control}
                >
                  <option value="Đã công bố">Đã công bố</option>
                  <option value="Bản nháp">Bản nháp</option>
                  <option value="Tạm ngưng">Tạm ngưng</option>
                </select>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="policy-date" className="font-medium">
                  Ngày có hiệu lực
                </label>
                <input
                  id="policy-date"
                  type="text"
                  value={selectedPolicy.effectiveDate}
                  onChange={(e) => handleUpdatePolicy("effectiveDate", e.target.value)}
                  className={control}
                />
              </div>
            </div>

            {/* Formatting Toolbar Mock */}
            <div className="mt-6 flex flex-wrap items-center gap-2 rounded-t-lg border border-b-0 border-line bg-canvas px-4 py-2 text-xs font-semibold text-muted">
              <button
                type="button"
                className="rounded px-2 py-1 font-bold hover:bg-line hover:text-ink"
                title="In đậm"
              >
                B
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 italic hover:bg-line hover:text-ink"
                title="In nghiêng"
              >
                I
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 underline hover:bg-line hover:text-ink"
                title="Gạch chân"
              >
                U
              </button>
              <span className="text-line" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-line hover:text-ink"
                title="Danh sách"
              >
                Danh sách
              </button>
              <span className="text-line" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-line hover:text-ink"
                title="Chèn liên kết"
              >
                Liên kết
              </button>
            </div>

            {/* Content Textarea */}
            <textarea
              id="policy-content"
              rows={12}
              value={selectedPolicy.content}
              onChange={(e) => handleUpdatePolicy("content", e.target.value)}
              className="w-full rounded-b-lg border border-line bg-surface p-4 text-sm leading-relaxed focus:border-brand focus:outline-none"
              placeholder="Nhập nội dung chính sách..."
            />
          </section>

          <footer className="text-xs text-muted">
            Hủy đơn: trước khi bàn giao vận chuyển · Hoàn tiền: 3–7 ngày làm việc · Bảo mật: chỉ sử dụng dữ liệu để xử lý đơn, không chia sẻ cho quảng cáo khi chưa có sự đồng ý.
          </footer>
        </div>
      </div>
    </div>
  );
}
