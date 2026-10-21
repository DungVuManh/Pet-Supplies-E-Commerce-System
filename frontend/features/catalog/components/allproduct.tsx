import React from "react";
import { ProductCard } from "./product-card";
import { products } from "../products";
export function AllProduct() {
  const categories = [
    { name: "Tất cả sản phẩm", href: "/listProduct/allProducts" },
    { name: "Dành cho chó", href: "/?category=dog#featured-products" },
    { name: "Dành cho mèo", href: "/?category=cat#featured-products" },
    { name: "Đồ chơi" },
    { name: "Phụ kiện" },
    { name: "Vệ sinh & chăm sóc" },
  ];
  const brands = [
    { name: "KONG" },
    { name: "Cat's Best" },
    { name: "Royal Caninl" },
  ];

  return (
    <main>
      <div className="flex">
        <aside className="w-1/4 shrink-0 rounded-md p-4 bg-blue-50 mr-5">
          <div className="flex justify-between mt-5">
            <h1 className="font-bold ">Bộ lọc</h1>
            <button className="font-bold">Xóa lọc</button>
          </div>
          <h4 className="font-bold mt-3">Danh mục</h4>
          <ul>
            {categories.map((item) => (
              <li
                key={item.href}
                className="flex items-center gap-2 mt-5 font-medium"
              >
                <input type="radio" id={item.href} />
                <label htmlFor={item.href}>{item.name}</label>
              </li>
            ))}
          </ul>
          <h1 className="font-bold mt-5">Khoảng giá</h1>
          <ul>
            <li className="flex items-center gap-2 mt-5 font-medium">
              <input type="checkbox" />
              <label>Dưới 100.000đ</label>
            </li>
            <li className="flex items-center gap-2 mt-5 font-medium">
              <input type="checkbox" />
              <label>100.000đ - 300.000đ</label>
            </li>
            <li className="flex items-center gap-2 mt-5 font-medium">
              <input type="checkbox" />
              <label>Trên 300.000đ</label>
            </li>
          </ul>
          <h1 className="font-bold mt-5">Thương hiệu</h1>
          <ul>
            {brands.map((item) => (
              <li
                key={item.name}
                className="flex items-center gap-2 mt-4 font-medium"
              >
                <input type="checkbox" id={item.name} />
                <label htmlFor={item.name}>{item.name}</label>
              </li>
            ))}
          </ul>
        </aside>
        <div className="w-3/4 flex-1 ml-5">
          <div className="flex justify-between gap-4  mb-4">
            <input
              type="search"
              placeholder="Tìm kiếm sản phẩm..."
              className=" min-w-0 flex-1 rounded-md border p-2"
            />
            <h2 className="mr-5 ml-5 mt-2">128 sản phẩm</h2>
            <select className="rounded-md bg-white border p-2">
              <option value="default">Phổ biến nhất</option>
              <option value="price-asc">Giá: Thấp đến Cao</option>
              <option value="price-desc">Giá: Cao đến Thấp</option>
              <option value="name-asc">Tên: A-Z</option>
              <option value="name-desc">Tên: Z-A</option>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}{" "}
          </div>
        </div>
      </div>
    </main>
  );
}
