"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import { Badge, DetailList, InfoCallout, card, control, dangerButton, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { categories, childCategories, getCategory, type Category, type CategoryStatus } from "../mock/categories";
import { validateCategory, type CategoryFormValues } from "../validation";
import { AdminPageHeader } from "./admin-ui";

type Values = CategoryFormValues & { parent: string; description: string; status: CategoryStatus };
const textarea = `${control} h-auto min-h-28 py-3 leading-relaxed`;

/** Edit form for one category; `linkedProducts` and `blocker` come from the product data on the server page. */
export function CategoryEditForm({ category, linkedProducts, blocker }: { category: Category; linkedProducts: number; blocker: string | null }) {
  const initial: Values = { name: category.name, slug: category.slug, order: String(category.order), parent: category.parent ?? "", description: category.description, status: category.status };
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState("");
  const errors = submitted ? validateCategory(values) : {};
  const dirty = (Object.keys(values) as (keyof Values)[]).some((key) => values[key] !== saved[key]);
  const hasChildren = childCategories(category.code).length > 0;
  const parentOptions = categories.filter((item) => !item.parent && item.code !== category.code);

  function set<K extends keyof Values>(key: K, value: Values[K]) { setValues((current) => ({ ...current, [key]: value })); setNotice(""); }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const first = Object.keys(validateCategory(values))[0];
    if (first) { document.getElementById(`category-${first}`)?.focus(); return; }
    if (!dirty) { setNotice("Không có thay đổi nào để lưu."); return; }
    setSaved(values);
    setNotice("Đã lưu danh mục trong bản demo; dữ liệu chưa được gửi đến hệ thống.");
  }

  function remove() {
    setNotice(blocker
      ? `Không thể xóa “${category.name}”: ${blocker}. Chuyển sản phẩm sang danh mục khác trước khi xóa.`
      : `Xóa “${category.name}” chưa kết nối backend; danh mục vẫn được giữ nguyên.`);
  }

  return <>
    <AdminPageHeader breadcrumbs={["Danh mục", "Chỉnh sửa danh mục"]} title="Chỉnh sửa danh mục" subtitle={`${category.code} · ${category.name}`}
      actions={<>
        <Link href="/admin/categories" className={`${secondaryButton} min-h-12`}>Hủy</Link>
        <button type="submit" form="category-edit-form" className={`${primaryLink} min-h-12 px-8`}>Lưu danh mục</button>
      </>} />
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form id="category-edit-form" noValidate onSubmit={submit} aria-labelledby="category-form-title" className={`${card} min-w-0 p-6`}>
        <h2 id="category-form-title" className="text-xl font-semibold">Thông tin danh mục</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="category-name" label="Tên danh mục" required value={values.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />
          <TextField id="category-code" label="Mã danh mục" value={category.code} disabled readOnly />
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <label htmlFor="category-parent" className="text-sm font-medium">Danh mục cha</label>
            <select id="category-parent" className={control} value={values.parent} disabled={hasChildren} aria-describedby={hasChildren ? "category-parent-hint" : undefined}
              onChange={(e) => set("parent", e.target.value)}>
              <option value="">Không có (danh mục gốc)</option>
              {parentOptions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
            </select>
            {hasChildren && <p id="category-parent-hint" className="text-xs text-muted">Danh mục đang có danh mục con nên phải là danh mục gốc.</p>}
          </div>
          <div className="sm:col-span-2"><TextField id="category-slug" label="Đường dẫn" value={values.slug} error={errors.slug} onChange={(e) => set("slug", e.target.value)} /></div>
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <label htmlFor="category-description" className="text-sm font-medium">Mô tả</label>
            <textarea id="category-description" className={textarea} value={values.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <TextField id="category-order" label="Thứ tự hiển thị" inputMode="numeric" value={values.order} error={errors.order} onChange={(e) => set("order", e.target.value)} />
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="category-status" className="text-sm font-medium">Trạng thái</label>
            <select id="category-status" className={control} value={values.status} onChange={(e) => set("status", e.target.value as CategoryStatus)}>
              <option value="Hiển thị">Hiển thị</option><option value="Đã ẩn">Đã ẩn</option>
            </select>
          </div>
        </div>
      </form>

      <aside className="min-w-0 space-y-6" aria-label="Thông tin liên kết và xóa danh mục">
        <section aria-labelledby="category-links" className={`${card} p-6`}>
          <h2 id="category-links" className="text-xl font-semibold">Thông tin liên kết</h2>
          <div className="mt-4"><Badge>{values.parent ? "Danh mục con" : "Danh mục gốc"}</Badge></div>
          <div className="mt-2"><DetailList items={[
            { label: "Danh mục cha", value: values.parent ? getCategory(values.parent)?.name : "—" },
            { label: "Sản phẩm liên kết", value: `${linkedProducts} sản phẩm` },
            { label: "Cập nhật gần nhất", value: category.updatedAt },
          ]} /></div>
        </section>
        {blocker && <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title="Không thể xóa danh mục">
          Danh mục {blocker}. {linkedProducts > 0 ? "Chuyển sản phẩm sang danh mục khác trước khi xóa." : "Xóa hoặc chuyển các danh mục con trước."}
        </InfoCallout>}
        <button type="button" className={`${dangerButton} min-h-12 w-full`} onClick={remove}>Xóa danh mục</button>
      </aside>
    </div>
  </>;
}
