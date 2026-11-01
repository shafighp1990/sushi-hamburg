import type { ReactNode } from "react";
import type { Order } from "@/lib/shop-api";

export type ModalProps = {
  title: string;
  close: () => void;
  children: ReactNode;
};

export type OrderCardProps = {
  order: Order;
  onClick: () => void;
};
