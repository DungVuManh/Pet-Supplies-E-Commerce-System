// =============================================================
// features/catalog/components/homePage/index.ts
// Điểm export tập trung cho toàn bộ tính năng Trang Chủ
// =============================================================

// Components
export { BrandShowcase } from "./components/brand-showcase";
export { CategoryCard } from "./components/category-card";
export { HeroBannerGrid } from "./components/hero-banner-grid";
export { HeroImageSlider } from "./components/hero-image-slider";
export { HomeHero } from "./components/home-hero";
export { PetCareTips } from "./components/pet-care-tips";
export { ProductDiscovery, ProductDiscoveryContent } from "./components/product-discovery";
export { ServicePolicyBar } from "./components/service-policy-bar";
export { VoucherBar } from "./components/voucher-bar";

// Hooks
export { useHeroSlider } from "./hooks/use-hero-slider";
export { useProductDiscovery, HOME_TABS } from "./hooks/use-product-discovery";
export { useVoucherBar } from "./hooks/use-voucher-bar";

// Services
export { fetchHomeProductsApi } from "./services/home.service";
export type { FetchHomeProductsParams } from "./services/home.service";

// Types
export type {
  HeroSlide,
  VoucherItem,
  BrandItem,
  PetCareArticle,
  HomeTab,
  ProductDiscoveryProps,
} from "./types";
