// =============================================================
// features/staff/products/types.ts
// Định nghĩa kiểu dữ liệu cho sản phẩm và đánh giá sản phẩm phía Staff
// =============================================================

export type ProductStatus = "active" | "hidden";

export type ProductSnapshot = {
  physical: number;
  reserved: number;
  status: ProductStatus;
  description: string;
};

export type StaffProductDetail = ProductSnapshot & {
  productId: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  weight: string;
  price: number;
  availableStock: number;
  threshold: number;
  location: string;
  image: string;
  updated: string;
  ratingAvg?: number;
  ratingCount?: number;
};

export type ProductUpdate = {
  physical: number;
  status: ProductStatus;
  description: string;
  expected: ProductSnapshot;
};

export interface ReviewAuthor {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

export interface ReviewOrderInfo {
  id: string;
  orderCode: string;
}

export interface StaffProductReview {
  id: string;
  rating: number;
  author: ReviewAuthor;
  order?: ReviewOrderInfo;
  comment: string;
  images: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface RatingBreakdownItem {
  count: number;
  percentage: number;
}

export interface StaffProductReviewsSummary {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, RatingBreakdownItem>;
}

export interface StaffProductReviewsPagination {
  currentPage: number;
  totalPages: number;
  totalReviews: number;
  limit: number;
}

export interface StaffProductReviewsData {
  summary: StaffProductReviewsSummary;
  reviews: StaffProductReview[];
  pagination: StaffProductReviewsPagination;
}

export interface StaffProductReviewsQuery {
  rating?: string;
  hasImages?: boolean;
  sort?: "recent" | "rating_desc" | "rating_asc";
  page?: number;
  limit?: number;
}

