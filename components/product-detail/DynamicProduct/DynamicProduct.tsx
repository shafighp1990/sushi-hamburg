"use client";
import { useBrowserLocation } from "@/components/use-browser-state";
import { LiveProductDetail } from "../LiveProductDetail";

export function DynamicProduct() {
  const query = useBrowserLocation();
  const id = new URLSearchParams(query.split("#")[0]).get("id") || "";
  return <LiveProductDetail id={id} />;
}
