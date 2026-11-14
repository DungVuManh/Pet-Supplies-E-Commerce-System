"use client";

import { Plus, Trash2 } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import { secondaryButton } from "@/components/workspace/workspace-ui";
import { MAX_VARIANTS, type VariantRow } from "../hooks/use-product-create";
import type { ProductVariantErrors, ProductVariantValues } from "../validation";

type Props = {
  variants: VariantRow[];
  errors: ProductVariantErrors[];
  listError?: string;
  unit: string;
  setVariant: (index: number, key: keyof ProductVariantValues, value: string) => void;
  formatAmount: (index: number, key: "price" | "cost") => void;
  addVariant: () => void;
  removeVariant: (index: number) => void;
};

/** The variant rows of a new product. Each row stacks its fields on narrow screens. */
export function ProductVariantsField({ variants, errors, listError, unit, setVariant, formatAmount, addVariant, removeVariant }: Props) {
  const stockLabel = unit ? `Tồn kho ban đầu (${unit.toLowerCase()})` : "Tồn kho ban đầu";
  return <div className="mt-4 space-y-4">
    <ol className="space-y-4">{variants.map((variant, index) => {
      const found = errors[index] ?? {};
      const id = (key: keyof ProductVariantValues) => `variant-${index}-${key}`;
      return <li key={variant.key} className="rounded-lg border border-line p-4">
        <fieldset className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <legend className="font-semibold">Phân loại {index + 1}</legend>
            {variants.length > 1 && <button type="button" onClick={() => removeVariant(index)} aria-label={`Xóa phân loại ${index + 1}`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-danger hover:bg-danger-subtle"><Trash2 className="h-5 w-5" aria-hidden="true" /></button>}
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <TextField id={id("label")} label="Tên phân loại" required maxLength={100} placeholder="Ví dụ: Túi 2 kg" value={variant.label} error={found.label} onChange={(e) => setVariant(index, "label", e.target.value)} />
            <TextField id={id("sku")} label="SKU" required autoCapitalize="characters" maxLength={100} placeholder="RC-MA-2KG" value={variant.sku} error={found.sku} onChange={(e) => setVariant(index, "sku", e.target.value)} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextField id={id("price")} label="Giá bán (VND)" required inputMode="numeric" value={variant.price} error={found.price} onChange={(e) => setVariant(index, "price", e.target.value)} onBlur={() => formatAmount(index, "price")} />
            <TextField id={id("cost")} label="Giá vốn (VND)" inputMode="numeric" value={variant.cost} error={found.cost} onChange={(e) => setVariant(index, "cost", e.target.value)} onBlur={() => formatAmount(index, "cost")} />
            <TextField id={id("stock")} label={stockLabel} inputMode="numeric" value={variant.stock} error={found.stock} onChange={(e) => setVariant(index, "stock", e.target.value)} />
            <TextField id={id("threshold")} label="Ngưỡng cảnh báo" inputMode="numeric" placeholder="Mặc định" value={variant.threshold} error={found.threshold} onChange={(e) => setVariant(index, "threshold", e.target.value)} />
          </div>
        </fieldset>
      </li>;
    })}</ol>
    {listError && <p role="alert" className="text-xs text-danger">{listError}</p>}
    <button id="variant-add" type="button" className={`${secondaryButton} min-h-12 w-full gap-2 sm:w-auto`} disabled={variants.length >= MAX_VARIANTS} onClick={addVariant}>
      <Plus className="h-4 w-4" aria-hidden="true" />Thêm phân loại
    </button>
    <p className="text-xs text-muted">Tối đa {MAX_VARIANTS} phân loại. Ngưỡng cảnh báo để trống sẽ dùng mặc định của hệ thống.</p>
  </div>;
}
