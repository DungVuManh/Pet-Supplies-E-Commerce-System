import DetailProduct from "@/features/catalog/components/detailProduct";
import type { Metadata } from "next";
import { products } from "@/features/catalog/products";

const product = products[0];


export const metadata: Metadata = { title: "Chi tiết sản phẩm" };
export default function DetailProducts() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-6 py-6 outline-none xl:px-16">
      <div>         
      </div>
      <div className="flex flex-col gap-4">
        <DetailProduct product={product} />
      </div>
    </main>
  );
}
