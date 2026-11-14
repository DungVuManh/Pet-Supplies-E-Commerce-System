"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, Loader2, RefreshCw } from "lucide-react";
import { AdminPageHeader, StatusBadge } from "./admin-ui";
import { SystemNav } from "./system-nav";
import type { StorePolicy } from "../types";
import { listPolicies, updatePolicy } from "../services/policies";
import { card, control, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";

export function StorePoliciesView() {
  const [policies, setPolicies] = useState<StorePolicy[]>([]);
  const [selectedId, setSelectedId] = useState<string>("return");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchPolicies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listPolicies();
      setPolicies(data);
      if (data.length > 0) {
        setSelectedId((prev) =>
          data.some((p) => p.id === prev || p.code === prev) ? prev : data[0].id
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách chính sách từ máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const selectedPolicy =
    policies.find((p) => p.id === selectedId || p.code === selectedId) || policies[0];

  const handleUpdatePolicy = (field: keyof StorePolicy, value: string) => {
    if (!selectedPolicy) return;
    setPolicies((prev) =>
      prev.map((p) =>
        p.id === selectedPolicy.id || p.code === selectedPolicy.code ? { ...p, [field]: value } : p
      )
    );
  };

  const handleInsertFormat = (prefix: string, suffix: string = "") => {
    const el = textareaRef.current;
    if (!el || !selectedPolicy) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = selectedPolicy.content || "";
    const selected = text.slice(start, end);
    const replacement = `${prefix}${selected || "văn bản"}${suffix}`;

    const newContent = text.slice(0, start) + replacement + text.slice(end);
    handleUpdatePolicy("content", newContent);

    setTimeout(() => {
      el.focus();
      const newCursorPos = start + prefix.length + (selected ? selected.length : "văn bản".length);
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSave = async () => {
    if (!selectedPolicy) return;

    try {
      setIsSaving(true);
      setNotice("");
      setError(null);

      const updated = await updatePolicy(selectedPolicy.code, {
        title: selectedPolicy.title,
        content: selectedPolicy.content,
        status: selectedPolicy.status,
        effectiveDate: selectedPolicy.effectiveDate,
      });

      setPolicies((prev) =>
        prev.map((p) =>
          p.code === selectedPolicy.code || p.id === selectedPolicy.id ? updated : p
        )
      );

      setNotice(`Đã lưu và công bố “${updated.title}” thành công.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi lưu chính sách. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Hệ thống", "Chính sách cửa hàng"]}
        title="Chính sách cửa hàng"
        subtitle="Quản lý nội dung chính sách hiển thị với khách hàng và toàn bộ hệ thống."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`${secondaryButton} inline-flex items-center gap-1.5`}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span>{showPreview ? "Đóng xem trước" : "Xem trước"}</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading || !selectedPolicy}
              className={`${primaryLink} min-h-12 px-8 inline-flex items-center gap-2 disabled:opacity-50`}
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              <span>{isSaving ? "Đang lưu..." : "Lưu & công bố"}</span>
            </button>
          </div>
        }
      />

      <SystemNav />

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger/10 px-6 py-4 text-sm font-medium text-danger"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchPolicies}
            className="inline-flex items-center gap-1 text-xs underline hover:no-underline"
          >
            <RefreshCw className="h-3 w-3" /> Tải lại
          </button>
        </div>
      )}

      {/* Success Notice */}
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

      {isLoading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-line bg-surface p-12">
          <div className="flex flex-col items-center gap-3 text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="text-sm font-medium">Đang tải chính sách từ hệ thống...</p>
          </div>
        </div>
      ) : policies.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface p-8 text-center">
          <p className="text-sm font-medium text-muted">Không có chính sách nào.</p>
          <button
            type="button"
            onClick={fetchPolicies}
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white"
          >
            Tải lại
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Left: Policy List */}
          <div className="space-y-4">
            <div className="space-y-3">
              {policies.map((p) => {
                const isSelected = p.id === selectedPolicy?.id || p.code === selectedPolicy?.code;
                return (
                  <button
                    key={p.code || p.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(p.id);
                      setNotice("");
                      setError(null);
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
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <StatusBadge status={p.status} />
                      <span className="text-[11px] font-mono text-muted">{p.code}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedPolicy?.lastUpdated && (
              <p className="text-xs text-muted">
                Cập nhật lần cuối: {selectedPolicy.lastUpdated}.
              </p>
            )}
          </div>

          {/* Right: Policy Editor & Live Preview */}
          <div className="space-y-4">
            {showPreview ? (
              <section className={`${card} p-6 space-y-4`}>
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Xem trước chính sách (Giao diện khách hàng)
                    </span>
                    <h2 className="text-xl font-bold text-ink mt-1">{selectedPolicy.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedPolicy.status} />
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className="rounded border border-line px-3 py-1 text-xs hover:bg-canvas"
                    >
                      Đóng
                    </button>
                  </div>
                </div>

                <div className="text-xs text-muted">
                  Hiệu lực từ ngày: <span className="font-semibold text-ink">{selectedPolicy.effectiveDate}</span>
                </div>

                <div className="prose max-w-none whitespace-pre-wrap rounded-lg bg-canvas p-6 text-sm leading-relaxed text-ink font-sans border border-line">
                  {selectedPolicy.content || "(Chưa có nội dung)"}
                </div>
              </section>
            ) : (
              <section className={`${card} p-6`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{selectedPolicy.title}</h2>
                  <span className="text-xs font-mono text-muted">{selectedPolicy.code}</span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-2">
                    <label htmlFor="policy-status" className="font-medium text-sm">
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
                    <label htmlFor="policy-date" className="font-medium text-sm">
                      Ngày có hiệu lực
                    </label>
                    <input
                      id="policy-date"
                      type="text"
                      value={selectedPolicy.effectiveDate}
                      onChange={(e) => handleUpdatePolicy("effectiveDate", e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className={control}
                    />
                  </div>
                </div>

                {/* Interactive Formatting Toolbar */}
                <div className="mt-6 flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-line bg-canvas px-4 py-2 text-xs font-semibold text-muted">
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("**", "**")}
                    className="rounded px-2.5 py-1 font-bold hover:bg-line hover:text-ink"
                    title="In đậm"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("*", "*")}
                    className="rounded px-2.5 py-1 italic hover:bg-line hover:text-ink"
                    title="In nghiêng"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("<u>", "</u>")}
                    className="rounded px-2.5 py-1 underline hover:bg-line hover:text-ink"
                    title="Gạch chân"
                  >
                    U
                  </button>
                  <span className="text-line mx-1" aria-hidden="true">
                    |
                  </span>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("\n- ")}
                    className="rounded px-2.5 py-1 hover:bg-line hover:text-ink"
                    title="Danh sách dấu gạch đầu dòng"
                  >
                    • Danh sách
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("\n1. ")}
                    className="rounded px-2.5 py-1 hover:bg-line hover:text-ink"
                    title="Danh sách có số thứ tự"
                  >
                    1. Thứ tự
                  </button>
                  <span className="text-line mx-1" aria-hidden="true">
                    |
                  </span>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat("[", "](https://)")}
                    className="rounded px-2.5 py-1 hover:bg-line hover:text-ink"
                    title="Chèn liên kết"
                  >
                    Liên kết
                  </button>
                </div>

                {/* Content Textarea */}
                <textarea
                  ref={textareaRef}
                  id="policy-content"
                  rows={14}
                  value={selectedPolicy.content}
                  onChange={(e) => handleUpdatePolicy("content", e.target.value)}
                  className="w-full rounded-b-lg border border-line bg-surface p-4 text-sm leading-relaxed focus:border-brand focus:outline-none font-sans"
                  placeholder="Nhập nội dung quy định và chính sách (tối đa 20.000 ký tự)..."
                />

                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>Văn bản thuần hoặc Markdown (tối đa 20.000 ký tự).</span>
                  <span>{(selectedPolicy.content || "").length.toLocaleString()} / 20.000 ký tự</span>
                </div>
              </section>
            )}

            <footer className="text-xs text-muted">
              Hủy đơn: trước khi bàn giao vận chuyển · Hoàn tiền: 3–7 ngày làm việc · Bảo mật: chỉ sử dụng dữ liệu để xử lý đơn, không chia sẻ cho bên thứ ba khi chưa có sự đồng ý.
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
