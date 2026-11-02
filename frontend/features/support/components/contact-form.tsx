"use client";

// =============================================================
// features/support/components/contact-form.tsx
// Form gửi tin nhắn hỗ trợ / liên hệ tới Petjoy
// =============================================================

import React, { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import type { ContactFormData } from "../types";

const INITIAL_FORM: ContactFormData = {
  fullName: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      setErrorMessage("Vui lòng nhập họ và tên của bạn.");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage("Vui lòng nhập số điện thoại để Petjoy liên hệ.");
      return;
    }
    if (!formData.message.trim()) {
      setErrorMessage("Vui lòng nhập nội dung tin nhắn cần hỗ trợ.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Giả lập gửi thông tin liên hệ (khoảng 600ms)
      await new Promise((resolve) => setTimeout(resolve, 600));

      setIsSuccess(true);
      setFormData(INITIAL_FORM);
    } catch {
      setErrorMessage("Đã có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Gửi tin nhắn cho Petjoy
        </h2>
        <p className="mt-1 text-sm text-muted">
          Hỏi về sản phẩm, hợp tác kinh doanh, hoặc góp ý — chúng mình đọc hết!
        </p>
      </div>

      {isSuccess && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Gửi tin nhắn thành công!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Cảm ơn bạn đã liên hệ. Đội ngũ Petjoy sẽ phản hồi trong vòng 24 giờ qua số điện thoại hoặc email bạn cung cấp.
              </p>
              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                className="mt-3 text-xs font-semibold text-emerald-800 underline hover:text-emerald-900"
              >
                Gửi thêm tin nhắn khác
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          ⚠️ {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Họ tên + Số điện thoại */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fullName" className="block text-xs font-medium text-ink mb-1.5">
              Họ tên <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand transition-all"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-ink mb-1.5">
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="0912 345 678"
              className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand transition-all"
            />
          </div>
        </div>

        {/* Row 2: Email */}
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-ink mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@example.com"
            className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand transition-all"
          />
        </div>

        {/* Row 3: Chủ đề */}
        <div>
          <label htmlFor="subject" className="block text-xs font-medium text-ink mb-1.5">
            Chủ đề
          </label>
          <select
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand transition-all"
          >
            <option value="">Chọn chủ đề</option>
            <option value="consulting">Tư vấn chọn thức ăn & đồ dùng thú cưng</option>
            <option value="order">Tra cứu & khiếu nại đơn hàng</option>
            <option value="warranty">Chính sách đổi trả & bảo hành</option>
            <option value="partnership">Hợp tác kinh doanh / Nhà cung cấp</option>
            <option value="feedback">Góp ý cải thiện chất lượng dịch vụ</option>
            <option value="other">Chủ đề khác</option>
          </select>
        </div>

        {/* Row 4: Nội dung */}
        <div>
          <label htmlFor="message" className="block text-xs font-medium text-ink mb-1.5">
            Nội dung <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            required
            value={formData.message}
            onChange={handleChange}
            placeholder="Nội dung tin nhắn cần hỗ trợ..."
            className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand transition-all resize-none"
          />
        </div>

        {/* Action Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang gửi...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Gửi tin nhắn</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

