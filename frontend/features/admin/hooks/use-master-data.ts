"use client";

import { useState } from "react";
import { listMasterData } from "../services/master-data";
import type { MasterDataFilter, MasterDataKind } from "../types";
import { useAdminList } from "./use-admin-list";

const initial: MasterDataFilter = { kind: "petType", q: "", status: "all" };

/** Tabs, filters, and paging for the Admin master data screen. */
export function useMasterData() {
  const list = useAdminList(listMasterData, initial);
  const [notice, setNotice] = useState("");

  return {
    ...list,
    kind: list.filter.kind,
    notice,
    setNotice,
    selectKind(kind: MasterDataKind) {
      list.apply({ ...initial, kind });
      setNotice("");
    },
    /** Searches the current tab for one code, so a new row is on screen whatever page it falls on. */
    showCode(code: string) {
      list.apply({ ...initial, kind: list.filter.kind, q: code });
    },
    /** Clears the filters but stays on the current tab. */
    clearFilters() {
      list.apply({ ...initial, kind: list.filter.kind });
      setNotice("");
    },
  };
}
