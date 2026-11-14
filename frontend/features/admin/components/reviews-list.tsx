"use client";

import Image from "next/image";
import Link from "next/link";
import { CircleX, MessageSquareText, Star, Trash2 } from "lucide-react";
import { Field, ListState, Pagination, card, control, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatDateTime } from "@/lib/format";
import { useReviewsList } from "../hooks/use-reviews-list";
import type { AdminReviewRow, ReviewRatingFilter } from "../types";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { ProductImage } from "./product-image";

const ratingOptions: { value: ReviewRatingFilter; label: string }[] = [
  { value: "all", label: "Tất cả số sao" },
  ...[5, 4, 3, 2, 1].map((stars) => ({ value: String(stars) as ReviewRatingFilter, label: `${stars} sao` })),
];

const MINUTE = 60_000;
const units: [number, string][] = [[365 * 24 * 60, "năm"], [30 * 24 * 60, "tháng"], [7 * 24 * 60, "tuần"], [24 * 60, "ngày"], [60, "giờ"], [1, "phút"]];

/** "3 giờ trước", like YouTube's comment list; anything under a minute is "Vừa xong". */
function timeAgo(value: string, now: number) {
  const minutes = Math.floor((now - new Date(value).getTime()) / MINUTE);
  const unit = units.find(([size]) => minutes >= size);
  return unit ? `${Math.floor(minutes / unit[0])} ${unit[1]} trước` : "Vừa xong";
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <Image src={url} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  return <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle font-semibold text-brand">
    {name.trim().split(/\s+/).at(-1)?.[0]?.toLocaleUpperCase("vi") ?? "?"}
  </span>;
}

function Stars({ rating }: { rating: number }) {
  return <span className="flex items-center gap-0.5" role="img" aria-label={`${rating} trên 5 sao`}>
    {[1, 2, 3, 4, 5].map((star) => <Star key={star} aria-hidden="true" strokeWidth={1.6}
      className={`h-4 w-4 ${star <= rating ? "fill-warning text-warning" : "text-line"}`} />)}
  </span>;
}

function ReviewCell({ review, now, onDelete }: { review: AdminReviewRow; now: number; onDelete: () => void }) {
  return <div className="flex items-start gap-4">
    <Avatar name={review.customer.name} url={review.customer.avatarUrl} />
    <div className="min-w-0 flex-1">
      <p className="text-sm">
        <span className="font-semibold">{review.customer.name}</span>
        <span className="text-muted"> · <time dateTime={review.createdAt} title={formatDateTime(review.createdAt)}>{timeAgo(review.createdAt, now)}</time>{review.edited && " (đã sửa)"}</span>
      </p>
      <div className="mt-1"><Stars rating={review.rating} /></div>
      {review.comment
        ? <p className="mt-2 whitespace-pre-line break-words">{review.comment}</p>
        : <p className="mt-2 text-sm italic text-muted">Không có nội dung</p>}
      {review.images.length > 0 && <ul className="mt-3 flex gap-2" aria-label="Ảnh đánh giá">{review.images.map((src, index) => <li key={src}>
        <a href={src} target="_blank" rel="noreferrer" className="block" aria-label={`Mở ảnh ${index + 1} trong tab mới`}>
          <Image src={src} alt="" width={64} height={64} className="h-16 w-16 rounded-lg bg-canvas object-cover" />
        </a>
      </li>)}</ul>}
      <button type="button" onClick={onDelete} aria-label={`Xóa đánh giá của ${review.customer.name}`}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-danger-subtle">
        <Trash2 className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />Xóa
      </button>
    </div>
  </div>;
}

function ProductCell({ product }: { product: AdminReviewRow["product"] }) {
  if (!product) return <p className="text-sm italic text-muted">Sản phẩm đã bị xóa</p>;
  const body = <>
    <ProductImage src={product.image ?? undefined} alt="" sizes="96px" className="h-16 w-24 shrink-0" />
    <span className="min-w-0">
      <span className="line-clamp-2 font-medium group-hover:text-brand group-hover:underline">{product.name}</span>
      {product.sku && <span className="mt-1 block text-xs text-muted">{product.sku}</span>}
    </span>
  </>;
  // A product with no variants has no Admin page to open.
  return product.sku
    ? <Link href={`/admin/products/${encodeURIComponent(product.sku)}`} className="group flex items-start gap-3">{body}</Link>
    : <div className="flex items-start gap-3">{body}</div>;
}

export function ReviewsList() {
  const { draft, setDraft, submit, reset, reload, items, state, error, page, setPage, pagination, from, to, now, deleting, pending, deleteError, notice, askDelete, cancelDelete, confirmDelete } = useReviewsList();

  return <>
    <form onSubmit={submit} className="grid items-end gap-4 md:grid-cols-[minmax(0,360px)_200px_auto] md:justify-start" aria-label="Bộ lọc đánh giá">
      <Field label="Tìm kiếm" htmlFor="review-filter-query"><input id="review-filter-query" type="search" className={control} placeholder="Nội dung, khách hàng hoặc sản phẩm" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} /></Field>
      <Field label="Số sao" htmlFor="review-filter-rating"><select id="review-filter-rating" className={control} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: e.target.value as ReviewRatingFilter })}>
        {ratingOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></Field>
      <button type="submit" className={`${secondaryButton} min-h-12`}>Lọc dữ liệu</button>
    </form>
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    {/* A list, not the shared table: on a phone the product moves above the review instead of scrolling sideways. */}
    <section className={`${card} min-w-0 overflow-hidden`} aria-label="Danh sách đánh giá của khách hàng">
      <div aria-hidden="true" className="hidden bg-canvas px-6 py-4 text-sm font-semibold md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-6">
        <span>Đánh giá</span><span>Sản phẩm</span>
      </div>
      {state ? <div className="border-t border-line px-6">
        {state === "empty" && <ListState kind="empty" columns={2} icon={<MessageSquareText className="h-8 w-8" strokeWidth={1.5} />} title="Không tìm thấy đánh giá"
          description="Không có đánh giá khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bỏ bộ lọc để xem toàn bộ đánh giá."
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reset}>Xóa bộ lọc</button>} />}
        {state === "loading" && <ListState kind="loading" columns={2} title="Đang tải đánh giá..." />}
        {state === "error" && <ListState kind="error" columns={2} icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải đánh giá"
          description={error?.message ?? "Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."}
          action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reload}>Thử lại</button>} />}
      </div> : <ul>{items.map((review) => <li key={review.id} className="grid gap-4 border-t border-line px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_340px] md:gap-6">
        <div className="min-w-0 md:order-2"><ProductCell product={review.product} /></div>
        <div className="min-w-0 md:order-1"><ReviewCell review={review} now={now} onDelete={() => askDelete(review)} /></div>
      </li>)}</ul>}
      {!state && <Pagination from={from} to={to} total={pagination.total} page={page} pages={pagination.totalPages} onPage={setPage} />}
    </section>

    <AdminConfirmDialog open={Boolean(deleting)} danger pending={pending} error={deleteError} onConfirm={confirmDelete} onClose={cancelDelete}
      title="Xóa đánh giá?" confirmLabel="Xóa đánh giá"
      description={`Đánh giá ${deleting?.rating ?? ""} sao của ${deleting?.customer.name ?? ""}${deleting?.product ? ` về “${deleting.product.name}”` : ""} sẽ bị xóa vĩnh viễn và điểm đánh giá của sản phẩm được tính lại. Khách hàng không nhận được thông báo.`} />
  </>;
}
