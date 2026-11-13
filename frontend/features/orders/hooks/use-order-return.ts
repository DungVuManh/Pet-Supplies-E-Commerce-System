// =============================================================
// features/orders/hooks/use-order-return.ts
// Hook quản lý form và quy trình gửi yêu cầu hoàn trả đơn hàng
// =============================================================

import { useCallback, useState } from "react";
import type { ReturnRequestReason } from "../types";
import { isReturnImageRequired } from "../types";
import {
  uploadReturnImagesApi,
  submitOrderReturnApi,
  OrderReturnApiError,
} from "../services/order-return.service";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;

export type OrderReturnFormErrors = {
  reason?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  description?: string;
  images?: string;
  general?: string;
};

export function useOrderReturn(orderId: string) {
  const [reason, setReason] = useState<ReturnRequestReason | "">("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<OrderReturnFormErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReasonChange = useCallback((newReason: ReturnRequestReason) => {
    setReason(newReason);
    setFieldErrors((prev) => ({ ...prev, reason: undefined, images: undefined }));
  }, []);

  const handleBankNameChange = useCallback((val: string) => {
    setBankName(val);
    setFieldErrors((prev) => ({ ...prev, bankName: undefined }));
  }, []);

  const handleAccountNumberChange = useCallback((val: string) => {
    // Chỉ giữ lại chữ và số, bỏ khoảng trắng
    const clean = val.replace(/[^a-zA-Z0-9]/g, "");
    setAccountNumber(clean);
    setFieldErrors((prev) => ({ ...prev, accountNumber: undefined }));
  }, []);

  const handleAccountHolderChange = useCallback((val: string) => {
    setAccountHolder(val.toUpperCase());
    setFieldErrors((prev) => ({ ...prev, accountHolder: undefined }));
  }, []);

  const handleDescriptionChange = useCallback((newDescription: string) => {
    setDescription(newDescription);
    setFieldErrors((prev) => ({ ...prev, description: undefined }));
  }, []);

  const handleFileSelect = useCallback((selected: FileList | File[]) => {
    const fileList = Array.from(selected);
    const totalCount = files.length + fileList.length;

    if (totalCount > MAX_FILES) {
      setFieldErrors((prev) => ({
        ...prev,
        images: `Chỉ được chọn tối đa ${MAX_FILES} hình ảnh minh chứng.`,
      }));
      return;
    }

    for (const file of fileList) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setFieldErrors((prev) => ({
          ...prev,
          images: "Chỉ chấp nhận tệp hình ảnh định dạng JPG, PNG hoặc WEBP.",
        }));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFieldErrors((prev) => ({
          ...prev,
          images: `Hình ảnh "${file.name}" vượt quá kích thước 5MB cho phép.`,
        }));
        return;
      }
    }

    const newPreviews = fileList.map((file) => URL.createObjectURL(file));
    setFiles((prev) => [...prev, ...fileList]);
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
    setFieldErrors((prev) => ({ ...prev, images: undefined }));
  }, [files.length]);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
    setFieldErrors((prev) => ({ ...prev, images: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const errors: OrderReturnFormErrors = {};

    if (!reason) {
      errors.reason = "Vui lòng chọn lý do hoàn trả hàng.";
    }

    const trimmedBankName = bankName.trim();
    if (!trimmedBankName) {
      errors.bankName = "Vui lòng nhập tên ngân hàng.";
    } else if (trimmedBankName.length < 2) {
      errors.bankName = "Tên ngân hàng tối thiểu 2 ký tự.";
    }

    const trimmedAccNum = accountNumber.trim();
    if (!trimmedAccNum) {
      errors.accountNumber = "Vui lòng nhập số tài khoản ngân hàng.";
    } else if (trimmedAccNum.length < 6 || trimmedAccNum.length > 30) {
      errors.accountNumber = "Số tài khoản ngân hàng phải từ 6 đến 30 ký tự.";
    }

    const trimmedHolder = accountHolder.trim();
    if (!trimmedHolder) {
      errors.accountHolder = "Vui lòng nhập tên chủ tài khoản.";
    } else if (trimmedHolder.length < 2) {
      errors.accountHolder = "Tên chủ tài khoản tối thiểu 2 ký tự.";
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      errors.description = "Vui lòng nhập mô tả chi tiết lý do hoàn trả.";
    } else if (trimmedDesc.length < 10) {
      errors.description = "Mô tả phải có ít nhất 10 ký tự.";
    } else if (trimmedDesc.length > 1000) {
      errors.description = "Mô tả không được vượt quá 1000 ký tự.";
    }

    if (reason && isReturnImageRequired(reason) && files.length === 0) {
      errors.images = "Lý do đã chọn bắt buộc phải có ít nhất 1 hình ảnh minh chứng.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [reason, bankName, accountNumber, accountHolder, description, files.length]);

  const submitReturn = useCallback(async () => {
    if (!validate()) return false;

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      let uploadedUrls: string[] = [];

      if (files.length > 0) {
        setIsUploading(true);
        const uploadResult = await uploadReturnImagesApi(orderId, files);
        uploadedUrls = uploadResult.urls;
        setIsUploading(false);
      }

      await submitOrderReturnApi(orderId, {
        reason: reason as ReturnRequestReason,
        bankAccount: {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim().toUpperCase(),
        },
        description: description.trim(),
        images: uploadedUrls,
      });

      setIsSuccess(true);
      return true;
    } catch (err) {
      setIsUploading(false);
      const message =
        err instanceof OrderReturnApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không thể gửi yêu cầu hoàn trả. Vui lòng thử lại.";
      setFieldErrors((prev) => ({ ...prev, general: message }));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [orderId, reason, bankName, accountNumber, accountHolder, description, files, validate]);

  return {
    reason,
    bankName,
    accountNumber,
    accountHolder,
    description,
    files,
    previewUrls,
    fieldErrors,
    isUploading,
    isSubmitting,
    isSuccess,
    handleReasonChange,
    handleBankNameChange,
    handleAccountNumberChange,
    handleAccountHolderChange,
    handleDescriptionChange,
    handleFileSelect,
    handleRemoveFile,
    submitReturn,
  };
}
