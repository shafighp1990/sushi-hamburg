import type { Coupon } from '@/lib/commerce';
export const newCoupon = (): Coupon => ({
  code: '',
  type: 'percent',
  amount: 10,
  startsOn: '',
  endsOn: '',
  minSubtotal: 0,
  usageLimit: 0,
  perCustomerLimit: 0,
  customerId: '',
  productIds: [],
  active: true,
  version: 0,
});
