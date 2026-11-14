"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { listCategories } from "../services/categories";
import { deleteProduct, getProductOptions, updateProduct, type ProductEdit } from "../services/products";
import type { AdminCategoryRow, AdminProductDetail, ProductOptions } from "../types";
import { parseAmount, validateProduct } from "../validation";

export type ProductEditValues = {
  name: string; sku: string; brand: string; petType: string; description: string; components: string; unit: string; categoryCodes: string[];
  price: string; cost: string; stock: string; threshold: string; visibility: "active" | "hidden";
  /** Photo URLs, main photo first. */
  images: string[];
};
type FieldName = keyof ProductEditValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const fieldOrder: FieldName[] = ["name", "sku", "brand", "categoryCodes", "petType", "description", "components", "price", "cost", "stock", "unit", "threshold", "images", "visibility"];
/** The form's field for each request field. */
const formField: Record<string, FieldName> = { lowStockThreshold: "threshold", isActive: "visibility", expectedStock: "stock" };

export const formatAmount = (value: number) => value.toLocaleString("vi-VN");

const formValues = (product: AdminProductDetail): ProductEditValues => ({
  name: product.name, sku: product.sku, brand: product.brand, petType: product.petType, description: product.description, components: product.components ?? "", unit: product.unit,
  categoryCodes: product.categories.map((category) => category.ref),
  price: formatAmount(product.price), cost: product.cost === null ? "" : formatAmount(product.cost), stock: String(product.stock),
  threshold: product.ownThreshold === null ? "" : String(product.ownThreshold), visibility: product.isActive ? "active" : "hidden",
  images: product.images,
});

const sameList = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
// Order matters for photos: the first one is the main photo.
const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((item, index) => item === b[index]);
const optional = (text: string) => (text.trim() ? parseAmount(text) : null);

/** Only the fields that differ from the loaded product, so an unrelated save never touches stock or SKU. */
function changedFields(values: ProductEditValues, product: AdminProductDetail): ProductEdit {
  const loaded = formValues(product);
  return {
    ...(values.name !== loaded.name && { name: values.name.trim() }),
    ...(values.sku !== loaded.sku && { sku: values.sku.trim() }),
    ...(values.brand !== loaded.brand && { brand: values.brand }),
    ...(values.petType !== loaded.petType && { petType: values.petType }),
    ...(values.description !== loaded.description && { description: values.description.trim() }),
    ...(values.components !== loaded.components && { components: values.components.trim() }),
    ...(values.unit !== loaded.unit && { unit: values.unit }),
    ...(!sameList(values.categoryCodes, loaded.categoryCodes) && { categoryCodes: values.categoryCodes }),
    ...(parseAmount(values.price) !== product.price && { price: parseAmount(values.price) }),
    ...(optional(values.cost) !== product.cost && { cost: optional(values.cost) }),
    ...(parseAmount(values.stock) !== product.stock && { stock: parseAmount(values.stock), expectedStock: product.stock }),
    ...(optional(values.threshold) !== product.ownThreshold && { lowStockThreshold: optional(values.threshold) }),
    ...(values.visibility !== loaded.visibility && { isActive: values.visibility === "active" }),
    ...(!sameOrder(values.images, loaded.images) && { images: values.images }),
  };
}

/** Values, options, validation, save, and delete for the Admin product edit form. Field ids are `product-<name>`. */
export function useProductEdit(initialProduct: AdminProductDetail) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(initialProduct);
  const [product, setProduct] = useState(initialProduct);
  const [values, setValues] = useState(() => formValues(initialProduct));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [options, setOptions] = useState<ProductOptions>({ petTypes: [], brands: [], units: [] });
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Newly loaded server data replaces the form, as after a conflict.
  if (loaded !== initialProduct) {
    setLoaded(initialProduct);
    setProduct(initialProduct);
    setValues(formValues(initialProduct));
    setErrors({});
  }

  useEffect(() => {
    const controller = new AbortController();
    // The form still works without these lists: the current values stay selectable.
    getProductOptions(controller.signal).then(setOptions, () => {});
    listCategories({ q: "", status: "all", page: 1, pageSize: 100 }, controller.signal).then((data) => setCategories(data.items), () => {});
    return () => controller.abort();
  }, []);

  function set<K extends FieldName>(key: K, value: ProductEditValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setNotice("");
    setFormError("");
  }

  function toggleCategory(ref: string) {
    set("categoryCodes", values.categoryCodes.includes(ref) ? values.categoryCodes.filter((item) => item !== ref) : [...values.categoryCodes, ref]);
  }

  /** Shows money as "450.000" once the field loses focus; invalid text is left for the error message. */
  function formatOnBlur(key: "price" | "cost") {
    const parsed = parseAmount(values[key]);
    if (!Number.isNaN(parsed)) set(key, formatAmount(parsed));
  }

  function showErrors(found: FieldErrors) {
    setErrors(found);
    const first = fieldOrder.find((name) => found[name]);
    // After a server error the field may only be enabled again on the next render.
    if (first) requestAnimationFrame(() => document.getElementById(`product-${first}`)?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setNotice("");
    setFormError("");
    const found = validateProduct({ ...values, skuChanged: values.sku !== product.sku });
    if (Object.keys(found).length > 0) { showErrors(found); return; }
    setErrors({});

    const changes = changedFields(values, product);
    if (Object.keys(changes).length === 0) { setNotice("Không có thay đổi nào để lưu."); return; }

    setPending(true);
    try {
      const saved = await updateProduct(product.sku, changes);
      setProduct(saved);
      setValues(formValues(saved));
      setNotice(saved.changed ? "Đã lưu sản phẩm." : "Không có thay đổi nào để lưu.");
      if (saved.sku !== product.sku) router.replace(`/admin/products/${encodeURIComponent(saved.sku)}/edit`);
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
      await deleteProduct(product.sku);
      router.push("/admin/products");
    } catch (error) {
      if (error instanceof ApiError && error.code === "PRODUCT_HAS_ORDERS") {
        setDeleteOpen(false);
        setNotice(error.message);
      } else {
        setDeleteError(error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setDeletePending(false);
    }
  }

  return { product, values, errors, notice, formError, pending, options, categories, set, toggleCategory, formatOnBlur, submit, deleteOpen, deletePending, deleteError, askDelete, cancelDelete, confirmDelete };
}
