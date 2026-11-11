"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { createBrand, deleteBrand, updateBrand, type BrandFields } from "../services/brands";
import type { MasterDataDetail, MasterDataStatus } from "../types";
import { validateMasterData } from "../validation";

export type BrandValues = { name: string; description: string; status: MasterDataStatus };
type FieldName = keyof BrandValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const fieldOrder: FieldName[] = ["name", "description", "status"];
const empty: BrandValues = { name: "", description: "", status: "active" };
const formValues = (brand: MasterDataDetail): BrandValues => ({ name: brand.name, description: brand.description, status: brand.status });
const message = (error: unknown) => (error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");

function fields(values: BrandValues): Required<BrandFields> {
  return { name: values.name.trim(), description: values.description.trim(), isActive: values.status === "active" };
}

/**
 * The new and edit brand pages. `initialBrand` is null on the new page. A saved
 * brand returns to the list, which confirms it from `?saved=<code>`.
 */
export function useBrandForm(initialBrand: MasterDataDetail | null) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(initialBrand);
  const [brand, setBrand] = useState(initialBrand);
  const [values, setValues] = useState(() => (initialBrand ? formValues(initialBrand) : empty));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Newly loaded server data replaces the form, as after a conflict.
  if (loaded !== initialBrand) {
    setLoaded(initialBrand);
    setBrand(initialBrand);
    setValues(initialBrand ? formValues(initialBrand) : empty);
    setErrors({});
  }

  function set<K extends FieldName>(key: K, value: BrandValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setNotice("");
    setFormError("");
  }

  function showErrors(found: FieldErrors) {
    setErrors(found);
    const first = fieldOrder.find((name) => found[name]);
    if (first) requestAnimationFrame(() => document.getElementById(`brand-${first}`)?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setNotice("");
    setFormError("");
    const found = validateMasterData({ kind: "brand", ...values, petTypeCode: "", fee: "" });
    if (Object.keys(found).length > 0) { showErrors(found as FieldErrors); return; }
    setErrors({});

    let changes: BrandFields = fields(values);
    if (brand) {
      const before = fields(formValues(brand));
      changes = Object.fromEntries(Object.entries(changes).filter(([key, value]) => before[key as keyof BrandFields] !== value));
      if (Object.keys(changes).length === 0) { setNotice("Không có thay đổi nào để lưu."); return; }
    }

    setPending(true);
    try {
      const saved = brand ? await updateBrand(brand.code, { expectedUpdatedAt: brand.updatedAt, ...changes }) : await createBrand(changes);
      // Stay pending: the page is about to change.
      router.push(`/admin/brands?saved=${encodeURIComponent(saved.code)}`);
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        showErrors(Object.fromEntries(Object.entries(error.fields).map(([field, text]) => [field === "isActive" ? "status" : field, text])));
      } else if (error instanceof ApiError && error.code === "STALE_MASTER_DATA") {
        setNotice(error.message);
        router.refresh();
      } else {
        setFormError(message(error));
      }
    }
  }

  function askDelete() {
    setDeleteError("");
    setNotice("");
    setDeleteOpen(true);
  }

  function cancelDelete() {
    if (!deletePending) setDeleteOpen(false);
  }

  async function confirmDelete() {
    if (deletePending || !brand) return;
    setDeleteError("");
    setDeletePending(true);
    try {
      await deleteBrand(brand.code);
      router.push("/admin/brands");
    } catch (error) {
      if (error instanceof ApiError && error.code === "MASTER_DATA_IN_USE") {
        setDeleteOpen(false);
        setNotice(error.message);
        router.refresh();
      } else {
        setDeleteError(message(error));
      }
    } finally {
      setDeletePending(false);
    }
  }

  return { brand, values, errors, notice, formError, pending, set, submit, deleteOpen, deletePending, deleteError, askDelete, cancelDelete, confirmDelete };
}
