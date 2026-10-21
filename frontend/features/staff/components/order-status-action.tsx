"use client";
import { useState } from "react";
import { Badge, primaryLink } from "./staff-ui";
export function OrderStatusAction() { const [updated, setUpdated] = useState(false); return <div className="flex flex-col items-end gap-3"><button className={primaryLink} onClick={() => setUpdated(true)}>Cập nhật trạng thái</button>{updated && <span role="status"><Badge tone="info">Demo: Đã chọn bước đóng gói</Badge></span>}</div>; }
