"use client";

import { useAdminLogin } from "./useAdminLogin";
import { AdminLoginView } from "./AdminLoginView";

export function AdminLogin() {
  const model = useAdminLogin();
  return <AdminLoginView {...model} />;
}
