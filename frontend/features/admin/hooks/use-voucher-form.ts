"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { createVoucher, deleteVoucher, updateVoucher } from "../services/vouchers";
import type { AdminVoucherDetail, VoucherFields } from "../types";
import { parseAmount, validateVoucher, type VoucherFormValues } from "../validation";
import { voucherPreview } from "../voucher";

type FieldErrors = Partial<Record<keyof VoucherFormValues, string>>;

const fieldOrder: (keyof VoucherFormValues)[] = ["code", "name", "type", "value", "maxDiscount", "minOrderAmount", "startDate", "endDate", "usageLimit"];

const blank: VoucherFormValues = {
  code: "", name: "", type: "percent", value: "", maxDiscount: "", minOrderAmount: "", startDate: "", endDate: "", usageLimit: "", oncePerCustomer: true, isPublic: false,
};

const formValues = (voucher?: AdminVoucherDetail): VoucherFormValues => (voucher ? {
  code: voucher.code, name: voucher.name, type: voucher.type, value: String(voucher.value),
  maxDiscount: voucher.maxDiscount === null ? "" : String(voucher.maxDiscount),
  minOrderAmount: voucher.minOrderAmount ? String(voucher.minOrderAmount) : "",
  startDate: voucher.startDate, endDate: voucher.endDate,
  usageLimit: voucher.usageLimit === null ? "" : String(voucher.usageLimit),
  oncePerCustomer: voucher.oncePerCustomer, isPublic: voucher.isPublic,
} : blank);

/** Valid form values in the shape the API takes. Switching to a fixed amount clears the cap. */
function toFields(values: VoucherFormValues): VoucherFields {
  const optional = (value: string) => (value.trim() ? parseAmount(value) : null);
  return {
    code: values.code.trim().toUpperCase(), name: values.name.trim(), type: values.type, value: parseAmount(values.value),
    maxDiscount: values.type === "percent" ? optional(values.maxDiscount) : null,
    minOrderAmount: optional(values.minOrderAmount) ?? 0,
    startDate: values.startDate, endDate: values.endDate, usageLimit: optional(values.usageLimit),
    oncePerCustomer: values.oncePerCustomer, isPublic: values.isPublic,
  };
}

/** Values, validation, save, and delete for the voucher form. Field ids are `voucher-<name>`. */
export function useVoucherForm(initialVoucher?: AdminVoucherDetail) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(initialVoucher);
  const [voucher, setVoucher] = useState(initialVoucher);
  const [values, setValues] = useState(() => formValues(initialVoucher));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Newly loaded server data replaces the form, as after a conflict.
  if (loaded !== initialVoucher) {
    setLoaded(initialVoucher);
    setVoucher(initialVoucher);
    setValues(formValues(initialVoucher));
    setErrors({});
  }

  function set<K extends keyof VoucherFormValues>(key: K, value: VoucherFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setNotice("");
    setFormError("");
  }

  function showErrors(found: FieldErrors) {
    setErrors(found);
    const first = fieldOrder.find((name) => found[name]);
    // After a server error the field may only be enabled again on the next render.
    if (first) requestAnimationFrame(() => document.getElementById(`voucher-${first}`)?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setNotice("");
    setFormError("");
    const found = validateVoucher(values);
    if (Object.keys(found).length > 0) { showErrors(found); return; }
    setErrors({});

    setPending(true);
    try {
      const fields = toFields(values);
      if (!voucher) {
        await createVoucher(fields);
        router.push("/admin/vouchers");
        return;
      }
      const saved = await updateVoucher(voucher.code, fields, voucher.updatedAt);
      setVoucher(saved);
      setValues(formValues(saved));
      setNotice(saved.changed ? "Đã lưu voucher." : "Không có thay đổi nào để lưu.");
      // The code is in the URL, so a renamed voucher needs its new address.
      if (saved.code !== voucher.code) router.replace(`/admin/vouchers/${encodeURIComponent(saved.code)}/edit`);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        showErrors(error.fields as FieldErrors);
      } else if (error instanceof ApiError && error.status === 409) {
        setNotice(error.message);
        router.refresh();
      } else {
        setFormError(error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    if (!voucher || deletePending) return;
    setDeleteError("");
    setDeletePending(true);
    try {
      await deleteVoucher(voucher.code);
      router.push("/admin/vouchers");
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
      if (error instanceof ApiError && error.status === 409) router.refresh();
    } finally {
      setDeletePending(false);
    }
  }

  // Only meaningful once the amounts are valid.
  const previewErrors = validateVoucher(values);
  const preview = previewErrors.value || previewErrors.maxDiscount || previewErrors.minOrderAmount ? "" : (() => {
    const fields = toFields(values);
    return voucherPreview(fields, fields.minOrderAmount);
  })();

  return {
    voucher, values, errors, notice, formError, pending, preview, set, submit,
    locked: (field: "code" | "type" | "value") => voucher?.lockedFields.includes(field) ?? false,
    deleteOpen, deletePending, deleteError, confirmDelete,
    askDelete() { setDeleteError(""); setNotice(""); setDeleteOpen(true); },
    cancelDelete() { if (!deletePending) setDeleteOpen(false); },
  };
}
