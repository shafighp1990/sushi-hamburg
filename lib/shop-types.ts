import type { Language, Product } from './catalog';
import type { Coupon, ShopSettings, TaxSummary } from './commerce';
import type { Schedule } from './operations';

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  city: string;
  language: Language;
  admin: boolean;
};
export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';
export type PaymentMethod =
  | 'cash_on_delivery'
  | 'stripe'
  | 'paypal'
  | 'sumup'
  | 'revolut';
export type OrderCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode?: string;
  city?: string;
  notes: string;
  utensils: number;
  language: Language;
};
export type OrderItem = {
  id: string;
  name: Record<Language, string>;
  price: number;
  quantity: number;
  taxRate?: number;
  discountShare?: number;
};
export type Order = {
  id: string;
  userId: string | null;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  delivery: number | null;
  total: number | null;
  tax: TaxSummary | null;
  paidAt?: number | null;
  status: OrderStatus;
  payment: PaymentMethod;
  paid: boolean;
  date: string;
  time: string;
  zone: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  estimatedArrivalAt: number | null;
};
export type OrderEvent = {
  id: string;
  status: OrderStatus;
  note: string;
  created_at: number;
};
export type OrderMessage = {
  id: string;
  sender: 'customer' | 'team';
  text: string;
  createdAt: number;
};
export type OrderMessages = {
  messages: OrderMessage[];
  nextCursor: string | null;
};
export type OrderDetail = { order: Order; events: OrderEvent[] };
export type OrderOverview = {
  orders: number;
  pending: number | null;
  revenue: number | null;
};
export type OrderFeed = {
  revision: string;
  orders?: Order[];
  overview?: OrderOverview;
};
export type ShopStatus = {
  ready: boolean;
  email: boolean;
  payment: string;
  stripe: boolean;
  paypal: boolean;
  sumup: boolean;
  revolut: boolean;
  upload: boolean;
  demo: boolean;
  reviewMode: boolean;
  accepting: boolean;
  paymentEnabled: ShopSettings['paymentEnabled'];
  deliveryOptions: {
    date: string;
    from: string;
    to: string;
    times: string[];
  }[];
};
export type CustomerRecord = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean | number;
  createdAt: number;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
  disabled: number | null;
  orders: number;
};
export type Quote = {
  subtotal: number;
  discount: number;
  newsletterDiscount: number;
  delivery: number | null;
  total: number | null;
  tax: TaxSummary;
  couponCode: string;
};
export type ApiResult = { ok: true };
export type ProductResult = { products: Product[] };
export type CouponRecord = Coupon & { used: number };
export type NewsletterPreference = {
  state: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  language: Language;
  discount?: number;
  configured?: boolean;
  pending?: boolean;
};
export type Campaign = {
  id?: string;
  active: boolean;
  subject: Record<Language, string>;
  text: Record<Language, string>;
  repeat: 'once' | 'daily' | 'weekly' | 'monthly';
  nextSendAt: number;
  revision?: number;
};
export type DeliverySchedule = Schedule;
