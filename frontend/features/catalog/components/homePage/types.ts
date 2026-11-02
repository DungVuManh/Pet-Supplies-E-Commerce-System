// =============================================================
// features/catalog/components/homePage/types.ts
// Định nghĩa kiểu dữ liệu cho toàn bộ các thành phần Trang Chủ
// =============================================================

export type HeroSlide = {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
  tag?: string;
};

export type VoucherItem = {
  code: string;
  discount: string;
  condition: string;
  badge: string;
};

export type BrandItem = {
  name: string;
  origin: string;
  tag: string;
};

export type PetCareArticle = {
  id: string;
  title: string;
  summary: string;
  tag: string;
  readTime: string;
};

export type HomeTab = {
  id: string;
  label: string;
};

export type ProductDiscoveryProps = {
  query?: string;
  category?: string;
};
