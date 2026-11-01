"use client";
import type { OrderMessagesProps } from "./OrderMessages.types";
import { useOrderMessages } from "./useOrderMessages";
import { OrderMessagesView } from "./OrderMessagesView";
export function OrderMessages(props: OrderMessagesProps) {
  return <OrderConversation key={props.orderId + (props.staff ? ":team" : ":customer")} {...props} />;
}
function OrderConversation(props: OrderMessagesProps) {
  return <OrderMessagesView {...useOrderMessages(props)} />;
}
