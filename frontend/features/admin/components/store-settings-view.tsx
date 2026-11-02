"use client";

import { useState, useEffect, type FormEvent } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { AdminPageHeader } from "./admin-ui";
import { SystemNav } from "./system-nav";
import { Switch } from "@/components/workspace/switch";
import { card, control, primaryLink } from "@/components/workspace/workspace-ui";
import { apiGet, apiSend } from "@/lib/api-client";

export type StoreSettings = {
  storeName: string;
  contactEmail: string;
  hotline: string;
  address: string;
  timezone: string;
  currency: string;
  standardShipping: boolean;
  expressShipping: boolean;
  freeShippingThreshold: number;
  codPayment: boolean;
  bankTransfer: boolean;
  vnpay: boolean;
  accountHolder: string;
  emailOrderConfirmation: boolean;
  lowStockAlert: boolean;
  dailyRevenueReport: boolean;
  promoNotification: boolean;
  lowStockThreshold?: number;
  shippingFee?: number;
};

const initialFormState: StoreSettings = {
  storeName: "",
  contactEmail: "",
  hotline: "",
  address: "",
  timezone: "GMT+7 · Việt Nam",
  currency: "VND – Việt Nam đồng",
  standardShipping: true,
  expressShipping: false,
  freeShippingThreshold: 0,
  codPayment: true,
  bankTransfer: false,
  vnpay: false,
  accountHolder: "",
  emailOrderConfirmation: true,
  lowStockAlert: true,
  dailyRevenueReport: false,
  promoNotification: false,
};

