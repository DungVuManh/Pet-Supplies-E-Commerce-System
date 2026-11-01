// =============================================================
// features/reviews/types.ts
// Định nghĩa kiểu dữ liệu cho tính năng "Đánh giá của tôi"
// =============================================================

export interface UnreviewedProduct {
  orderId: string;
  orderCode: string;
  completedAt: string;
  daysRemaining: number;
  productId: string;
  productName: string;
  productSlug?: string;
  productImage: string;
  variantSku?: string;
  price?: number;
}

export interface UserReview {
  _id: string;
  productId: string;
  productName: string;
  productSlug?: string;
  productImage: string;
  rating: number;
  comment: string;
  images: string[];
  status: "published";
  canEdit?: boolean;
  editDaysRemaining?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MyReviewsData {
  unreviewed: UnreviewedProduct[];
  reviewed: UserReview[];
  counts: {
    unreviewed: number;
    reviewed: number;
  };
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  comment?: string;
  images?: string[];
}

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string;
  images?: string[];
}
