import type { Order } from "@/lib/shop-api";

export type DeliverySlotChangeProps = {
  order: Order;
  token: string;
  onSaved: () => Promise<void>;
};
