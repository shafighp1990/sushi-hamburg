import type { OrderTrackingViewProps } from "../../OrderTrackingView.types";
export type OrderPaymentActionsProps = Pick<
  OrderTrackingViewProps,
  "lang" | "order" | "token" | "busy" | "load" | "payment"
>;
