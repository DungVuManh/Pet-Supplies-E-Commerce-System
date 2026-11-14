"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { AdminPageHeader, StatusBadge } from "./admin-ui";
import { SystemNav } from "./system-nav";
import type { StorePolicy } from "../types";
import {
  createPolicy,
  deletePolicy,
  listPolicies,
  updatePolicy,
} from "../services/policies";
import {
  card,
  control,
  dangerButton,
  primaryLink,
  secondaryButton,
} from "@/components/workspace/workspace-ui";

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function StorePoliciesView() {
  const [policies, setPolicies] = useState<StorePolicy[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Create policy form state
  const [createTitle, setCreateTitle] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchPolicies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listPolicies();
      setPolicies(data);
      if (data.length > 0) {
        setSelectedCode((prev) =>
          data.some((p) => p.code === prev) ? prev : data[0].code
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
    policies.find((p) => p.code === selectedCode) || policies[0];

  const handleUpdatePolicy = (field: keyof StorePolicy, value: string) => {
    if (!selectedPolicy) return;
    setPolicies((prev) =>
      prev.map((p) =>
        p.code === selectedPolicy.code ? { ...p, [field]: value } : p
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
        content: selectedPolicy.content || "",
        status: "published",
        effectiveDate: selectedPolicy.effectiveDate || "01/10/2026",
      });

      setPolicies((prev) =>
        prev.map((p) => (p.code === selectedPolicy.code ? updated : p))
      );
      setSelectedCode(updated.code);

      setNotice(`Đã lưu và công bố “${updated.title}” thành công.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi lưu chính sách. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenCreate = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const today = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

    setCreateTitle("");
    setCreateCode("");
    setCreateSlug("");
    setCreateContent("");
    setCreateDate(today);
    setIsCreateOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setCreateTitle(val);
    const generatedSlug = slugify(val);
    setCreateSlug(generatedSlug);
    setCreateCode(`POL-${generatedSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16)}`);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      setError("Vui lòng nhập tiêu đề chính sách.");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      setNotice("");

      const created = await createPolicy({
        title: createTitle.trim(),
        code: createCode.trim() || undefined,
        slug: createSlug.trim() || undefined,
        content: createContent.trim(),
        effectiveDate: createDate.trim() || undefined,
      });

      setPolicies((prev) => [...prev, created]);
      setSelectedCode(created.code);
      setIsCreateOpen(false);
      setNotice(`Đã thêm và công bố chính sách “${created.title}” thành công.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi tạo chính sách mới.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPolicy) return;

    try {
      setIsDeleting(true);
      setError(null);
      setNotice("");

      await deletePolicy(selectedPolicy.code);

      const remaining = policies.filter((p) => p.code !== selectedPolicy.code);
      setPolicies(remaining);
      if (remaining.length > 0) {
        setSelectedCode(remaining[0].code);
      } else {
        setSelectedCode("");
      }
      setIsDeleteOpen(false);
      setNotice(`Đã xóa chính sách “${selectedPolicy.title}” thành công.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi xóa chính sách.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Hệ thống", "Chính sách cửa hàng"]}
        title="Chính sách cửa hàng"
        subtitle="Quản lý và xuất bản nội dung chính sách hiển thị với khách hàng và toàn bộ hệ thống."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleOpenCreate}
              className={`${secondaryButton} inline-flex items-center gap-1.5`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Thêm chính sách</span>
            </button>
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
            onClick={handleOpenCreate}
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white"
          >
            + Thêm chính sách mới
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Left: Policy List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Danh sách chính sách ({policies.length})
              </span>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm mới
              </button>
            </div>

            <div className="space-y-2.5 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
              {policies.map((p) => {
                const isSelected = p.code === selectedPolicy?.code;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => {
                      setSelectedCode(p.code);
                      setNotice("");
                      setError(null);
                    }}
                    className={`w-full rounded-lg border p-3.5 text-left transition-all ${
                      isSelected
                        ? "border-brand bg-brand-subtle/30 shadow-sm"
                        : "border-line bg-surface hover:border-brand/40 hover:bg-canvas/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-semibold text-sm ${isSelected ? "text-brand" : "text-ink"}`}>
                        {p.title}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500"></span>
                        Đã công bố
                      </span>
                      <span className="text-[11px] font-mono text-muted">{p.code}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedPolicy?.lastUpdated && (
              <p className="text-xs text-muted px-1">
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
                    <StatusBadge status="Đã công bố" />
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-ink">{selectedPolicy.title}</h2>
                    <span className="text-xs font-mono text-muted mt-0.5 inline-block">{selectedPolicy.code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeleteOpen(true)}
                    className={`${dangerButton} h-9 px-4 text-xs inline-flex items-center gap-1.5`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Xóa chính sách</span>
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {/* Trạng thái fix cứng thành "Đã công bố" */}
                  <div className="flex min-w-0 flex-col gap-2">
                    <label className="font-medium text-sm text-ink">
                      Trạng thái
                    </label>
                    <div className="flex h-12 items-center rounded-lg border border-line bg-canvas/70 px-4 text-sm font-semibold text-emerald-700 select-none">
                      <span className="mr-2 inline-block size-2 rounded-full bg-emerald-500"></span>
                      Đã công bố
                    </div>
                  </div>

                  {/* Ngày có hiệu lực */}
                  <div className="flex min-w-0 flex-col gap-2">
                    <label htmlFor="policy-date" className="font-medium text-sm text-ink">
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
              Mọi cập nhật nội dung sẽ được xuất bản trực tiếp tới khách hàng trên website và ứng dụng sau khi bấm Lưu & công bố.
            </footer>
          </div>
        </div>
      )}

      {/* Modal: Thêm chính sách mới */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="text-lg font-bold text-ink">Thêm chính sách mới</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-muted hover:text-ink"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Tiêu đề chính sách <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ví dụ: Chính sách khách hàng thân thiết"
                  className={control}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Mã chính sách
                  </label>
                  <input
                    type="text"
                    value={createCode}
                    onChange={(e) => setCreateCode(e.target.value)}
                    placeholder="POL-LOYALTY"
                    className={control}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Đường dẫn (slug)
                  </label>
                  <input
                    type="text"
                    value={createSlug}
                    onChange={(e) => setCreateSlug(e.target.value)}
                    placeholder="chinh-sach-khach-hang"
                    className={control}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Ngày hiệu lực
                  </label>
                  <input
                    type="text"
                    value={createDate}
                    onChange={(e) => setCreateDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className={control}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Trạng thái
                  </label>
                  <div className="flex h-12 items-center rounded-lg border border-line bg-canvas/60 px-4 text-xs font-semibold text-emerald-700 select-none">
                    <span className="mr-1.5 size-2 rounded-full bg-emerald-500"></span>
                    Đã công bố
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Nội dung quy định ban đầu
                </label>
                <textarea
                  rows={4}
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  placeholder="Nhập nội dung các điều khoản và quy định..."
                  className="w-full rounded-lg border border-line bg-surface p-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className={`${secondaryButton} h-10 px-4 text-sm`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className={`${primaryLink} h-10 px-6 text-sm inline-flex items-center gap-2`}
                >
                  {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{isCreating ? "Đang tạo..." : "Tạo & công bố"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận xóa chính sách */}
      {isDeleteOpen && selectedPolicy && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-danger">
              <div className="flex size-10 items-center justify-center rounded-full bg-danger/10">
                <Trash2 className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-ink">Xác nhận xóa chính sách</h3>
            </div>

            <p className="mt-4 text-sm text-muted leading-relaxed">
              Bạn có chắc chắn muốn xóa chính sách{" "}
              <strong className="text-ink">“{selectedPolicy.title}”</strong> (mã:{" "}
              <code className="font-mono text-xs text-brand">{selectedPolicy.code}</code>
              )? Thao tác này sẽ xóa vĩnh viễn chính sách khỏi hệ thống và không thể khôi phục.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
                className={`${secondaryButton} h-10 px-4 text-sm`}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className={`${dangerButton} h-10 px-5 text-sm inline-flex items-center gap-2`}
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isDeleting ? "Đang xóa..." : "Xác nhận xóa"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
