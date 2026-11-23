# Data Model & DTOs: Staff Xem Đánh Giá Sản Phẩm (Staff Product Reviews)

**Feature Branch**: `feature/staff-product-reviews`  
**Created**: 2026-11-14

---

## 1. Thực thể liên quan trong Cơ sở Dữ liệu

Tính năng sử dụng các collection MongoDB sẵn có mà không cần tạo mới collection:

### 1.1. Collection `reviews` (Mongoose Model: `Review`)
```typescript
interface ReviewDocument {
  _id: ObjectId;
  productId: ObjectId;             // Tham chiếu Product
  orderId?: ObjectId;             // Tham chiếu Order
  userId: ObjectId;                // Tham chiếu User (khách hàng đánh giá)
  rating: number;                  // 1 đến 5
  comment: string;                 // Nhận xét của khách
  images: string[];                // Danh sách URL ảnh Cloudinary (tối đa 2)
  status: "published";             // Mặc định "published"
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2. Collection `products` (Mongoose Model: `Product`)
```typescript
interface ProductDocument {
  _id: ObjectId;
  name: string;
  ratingAvg?: number;              // Điểm trung bình (1.0 - 5.0)
  ratingCount?: number;            // Tổng số đánh giá
  variants: Array<{
    sku: string;
    label?: string;
    price: number;
    stock: number;
    reservedStock: number;
  }>;
}
```

### 1.3. Collection `orders` (Mongoose Model: `Order`)
- Dùng để populate mã đơn hàng `orderCode` tương ứng với đánh giá của khách hàng.

---

## 2. Cấu trúc DTO phản hồi API (`StaffProductReviewsResponse`)

```typescript
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

export interface StaffProductReviewItem {
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

export interface StaffProductReviewsResponse {
  success: boolean;
  data: {
    summary: StaffProductReviewsSummary;
    reviews: StaffProductReviewItem[];
    pagination: StaffProductReviewsPagination;
  };
}
```