export function StoreSettingsView() {
  const [form, setForm] = useState<StoreSettings>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [errors, setErrors] = useState<{ storeName?: string; contactEmail?: string }>({});
  const [notice, setNotice] = useState("");

  const loadSettings = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await apiGet<StoreSettings>("/api/v1/admin/settings");
      if (data) {
        setForm(data);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Không thể kết nối máy chủ để lấy cấu hình.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!form.storeName.trim()) found.storeName = "Vui lòng nhập tên cửa hàng.";
    if (form.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
      found.contactEmail = "Nhập email hợp lệ, ví dụ admin@example.com.";
    }
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      setNotice("");
      document.getElementById(first === "storeName" ? "store-name" : "store-email")?.focus();
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setNotice("");

    try {
      const updated = await apiSend<StoreSettings>("PUT", "/api/v1/admin/settings", form);
      if (updated) {
        setForm(updated);
      }
      setNotice("Đã lưu cấu hình hệ thống thành công vào cơ sở dữ liệu MongoDB.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu cấu hình vào cơ sở dữ liệu.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={["Hệ thống", "Cấu hình hệ thống"]}
        title="Cấu hình hệ thống"
        subtitle="Thiết lập cửa hàng, thanh toán và thông báo vận hành."
        actions={
          <button
            type="submit"
            form="store-settings-form"
            disabled={isLoading || isSaving}
            className={`${primaryLink} min-h-12 px-8 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        }
      />

      <SystemNav />

      {/* Loading indicator */}
      {isLoading && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-line bg-surface px-6 py-4 text-sm text-muted"
        >
          <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden="true" />
          <span>Đang tải cấu hình thực tế từ MongoDB...</span>
        </div>
      )}

      {/* Load error */}
      {loadError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger/10 px-6 py-4 text-sm font-medium text-danger"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={loadSettings}
            className="text-xs underline hover:no-underline font-semibold"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger/10 px-6 py-4 text-sm font-medium text-danger"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveError("")}
            className="text-xs text-muted hover:text-ink"
            aria-label="Đóng thông báo lỗi"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success notice */}
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

      <form
        id="store-settings-form"
        noValidate
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        {/* Left column */}
        <div className="space-y-6">
          {/* Thông tin cửa hàng */}
          <section className={`${card} p-6`}>
            <h2 className="text-xl font-semibold">Thông tin cửa hàng</h2>

            <div className="mt-6 space-y-4">
              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="store-name" className="font-medium">
                  Tên cửa hàng <span className="text-danger">*</span>
                </label>
                <input
                  id="store-name"
                  type="text"
                  required
                  value={form.storeName}
                  aria-invalid={errors.storeName ? true : undefined}
                  aria-describedby={errors.storeName ? "store-name-error" : undefined}
                  onChange={(e) => {
                    setForm({ ...form, storeName: e.target.value });
                    setErrors({ ...errors, storeName: undefined });
                  }}
                  className={`${control} ${errors.storeName ? "border-danger" : ""}`}
                />
                {errors.storeName && (
                  <p id="store-name-error" role="alert" className="text-xs text-danger">
                    {errors.storeName}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                  <label htmlFor="store-email" className="font-medium">
                    Email liên hệ
                  </label>
                  <input
                    id="store-email"
                    type="email"
                    value={form.contactEmail}
                    aria-invalid={errors.contactEmail ? true : undefined}
                    aria-describedby={errors.contactEmail ? "store-email-error" : undefined}
                    onChange={(e) => {
                      setForm({ ...form, contactEmail: e.target.value });
                      setErrors({ ...errors, contactEmail: undefined });
                    }}
                    className={`${control} ${errors.contactEmail ? "border-danger" : ""}`}
                  />
                  {errors.contactEmail && (
                    <p id="store-email-error" role="alert" className="text-xs text-danger">
                      {errors.contactEmail}
                    </p>
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  <label htmlFor="store-hotline" className="font-medium">
                    Hotline
                  </label>
                  <input
                    id="store-hotline"
                    type="tel"
                    value={form.hotline}
                    onChange={(e) => setForm({ ...form, hotline: e.target.value })}
                    className={control}
                  />
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="store-address" className="font-medium">
                  Địa chỉ
                </label>
                <input
                  id="store-address"
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={control}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                  <label htmlFor="store-timezone" className="font-medium">
                    Múi giờ
                  </label>
                  <select
                    id="store-timezone"
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className={control}
                  >
                    <option value="GMT+7 · Việt Nam">GMT+7 · Việt Nam</option>
                  </select>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  <label htmlFor="store-currency" className="font-medium text-muted">
                    Tiền tệ
                  </label>
                  <input
                    id="store-currency"
                    type="text"
                    readOnly
                    disabled
                    value={form.currency}
                    className={`${control} bg-canvas text-muted cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Vận chuyển */}
          <section className={`${card} p-6`}>
            <h2 className="text-xl font-semibold">Vận chuyển</h2>

            <div className="mt-4 divide-y divide-line">
              <Switch
                label="Giao hàng tiêu chuẩn"
                description="30.000 đ · Giao trong 2–4 ngày"
                checked={form.standardShipping}
                onChange={(checked) => setForm({ ...form, standardShipping: checked })}
              />

              <Switch
                label="Giao hàng hỏa tốc"
                description="45.000 đ · Nội thành TP. Hồ Chí Minh"
                checked={form.expressShipping}
                onChange={(checked) => setForm({ ...form, expressShipping: checked })}
              />
            </div>

            <div className="mt-4 flex min-w-0 flex-col gap-2 pt-2">
              <label htmlFor="store-freeship" className="font-medium">
                Miễn phí vận chuyển từ (VND)
              </label>
              <input
                id="store-freeship"
                type="text"
                value={form.freeShippingThreshold.toLocaleString("vi-VN")}
                onChange={(e) => {
                  const num = Number(e.target.value.replace(/[^0-9]/g, ""));
                  setForm({ ...form, freeShippingThreshold: num });
                }}
                className={control}
              />
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Phương thức thanh toán (giữ nguyên giao diện - xử lý logic sau) */}
          <section className={`${card} p-6`}>
            <h2 className="text-xl font-semibold">Phương thức thanh toán</h2>

            <div className="mt-4 divide-y divide-line">
              <Switch
                label="Thanh toán khi nhận hàng"
                description="Thu hộ qua đối tác giao hàng"
                checked={form.codPayment}
                onChange={(checked) => setForm({ ...form, codPayment: checked })}
              />

              <Switch
                label="Chuyển khoản ngân hàng"
                description="Vietcombank · 0123 456 789"
                checked={form.bankTransfer}
                onChange={(checked) => setForm({ ...form, bankTransfer: checked })}
              />

              <Switch
                label="VNPay"
                description="Thẻ ngân hàng và ví điện tử"
                checked={form.vnpay}
                onChange={(checked) => setForm({ ...form, vnpay: checked })}
              />
            </div>

            <div className="mt-4 flex min-w-0 flex-col gap-2 pt-2">
              <label htmlFor="store-account-holder" className="font-medium">
                Tên chủ tài khoản
              </label>
              <input
                id="store-account-holder"
                type="text"
                value={form.accountHolder}
                onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
                className={control}
              />
            </div>
          </section>

          {/* Thông báo */}
          <section className={`${card} p-6`}>
            <h2 className="text-xl font-semibold">Thông báo</h2>

            <div className="mt-4 divide-y divide-line">
              <Switch
                label="Email xác nhận đơn hàng"
                description="Gửi tự động sau khi tạo đơn"
                checked={form.emailOrderConfirmation}
                onChange={(checked) => setForm({ ...form, emailOrderConfirmation: checked })}
              />

              <Switch
                label="Cảnh báo tồn kho thấp"
                description="Thông báo đến Admin và Staff"
                checked={form.lowStockAlert}
                onChange={(checked) => setForm({ ...form, lowStockAlert: checked })}
              />

              <Switch
                label="Báo cáo doanh thu hằng ngày"
                description="Gửi lúc 08:00 qua email Admin"
                checked={form.dailyRevenueReport}
                onChange={(checked) => setForm({ ...form, dailyRevenueReport: checked })}
              />

              <Switch
                label="Tin khuyến mãi"
                description="Chỉ gửi khi khách hàng đồng ý"
                checked={form.promoNotification}
                onChange={(checked) => setForm({ ...form, promoNotification: checked })}
              />
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
