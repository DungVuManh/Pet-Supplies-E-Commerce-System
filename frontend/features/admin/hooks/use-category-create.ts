"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { createCategory } from "../services/categories";
import { slugFromName, validateCategory } from "../validation";
import { categoryFieldErrors, focusFirstCategoryError, type CategoryValues } from "./use-category-edit";

type FieldErrors = Partial<Record<keyof CategoryValues, string>>;

const empty: CategoryValues = { name: "", slug: "", petType: "both", order: "", description: "", status: "active" };

/**
 * Values, validation, and submit for the new category page. The slug follows
 * the name until the Admin edits it, and follows again if they clear it.
 */
export function useCategoryCreate() {
  const router = useRouter();
  const [values, setValues] = useState(empty);
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  function set<K extends keyof CategoryValues>(key: K, value: CategoryValues[K]) {
    const next = { ...values, [key]: value };
    const cleared: FieldErrors = { [key]: undefined };
    if (key === "slug") setSlugEdited(value !== "");
    if (key === "name" && !slugEdited) {
      next.slug = slugFromName(String(value));
      cleared.slug = undefined;
    }
    setValues(next);
    setErrors((current) => ({ ...current, ...cleared }));
    setFormError("");
  }

  function showErrors(found: FieldErrors) {
    setErrors(found);
    focusFirstCategoryError(found);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFormError("");
    const found = validateCategory({ ...values, orderOptional: true });
    if (Object.keys(found).length > 0) { showErrors(found); return; }
    setErrors({});

    setPending(true);
    try {
      const order = values.order.trim();
      const created = await createCategory({
        name: values.name.trim(), slug: values.slug.trim(), petType: values.petType, description: values.description.trim(),
        isActive: values.status === "active", ...(order && { displayOrder: Number(order) }),
      });
      // The list shows a confirmation for this code. Stay pending: the page is about to change.
      router.push(`/admin/categories?created=${encodeURIComponent(created.ref)}`);
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) showErrors(categoryFieldErrors(error.fields));
      else setFormError(error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
    }
  }

  return { values, errors, formError, pending, set, submit };
}
