"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { deleteCategory, updateCategory, type CategoryEdit } from "../services/categories";
import type { AdminCategoryDetail, CategoryPetType, CategoryStatus } from "../types";
import { validateCategory } from "../validation";

/** The values of the new and edit category forms. */
export type CategoryValues = { name: string; slug: string; petType: CategoryPetType; order: string; description: string; status: CategoryStatus };
type FieldName = keyof CategoryValues;
type FieldErrors = Partial<Record<FieldName, string>>;

/** Fields in the order they appear, so the first error gets the focus. */
export const categoryFieldOrder: FieldName[] = ["name", "slug", "description", "petType", "order", "status"];
/** The form's field for each request field. */
export const categoryFormField: Record<string, FieldName> = { displayOrder: "order", isActive: "status" };

/** Moves focus to the first field with an error. After a server error the field may only be enabled on the next render. */
export function focusFirstCategoryError(found: FieldErrors) {
  const first = categoryFieldOrder.find((name) => found[name]);
  if (first) requestAnimationFrame(() => document.getElementById(`category-${first}`)?.focus());
}

/** Server field errors under the form's field names. */
export const categoryFieldErrors = (fields: Record<string, string>): FieldErrors =>
  Object.fromEntries(Object.entries(fields).map(([field, message]) => [categoryFormField[field] ?? field, message]));

const formValues = (category: AdminCategoryDetail): CategoryValues => ({
  name: category.name, slug: category.slug, petType: category.petType, order: category.displayOrder === null ? "" : String(category.displayOrder),
  description: category.description, status: category.status,
});

/** The fields that differ from the loaded category, in the shape the API takes. */
function changedFields(values: CategoryValues, category: AdminCategoryDetail): Omit<CategoryEdit, "expectedUpdatedAt"> {
  const loaded = formValues(category);
  return {
    ...(values.name !== loaded.name && { name: values.name.trim() }),
    ...(values.slug !== loaded.slug && { slug: values.slug.trim() }),
    ...(values.petType !== loaded.petType && { petType: values.petType }),
    ...(values.order !== loaded.order && { displayOrder: Number(values.order) }),
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

  function set<K extends FieldName>(key: K, value: CategoryValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setNotice("");
    setFormError("");
  }

  function showErrors(found: FieldErrors) {
    setErrors(found);
    focusFirstCategoryError(found);
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
        showErrors(categoryFieldErrors(error.fields));
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

  return { category, values, errors, notice, formError, pending, set, submit, deleteOpen, deletePending, deleteError, askDelete, cancelDelete, confirmDelete };
}
