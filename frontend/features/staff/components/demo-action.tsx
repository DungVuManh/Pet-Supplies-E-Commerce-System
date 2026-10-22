"use client";
import { useState } from "react";
import { secondaryButton } from "./staff-ui";
export function DemoAction({ label }: { label: string }) { const [notice,setNotice]=useState(""); return <div className="flex flex-col items-end gap-2"><button className={secondaryButton} onClick={()=>setNotice(`${label} cần dữ liệu backend và chưa tạo tệp trong bản demo.`)}>{label}</button>{notice&&<span role="status" className="max-w-64 text-right text-xs text-brand">{notice}</span>}</div>; }
