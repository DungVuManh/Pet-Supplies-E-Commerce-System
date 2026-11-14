// =============================================================
// features/catalog/components/cardDetailProduct/types.ts
// Định nghĩa kiểu dữ liệu cho tính năng Chi tiết sản phẩm & Đánh giá
// =============================================================

import type { Product, ProductVariantItem } from "../../products";

export type { Product, ProductVariantItem };

export type ProductDetailProps = {
  product: Product;
};

// Đánh giá sản phẩm
export type ReviewItem = {
  _id: string;
  rating: number;
  authorName: string;
  isVerifiedPurchase: boolean;
  date: string;
  comment: string;
  images: string[];
};

export type RatingBreakdownItem = {
  count: number;
  percentage: number;
};

export type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<string, RatingBreakdownItem>;
};

export type GetProductReviewsResponse = {
  success: boolean;
  data: {
    summary: ReviewSummary;
    reviews: ReviewItem[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalReviews: number;
      limit: number;
    };
  };
};
