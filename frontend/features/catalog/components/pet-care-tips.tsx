import Link from "next/link";
import { BookOpen, Sparkles, ArrowRight } from "lucide-react";

const ARTICLES = [
  {
    id: "dinh-duong-cho-meo",
    title: "Chế độ dinh dưỡng khoa học cho chó mèo theo từng độ tuổi",
    summary:
      "Lượng protein, vitamin và khoáng chất cần thiết giúp thú cưng luôn khỏe mạnh, linh hoạt và tràn đầy năng lượng.",
    tag: "Dinh dưỡng",
    readTime: "3 phút đọc",
  },
  {
    id: "chon-cat-ve-sinh",
    title: "Bí quyết chọn cát vệ sinh và khử mùi hiệu quả cho mèo trong nhà",
    summary:
      "So sánh cát hữu cơ, bentonite và đậu nành để chọn loại an toàn, vón cục nhanh và ít bụi cho hô hấp của bé.",
    tag: "Chăm sóc",
    readTime: "4 phút đọc",
  },
  {
    id: "cham-soc-long-ve-ran",
    title: "Cách chăm sóc bộ lông bóng mượt và phòng ngừa ve rận an toàn",
    summary:
      "Lịch tắm chải định kỳ kết hợp dinh dưỡng bổ sung axit béo Omega 3-6 để giảm rụng lông và bảo vệ làn da.",
    tag: "Sức khỏe",
    readTime: "5 phút đọc",
  },
] as const;

export function PetCareTips() {
  return (
    <section aria-labelledby="pet-care-tips-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-subtle text-brand">
            <BookOpen className="size-4" />
          </span>
          <h2 id="pet-care-tips-title" className="text-xl font-semibold text-ink sm:text-2xl">
            Cẩm nang chăm sóc bé cưng
          </h2>
        </div>
        <span className="text-xs text-muted">Kinh nghiệm & lời khuyên từ chuyên gia dinh dưỡng</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ARTICLES.map((article) => (
          <article
            key={article.id}
            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition-all hover:border-brand/40 hover:bg-canvas"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2.5 py-0.5 text-xs font-semibold text-brand">
                  <Sparkles className="size-3" />
                  {article.tag}
                </span>
                <span className="text-xs text-muted">{article.readTime}</span>
              </div>
              <h3 className="mt-3 text-base font-semibold leading-snug text-ink">
                {article.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted line-clamp-3">
                {article.summary}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-line/60">
              <Link
                href="/listProduct/allProducts"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
              >
                Khám phá sản phẩm gợi ý
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
