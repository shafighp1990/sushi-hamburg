'use client';
import type { TaxSummary } from '@/lib/commerce';
import { ct } from '@/lib/commerce-copy';
import { money } from '@/lib/catalog';
import { useShop } from './shop-context';
export function TaxBreakdown({ tax }: { tax: TaxSummary | null | undefined }) {
  const { lang } = useShop();
  if (!tax || tax.mode === 'unset')
    return <p className="muted tax-note">{ct(lang, 'taxPending')}</p>;
  if (tax.mode === 'small_business')
    return <p className="muted tax-note">{ct(lang, 'smallBusinessNotice')}</p>;
  return (
    <div className="tax-breakdown">
      {tax.groups.map((g) => (
        <div key={g.rate}>
          <span>
            {ct(lang, 'vat')} {g.rate / 100}%
          </span>
          <b>{money(g.vat)}</b>
        </div>
      ))}
      {tax.net !== null && (
        <div>
          <span>{ct(lang, 'net')}</span>
          <b>{money(tax.net)}</b>
        </div>
      )}
    </div>
  );
}
