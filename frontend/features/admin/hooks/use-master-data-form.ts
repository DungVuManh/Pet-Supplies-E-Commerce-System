"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { createMasterData, deleteMasterData, getMasterData, updateMasterData, type MasterDataFields } from "../services/master-data";
import { getProductOptions } from "../services/products";
import type { MasterDataDetail, MasterDataKind, MasterDataStatus } from "../types";
import { parseAmount, validateMasterData } from "../validation";

export type MasterDataValues = { name: string; description: string; petTypeCode: string; fee: string; status: MasterDataStatus };
type FieldName = keyof MasterDataValues;
type FieldErrors = Partial<Record<FieldName, string>>;
type Option = { code: string; name: string };

/** `closed`, a new row of the tab's kind, or an existing row (`row` is null while it loads). */
type Mode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; code: string; row: MasterDataDetail | null };

const fieldOrder: FieldName[] = ["petTypeCode", "name", "description", "fee", "status"];
const empty: MasterDataValues = { name: "", description: "", petTypeCode: "", fee: "", status: "active" };
const unknownError = "Đã có lỗi xảy ra. Vui lòng thử lại.";
const message = (error: unknown) => (error instanceof ApiError ? error.message : unknownError);

const formValues = (row: MasterDataDetail): MasterDataValues => ({
  name: row.name, description: row.description, petTypeCode: row.petTypeCode ?? "",
  fee: row.fee === null ? "" : row.fee.toLocaleString("vi-VN"), status: row.status,
});

/** Every field the kind has, for a new row. */
function allFields(kind: MasterDataKind, values: MasterDataValues): MasterDataFields {
  return {
    name: values.name.trim(), description: values.description.trim(), isActive: values.status === "active",
    ...(kind === "breed" && { petTypeCode: values.petTypeCode }),
    ...(kind === "shippingMethod" && { fee: parseAmount(values.fee) }),
  };
}

/** Only what differs from the loaded row. */
function changedFields(kind: MasterDataKind, values: MasterDataValues, row: MasterDataDetail): MasterDataFields {
  const next = allFields(kind, values);
  const loaded = allFields(kind, formValues(row));
  return Object.fromEntries(Object.entries(next).filter(([key, value]) => loaded[key as keyof MasterDataFields] !== value));
}

/**
 * The add/edit modal of the master data screen. `onSaved` gets a confirmation
 * to show on the page, after which the list should reload. `createdCode` is set
 * after a create, so the list can show the new row, which may be on a later page.
 */
export function useMasterDataForm(kind: MasterDataKind, onSaved: (notice: string, createdCode?: string) => void) {
  const [mode, setMode] = useState<Mode>({ kind: "closed" });
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [petTypes, setPetTypes] = useState<Option[]>([]);
  const row = mode.kind === "edit" ? mode.row : null;

  // Breeds need the active pet types; the list is fetched when a breed modal opens.
  const needsPetTypes = kind === "breed" && mode.kind !== "closed";
  useEffect(() => {
    if (!needsPetTypes) return;
    const controller = new AbortController();
    getProductOptions(controller.signal).then((options) => setPetTypes(options.petTypes), () => {});
    return () => controller.abort();
  }, [needsPetTypes]);

  function reset(next: MasterDataValues) {
    setValues(next);
    setErrors({});
    setFormError("");
    setConfirmingDelete(false);
  }

  function openCreate() {
    reset(empty);
    setMode({ kind: "create" });
  }

  async function load(code: string) {
    setMode({ kind: "edit", code, row: null });
    try {
      const loaded = await getMasterData(kind, code);
      setMode({ kind: "edit", code, row: loaded });
      setValues(formValues(loaded));
    } catch (error) {
      setFormError(message(error));
    }
  }

  function openEdit(code: string) {
    reset(empty);
    void load(code);
  }

  function close() {
    if (!pending) setMode({ kind: "closed" });
  }

  function set<K extends FieldName>(key: K, value: MasterDataValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setFormError("");
  }

  function showErrors(found: FieldErrors) {
    setErrors(found);
    const first = fieldOrder.find((name) => found[name]);
    if (first) requestAnimationFrame(() => document.getElementById(`master-${first}`)?.focus());
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (pending || mode.kind === "closed" || (mode.kind === "edit" && !row)) return;
    setFormError("");
    const found = validateMasterData({ kind, ...values });
    if (Object.keys(found).length > 0) { showErrors(found); return; }

    setPending(true);
    try {
      if (mode.kind === "create") {
        const created = await createMasterData(kind, allFields(kind, values));
        setMode({ kind: "closed" });
        onSaved(`Đã thêm ${created.code} · ${created.name}. Danh sách đang lọc theo mã mới; xóa ô tìm kiếm rồi chọn “Lọc dữ liệu” để xem tất cả.`, created.code);
      } else if (row) {
        const changes = changedFields(kind, values, row);
        if (Object.keys(changes).length === 0) { setFormError("Không có thay đổi nào để lưu."); return; }
        const saved = await updateMasterData(kind, row.code, { expectedUpdatedAt: row.updatedAt, ...changes });
        setMode({ kind: "closed" });
        onSaved(`Đã lưu ${saved.code} · ${saved.name}.`);
      }
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        showErrors(Object.fromEntries(Object.entries(error.fields).map(([field, text]) => [field === "isActive" ? "status" : field, text])));
      } else {
        setFormError(message(error));
        // Someone else saved first: show their version, keeping the modal open.
        if (error instanceof ApiError && error.code === "STALE_MASTER_DATA" && row) void load(row.code);
      }
    } finally {
      setPending(false);
    }
  }

  function askDelete() {
    setFormError("");
    setConfirmingDelete(true);
  }

  function cancelDelete() {
    if (!pending) setConfirmingDelete(false);
  }

  async function confirmDelete() {
    if (pending || !row) return;
    setPending(true);
    try {
      await deleteMasterData(kind, row.code);
      setMode({ kind: "closed" });
      onSaved(`Đã xóa ${row.code} · ${row.name}.`);
    } catch (error) {
      setConfirmingDelete(false);
      setFormError(message(error));
    } finally {
      setPending(false);
    }
  }

  // A breed whose pet type was deactivated keeps it selectable, so editing it does not change it by accident.
  const petTypeOptions = row?.petTypeCode && !petTypes.some((option) => option.code === row.petTypeCode)
    ? [...petTypes, { code: row.petTypeCode, name: `${row.petTypeCode} (ngừng dùng)` }]
    : petTypes;

  return {
    open: mode.kind !== "closed", creating: mode.kind === "create", loading: mode.kind === "edit" && !row, row,
    values, errors, formError, pending, petTypeOptions, confirmingDelete,
    openCreate, openEdit, close, set, submit, askDelete, cancelDelete, confirmDelete,
  };
}
