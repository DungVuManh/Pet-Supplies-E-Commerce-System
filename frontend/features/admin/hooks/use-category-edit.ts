"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { deleteCategory, updateCategory, type CategoryEdit } from "../services/categories";
import type { AdminCategoryDetail, CategoryStatus } from "../types";
import { validateCategory } from "../validation";

export type CategoryEditValues = { name: string; slug: string; order: string; parent: string; description: string; status: CategoryStatus };
type FieldName = keyof CategoryEditValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const fieldOrder: FieldName[] = ["name", "parent", "slug", "description", "order", "status"];
/** The form's field for each request field. */
const formField: Record<string, FieldName> = { name: "name", slug: "slug", parentCode: "parent", description: "description", displayOrder: "order", isActive: "status" };

const formValues = (category: AdminCategoryDetail): CategoryEditValues => ({
  name: category.name, slug: category.slug, order: category.displayOrder === null ? "" : String(category.displayOrder),
  parent: category.parentCode ?? "", description: category.description, status: category.status,
});

/** The fields that differ from the loaded category, in the shape the API takes. */
function changedFields(values: CategoryEditValues, category: AdminCategoryDetail): Omit<CategoryEdit, "expectedUpdatedAt"> {
  const loaded = formValues(category);
  return {
    ...(values.name !== loaded.name && { name: values.name.trim() }),
    ...(values.slug !== loaded.slug && { slug: values.slug.trim() }),
    ...(values.order !== loaded.order && { displayOrder: Number(values.order) }),
    ...(values.parent !== loaded.parent && { parentCode: values.parent || null }),
    ...(values.description !== loaded.description && { description: values.description.trim() }),
    ...(values.status !== loaded.status && { isActive: values.status === "active" }),
  };
}

/** Values, validation, save, and delete for the Admin category edit form. Field ids are `category-<name>`. */
export function useCategoryEdit(initialCategory: AdminCategoryDetail) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(initialCategory);
  const [category, setCategory] = useState(initialCategory);
  const [values, setValues] = useState(() => formValues(initialCategory));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Newly loaded server data replaces the form, as after a conflict.
  if (loaded !== initialCategory) {
    setLoaded(initialCategory);
    setCategory(initialCategory);
    setValues(formValues(initialCategory));
    setErrors({});
  }

  function set<K extends FieldName>(key: K, value: CategoryEditValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setNotice("");
    setFormError("");
  }

  function showErrors(found: FieldErrors) {
    setErrors(found);
    const first = fieldOrder.find((name) => found[name]);
    // After a server error the field may only be enabled again on the next render.
    if (first) requestAnimationFrame(() => document.getElementById(`category-${first}`)?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setNotice("");
    setFormError("");
    const found = validateCategory(values);
    if (Object.keys(found).length > 0) { showErrors(found); return; }
    setErrors({});

    const changes = changedFields(values, category);
    if (Object.keys(changes).length === 0) { setNotice("Không có thay đổi nào để lưu."); return; }

    setPending(true);
    try {
      const saved = await updateCategory(category.ref, { expectedUpdatedAt: category.updatedAt, ...changes });
      setCategory(saved);
      setValues(formValues(saved));
      setNotice(saved.changed ? "Đã lưu danh mục." : "Không có thay đổi nào để lưu.");
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        showErrors(Object.fromEntries(Object.entries(error.fields).map(([field, message]) => [formField[field] ?? field, message])));
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

  function askDelete() {
    setDeleteError("");
    setNotice("");
    setDeleteOpen(true);
  }

  function cancelDelete() {
    if (!deletePending) setDeleteOpen(false);
  }

  async function confirmDelete() {
    if (deletePending) return;
    setDeleteError("");
    setDeletePending(true);
    try {
      await deleteCategory(category.ref);
      router.push("/admin/categories");
    } catch (error) {
      if (error instanceof ApiError && error.code === "CATEGORY_IN_USE") {
        setDeleteOpen(false);
        setNotice(error.message);
        router.refresh();
      } else {
        setDeleteError(error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setDeletePending(false);
    }
  }

  const parentName = category.parentOptions.find((option) => option.ref === values.parent)?.name ?? category.parentName;

  return { category, values, errors, notice, formError, pending, parentName, set, submit, deleteOpen, deletePending, deleteError, askDelete, cancelDelete, confirmDelete };
}
