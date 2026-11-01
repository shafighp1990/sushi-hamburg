"use client";

import { useAdmin } from "./useAdmin";
import { AdminView } from "./AdminView";

export function Admin() {
  const model = useAdmin();
  return <AdminView {...model} />;
}
