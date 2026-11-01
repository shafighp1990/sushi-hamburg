'use client';

import { OperationsAdmin } from '../operations-admin';
import { ot } from '@/lib/operations-copy';

import { ct } from '@/lib/commerce-copy';
import { t } from '@/lib/shop-copy';
import { money } from '@/lib/catalog';

import { Button } from '@/components/primitives/Button';
import { FieldMessage } from '@/components/primitives/FieldMessage';
import { Heading } from '@/components/primitives/Heading';
import { Text } from '@/components/primitives/Text';
import { Label } from '@/components/primitives/Label';
import { Input } from '@/components/primitives/Input';

import { styles } from './CommerceAdminView.styles';
import { newCoupon } from './CommerceAdmin.shared';
import type { CommerceAdminViewProps } from './CommerceAdminView.types';
import { CommerceAdminAppearance } from './sections/CommerceAdminAppearance';
import { CouponEditor } from './sections/CouponEditor';

export function CommerceAdminView({
  customers,
  lang,
  settings,
  reload,
  products,
  section,
  setSection,
  draft,
  language,
  setLanguage,
  coupons,
  setCoupons,
  coupon,
  setCoupon,
  error,
  setError,
  notice,
  setNotice,
  busy,
  orders,
  from,
  setFrom,
  to,
  setTo,
  run,
  setting,
  report,
  csv,
  paid,
  vat,
  preview,
}: CommerceAdminViewProps) {
  return (
    <section className={styles.section}>
      <nav className={styles.nav}>
        {(
          ['appearance', 'offers', 'discounts', 'settings', 'reports'] as const
        ).map((k) => (
          <Button
            key={k}
            aria-pressed={section === k}
            onClick={() => {
              setSection(k);
              setNotice('');
              setError('');
            }}
          >
            {ct(lang, k)}
          </Button>
        ))}
        <Button
          aria-pressed={section === 'operations'}
          onClick={() => setSection('operations')}
        >
          {ot(lang, 'operations')}
        </Button>
      </nav>
      {section === 'operations' && <OperationsAdmin />}
      {error && (
        <FieldMessage tone="error" className={styles.fieldMessage} role="alert">
          {error}
        </FieldMessage>
      )}
      {notice && (
        <FieldMessage className={styles.fieldMessage2}>{notice}</FieldMessage>
      )}
      {['appearance', 'offers', 'settings'].includes(section) && (
        <CommerceAdminAppearance
          lang={lang}
          settings={settings}
          reload={reload}
          products={products}
          section={section}
          draft={draft}
          language={language}
          setLanguage={setLanguage}
          coupons={coupons}
          busy={busy}
          run={run}
          setting={setting}
          preview={preview}
        />
      )}
      {section === 'discounts' && (
        <>
          <div className={styles.div6}>
            <Heading as="h2">{ct(lang, 'discounts')}</Heading>
            <Button
              className={styles.button2}
              onClick={() => setCoupon(newCoupon())}
            >
              {ct(lang, 'addDiscount')} ＋
            </Button>
          </div>
          <Text>{ct(lang, 'discountsHint')}</Text>
          <div className={styles.div7}>
            {coupons.map((c) => (
              <Button
                key={c.code}
                className={styles.button3}
                onClick={() => setCoupon({ ...c })}
              >
                <Text as="b">
                  {c.code} {c.active ? '●' : '○'}
                </Text>
                <Text as="strong">
                  {c.type === 'percent' ? `${c.amount}%` : money(c.amount)}
                </Text>
                <Text as="span">
                  {c.used} / {c.usageLimit || '∞'}
                </Text>
                <Text as="small">{c.endsOn || '—'}</Text>
              </Button>
            ))}
          </div>
          {coupon && (
            <CouponEditor
              customers={customers}
              lang={lang}
              products={products}
              coupons={coupons}
              setCoupons={setCoupons}
              coupon={coupon}
              setCoupon={setCoupon}
              busy={busy}
              run={run}
            />
          )}
        </>
      )}
      {section === 'reports' && (
        <>
          <Heading as="h2">{ct(lang, 'reports')}</Heading>
          <form
            className={styles.form3}
            onSubmit={(e) => {
              e.preventDefault();
              void run(report);
            }}
          >
            <Label>
              {ct(lang, 'periodFrom')}
              <Input
                type="date"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Label>
            <Label>
              {ct(lang, 'periodTo')}
              <Input
                type="date"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Label>
            <Button className={styles.button6} disabled={busy} aria-busy={busy}>
              {t(lang, 'refresh')}
            </Button>
            <Button
              type="button"
              className={styles.button7}
              disabled={!orders.length}
              onClick={csv}
            >
              {ct(lang, 'downloadCsv')}
            </Button>
          </form>
          <div className={styles.div11}>
            <div>
              <Text as="span">{ct(lang, 'paidOrders')}</Text>
              <Text as="strong">{paid.length}</Text>
            </div>
            <div>
              <Text as="span">{ct(lang, 'gross')}</Text>
              <Text as="strong">
                {money(paid.reduce((s, o) => s + (o.total || 0), 0))}
              </Text>
            </div>
            <div>
              <Text as="span">{ct(lang, 'outputVat')}</Text>
              <Text as="strong">{money(vat)}</Text>
            </div>
          </div>
          <Text className={styles.text5}>{ct(lang, 'notTaxPayable')}</Text>
          {paid.some((o) => !o.tax || o.tax.mode === 'unset') && (
            <Text className={styles.text6}>{ct(lang, 'taxPending')}</Text>
          )}
          <div className={styles.div12}>
            {orders.map((o) => (
              <a href={'/order?id=' + o.id} key={o.id}>
                <Text as="b">#{o.id.slice(0, 8)}</Text>
                <Text as="span">
                  {o.paymentState === 'review_required'
                    ? ct(lang, 'paymentReview')
                    : o.tax?.mode === 'unset'
                      ? ct(lang, 'taxUnset')
                      : ct(lang, 'paidOrders')}
                </Text>
                <Text as="strong">{money(o.total || 0)}</Text>
              </a>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
