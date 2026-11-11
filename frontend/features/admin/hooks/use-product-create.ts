"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import type { ProductBasicValues } from "../components/product-form-fields";
import { listCategories } from "../services/categories";
import { createProduct, getProductOptions } from "../services/products";
import type { AdminCategoryRow, ProductOptions } from "../types";
import { parseAmount, validateProductCreate, type ProductVariantErrors, type ProductVariantValues } from "../validation";
import { formatAmount } from "./use-product-edit";

export const MAX_VARIANTS = 20;

/** A variant row; `key` keeps React rows stable when one is removed. */
export type VariantRow = ProductVariantValues & { key: number };
export type ProductCreateValues = ProductBasicValues & { visibility: "active" | "hidden" };
type BasicField = keyof ProductCreateValues;
type BasicErrors = Partial<Record<BasicField | "variants", string>>;

const basicOrder: BasicField[] = ["name", "brand", "categoryCodes", "petType", "description", "unit", "visibility"];
const variantOrder: (keyof ProductVariantValues)[] = ["label", "sku", "price", "cost", "stock", "threshold"];
/** The form's field for each request field of a variant. */
const variantField: Record<string, keyof ProductVariantValues> = { lowStockThreshold: "threshold" };
const emptyVariant = (key: number): VariantRow => ({ key, label: "", sku: "", price: "", cost: "", stock: "0", threshold: "" });
const initial: ProductCreateValues = { name: "", brand: "", petType: "dog", description: "", unit: "", categoryCodes: [], visibility: "active" };

const optionalAmount = (text: string) => (text.trim() ? parseAmount(text) : undefined);

/** Values, per-row validation, and submit for the new product page. Field ids are `product-<name>` and `variant-<row>-<name>`. */
export function useProductCreate() {
  const router = useRouter();
  const nextKey = useRef(1);
  const [values, setValues] = useState(initial);
  const [variants, setVariants] = useState<VariantRow[]>(() => [emptyVariant(0)]);
  const [errors, setErrors] = useState<BasicErrors>({});
  const [variantErrors, setVariantErrors] = useState<ProductVariantErrors[]>([]);
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [options, setOptions] = useState<ProductOptions>({ petTypes: [], brands: [], units: [] });
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    getProductOptions(controller.signal).then(setOptions, () => {});
    listCategories({ q: "", status: "all", page: 1, pageSize: 100 }, controller.signal).then((data) => setCategories(data.items), () => {});
    return () => controller.abort();
  }, []);

  function set<K extends BasicField>(key: K, value: ProductCreateValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setFormError("");
  }

  function toggleCategory(ref: string) {
    set("categoryCodes", values.categoryCodes.includes(ref) ? values.categoryCodes.filter((item) => item !== ref) : [...values.categoryCodes, ref]);
  }

  function setVariant(index: number, key: keyof ProductVariantValues, value: string) {
    setVariants((rows) => rows.map((row, at) => (at === index ? { ...row, [key]: key === "sku" ? value.toUpperCase() : value } : row)));
    setVariantErrors((rows) => rows.map((row, at) => (at === index ? { ...row, [key]: undefined } : row)));
    setFormError("");
  }

  /** Shows money as "450.000" once the field loses focus; invalid text is left for the error message. */
  function formatVariantAmount(index: number, key: "price" | "cost") {
    const parsed = parseAmount(variants[index][key]);
    if (!Number.isNaN(parsed)) setVariant(index, key, formatAmount(parsed));
  }

  function addVariant() {
    if (variants.length >= MAX_VARIANTS) return;
    const key = nextKey.current++;
    setVariants((rows) => [...rows, emptyVariant(key)]);
    setErrors((current) => ({ ...current, variants: undefined }));
    requestAnimationFrame(() => document.getElementById(`variant-${variants.length}-label`)?.focus());
  }

  function removeVariant(index: number) {
    if (variants.length <= 1) return;
    setVariants((rows) => rows.filter((_, at) => at !== index));
    setVariantErrors((rows) => rows.filter((_, at) => at !== index));
  }

  function showErrors(basic: BasicErrors, rows: ProductVariantErrors[]) {
    setErrors(basic);
    setVariantErrors(rows);
    const first = basicOrder.find((name) => basic[name]);
    const row = rows.findIndex((found) => Object.keys(found).some((key) => found[key as keyof ProductVariantErrors]));
    const id = first ? `product-${first}`
      : row >= 0 ? `variant-${row}-${variantOrder.find((key) => rows[row][key])}`
      : basic.variants ? "variant-add" : null;
    if (id) requestAnimationFrame(() => document.getElementById(id)?.focus());
  }

  /** Server errors such as `variants.1.sku` go to that row; `isActive` is the visibility select. */
  function showServerErrors(fields: Record<string, string>) {
    const basic: BasicErrors = {};
    const rows: ProductVariantErrors[] = variants.map(() => ({}));
    for (const [field, message] of Object.entries(fields)) {
      const match = /^variants\.(\d+)\.(\w+)$/.exec(field);
      if (match && rows[Number(match[1])]) rows[Number(match[1])][variantField[match[2]] ?? (match[2] as keyof ProductVariantValues)] = message;
      else basic[(field === "isActive" ? "visibility" : field) as BasicField] = message;
    }
    showErrors(basic, rows);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFormError("");
    const checked = validateProductCreate({ ...values, variants });
    if (!checked.valid) { showErrors(checked.errors, checked.variants); return; }
    showErrors({}, []);

    setPending(true);
    try {
      const created = await createProduct({
        name: values.name.trim(), brand: values.brand, petType: values.petType, categoryCodes: values.categoryCodes,
        description: values.description.trim(), unit: values.unit, isActive: values.visibility === "active", images: [],
        variants: variants.map((row) => ({
          label: row.label.trim(), sku: row.sku.trim(), price: parseAmount(row.price),
          cost: optionalAmount(row.cost), stock: optionalAmount(row.stock) ?? 0, lowStockThreshold: optionalAmount(row.threshold),
        })),
      });
      // Stay pending: the page is about to change.
      router.push(`/admin/products/${encodeURIComponent(created.sku)}`);
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) showServerErrors(error.fields);
      else setFormError(error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
    }
  }

  return {
    values, variants, errors, variantErrors, formError, pending, options, categories,
    set, toggleCategory, setVariant, formatVariantAmount, addVariant, removeVariant, submit,
  };
}
