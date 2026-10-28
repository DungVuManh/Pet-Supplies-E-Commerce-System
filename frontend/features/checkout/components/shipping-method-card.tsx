// "use client";


// import React from "react";
// import type { ShippingMethod } from "../types";

// type ShippingMethodCardProps = {
//   method: ShippingMethod;
// };

// function formatVND(value: number): string {
//   return value.toLocaleString("vi-VN") + " đ";
// }

// export function ShippingMethodCard({ method }: ShippingMethodCardProps) {
//   return (
//     <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
//       <h2 className="text-lg font-bold text-ink mb-4">
//         2. Phương thức vận chuyển
//       </h2>

//       {/* Tùy chọn giao hàng được chọn */}
//       <div className="rounded-xl border-2 border-blue-500 bg-[#f8fbff] p-4 flex items-center gap-4">
//         {/* Custom radio button checked */}
//         <div className="size-5 shrink-0 rounded-full border-2 border-blue-600 flex items-center justify-center">
//           <div className="size-2.5 rounded-full bg-blue-600" />
//         </div>

//         {/* Icon xe giao hàng */}
//         <div className="text-ink shrink-0">
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             width="22"
//             height="22"
//             viewBox="0 0 24 24"
//             fill="none"
//             stroke="currentColor"
//             strokeWidth="1.8"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           >
//             <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
//             <path d="M15 18H9" />
//             <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-5v10Z" />
//             <circle cx="7" cy="18" r="2" />
//             <circle cx="17" cy="18" r="2" />
//           </svg>
//         </div>

//         <div>
//           <p className="font-semibold text-sm text-ink">
//             {method.name} · {formatVND(method.price)}
//           </p>
//           <p className="text-xs text-muted mt-0.5">
//             Dự kiến nhận hàng: {method.estimatedDelivery}
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }
