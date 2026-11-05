'use client';
import { ct } from '@/lib/commerce-copy';
import { productText } from '@/lib/catalog';
import { t } from '@/lib/shop-copy';
import type { CouponRecord } from '@/lib/shop-types';
import type { Coupon } from '@/lib/commerce';
import { api, send } from '@/lib/shop-api';
import { Button } from '@/components/primitives/Button';
import { Heading } from '@/components/primitives/Heading';
import { Text } from '@/components/primitives/Text';
import { Label } from '@/components/primitives/Label';
import { Input } from '@/components/primitives/Input';
import { Select } from '@/components/primitives/Select';
import { styles } from './CouponEditor.styles';
import type { CouponEditorProps } from './CouponEditor.types';

export function CouponEditor({
  customers,
  lang,
  products,
  setCoupons,
  coupon,
  setCoupon,
  busy,
  run,
}: CouponEditorProps) {
  if (!coupon) return null;
  return (
    <form
      className={styles.form2}
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await send('/admin/coupons', coupon);
          setCoupons(
            (await api<{ coupons: CouponRecord[] }>('/admin/coupons')).coupons,
          );
          setCoupon(null);
        });
      }}
    >
      <Heading as="h3">{coupon.code || ct(lang, 'addDiscount')}</Heading>
      <div className={styles.div8}>
        <Label>
          {ct(lang, 'code')}
          <Input
            required
            pattern="[A-Za-z0-9][A-Za-z0-9-]{2,31}"
            maxLength={32}
            readOnly={coupon.version > 0}
            value={coupon.code}
            onChange={(e) =>
              setCoupon({
                ...coupon,
                code: e.target.value.toUpperCase(),
              })
            }
          />
        </Label>
        <Label>
          {ct(lang, 'discount')}
          <Select
            value={coupon.type}
            onChange={(e) =>
              setCoupon({
                ...coupon,
                type: e.target.value as Coupon['type'],
                amount: 10,
              })
            }
          >
            <option value="percent">{ct(lang, 'percent')}</option>
            <option value="fixed">{ct(lang, 'fixed')}</option>
          </Select>
        </Label>
        <Label>
          {ct(lang, 'amount')} {coupon.type === 'percent' ? '%' : '€'}
          <Input
            required
            type="number"
            min={coupon.type === 'percent' ? 1 : 0.01}
            max={coupon.type === 'percent' ? 100 : 1000}
            step={coupon.type === 'percent' ? 1 : 0.01}
            value={
              coupon.type === 'percent' ? coupon.amount : coupon.amount / 100
            }
            onChange={(e) =>
              setCoupon({
                ...coupon,
                amount: Math.round(
                  Number(e.target.value) *
                    (coupon.type === 'percent' ? 1 : 100),
                ),
              })
            }
          />
        </Label>
        <Label>
          {ct(lang, 'minSubtotal')} €
          <Input
            type="number"
            min="0"
            step="0.01"
            value={coupon.minSubtotal / 100}
            onChange={(e) =>
              setCoupon({
                ...coupon,
                minSubtotal: Math.round(Number(e.target.value) * 100),
              })
            }
          />
        </Label>
        {(['startsOn', 'endsOn'] as const).map((k) => (
          <Label key={k}>
            {ct(lang, k)}
            <Input
              type="date"
              value={coupon[k]}
              onChange={(e) => setCoupon({ ...coupon, [k]: e.target.value })}
            />
          </Label>
        ))}
        {(['usageLimit', 'perCustomerLimit'] as const).map((k) => (
          <Label key={k}>
            {ct(lang, k)} · 0 = ∞
            <Input
              type="number"
              min="0"
              max="100000"
              value={coupon[k]}
              onChange={(e) =>
                setCoupon({ ...coupon, [k]: Number(e.target.value) })
              }
            />
          </Label>
        ))}
        <Label className={styles.label3}>
          {ct(lang, 'customerOnly')}
          <Select
            value={coupon.customerId}
            onChange={(e) =>
              setCoupon({ ...coupon, customerId: e.target.value })
            }
          >
            <option value="">{ct(lang, 'allCustomers')}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.email}
              </option>
            ))}
          </Select>
        </Label>
      </div>
      <Text className={styles.text4}>{ct(lang, 'privateDiscountHint')}</Text>
      <fieldset>
        <legend>{ct(lang, 'offerApplies')}</legend>
        <div className={styles.div9}>
          {products.map((p) => (
            <Label key={p.id}>
              <Input
                type="checkbox"
                checked={coupon.productIds.includes(p.id)}
                onChange={(e) =>
                  setCoupon({
                    ...coupon,
                    productIds: e.target.checked
                      ? [...coupon.productIds, p.id]
                      : coupon.productIds.filter((id) => id !== p.id),
                  })
                }
              />
              {productText(p, lang).name}
            </Label>
          ))}
        </div>
      </fieldset>
      <Label className={styles.label4}>
        <Input
          type="checkbox"
          checked={coupon.active}
          onChange={(e) => setCoupon({ ...coupon, active: e.target.checked })}
        />
        {ct(lang, 'enabled')}
      </Label>
      <div className={styles.div10}>
        <Button className={styles.button4} disabled={busy} aria-busy={busy}>
          {t(lang, 'save')}
        </Button>
        <Button
          type="button"
          className={styles.button5}
          onClick={() => setCoupon(null)}
        >
          {t(lang, 'cancel')}
        </Button>
      </div>
    </form>
  );
}
