import type { CommerceAdminViewProps } from '../../CommerceAdminView.types';
export type CouponEditorProps = Pick<
  CommerceAdminViewProps,
  | 'customers'
  | 'lang'
  | 'products'
  | 'coupons'
  | 'setCoupons'
  | 'coupon'
  | 'setCoupon'
  | 'busy'
  | 'run'
>;
