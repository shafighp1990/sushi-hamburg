"use client";

import { useOrderTracking } from "./useOrderTracking";
import { OrderTrackingView } from "./OrderTrackingView";

export function OrderTracking() {
  const model = useOrderTracking();
  return <OrderTrackingView {...model} />;
}
