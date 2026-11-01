'use client';
import { ProductGallery } from '../../../product-gallery';
import { ct } from '@/lib/commerce-copy';
import { languages } from '@/lib/shop-copy';
import type { ShopSettings } from '@/lib/commerce';
import { send } from '@/lib/shop-api';
import { Button } from '@/components/primitives/Button';
import { Heading } from '@/components/primitives/Heading';
import { Text } from '@/components/primitives/Text';
import { Label } from '@/components/primitives/Label';
import { Input } from '@/components/primitives/Input';
import { Textarea } from '@/components/primitives/Textarea';
import { Select } from '@/components/primitives/Select';
import { styles } from './CommerceAdminAppearance.styles';
import type { CommerceAdminAppearanceProps } from './CommerceAdminAppearance.types';

export function CommerceAdminAppearance({
  lang,
  reload,
  products,
  section,
  draft,
  language,
  setLanguage,
  coupons,
  busy,
  run,
  setting,
  preview,
}: CommerceAdminAppearanceProps) {
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await send('/admin/settings', draft);
          await reload();
        });
      }}
    >
      {section === 'appearance' && (
        <>
          <Heading as="h2">{ct(lang, 'buttonStyle')}</Heading>
          <div className={styles.div}>
            {(['solid', 'outline', 'rounded', 'ticket'] as const).map(
              (style) => (
                <Button
                  type="button"
                  className={`style-example example-${style}`}
                  key={style}
                  aria-pressed={draft.buttonStyle === style}
                  onClick={() => setting('buttonStyle', style)}
                >
                  <Text as="span">
                    {
                      {
                        solid: '02 · Pure Pill',
                        outline: '11 · Hairline',
                        rounded: '03 · Soft Square',
                        ticket: '18 · Editorial Rules',
                      }[style]
                    }
                  </Text>
                </Button>
              ),
            )}
          </div>
          <Heading as="h2">{ct(lang, 'galleryStyle')}</Heading>
          <div className={styles.div2}>
            {(['carousel', 'editorial', 'tiles', 'focus'] as const).map(
              (style) => (
                <Button
                  type="button"
                  key={style}
                  aria-pressed={draft.galleryStyle === style}
                  onClick={() => setting('galleryStyle', style)}
                >
                  {ct(lang, style)}
                </Button>
              ),
            )}
          </div>
          <div className={styles.div3}>
            <Text as="small">{ct(lang, 'preview')}</Text>
            {preview && (
              <ProductGallery product={preview} style={draft.galleryStyle} />
            )}
          </div>
        </>
      )}
      {section === 'offers' && (
        <>
          <Heading as="h2">{ct(lang, 'offerSection')}</Heading>
          <Label className={styles.label}>
            <Input
              type="checkbox"
              checked={draft.offer.active}
              onChange={(e) =>
                setting('offer', {
                  ...draft.offer,
                  active: e.target.checked,
                })
              }
            />
            {ct(lang, 'enabled')}
          </Label>
          <div className={styles.div4}>
            {languages.map((l) => (
              <Button
                type="button"
                key={l}
                aria-pressed={l === language}
                onClick={() => setLanguage(l)}
              >
                {l.toUpperCase()}
              </Button>
            ))}
          </div>
          <Label>
            {ct(lang, 'offerTitle')}
            <Input
              maxLength={100}
              value={draft.offer.title[language]}
              onChange={(e) =>
                setting('offer', {
                  ...draft.offer,
                  title: {
                    ...draft.offer.title,
                    [language]: e.target.value,
                  },
                })
              }
            />
          </Label>
          <Label>
            {ct(lang, 'offerDescription')}
            <Textarea
              maxLength={400}
              value={draft.offer.description[language]}
              onChange={(e) =>
                setting('offer', {
                  ...draft.offer,
                  description: {
                    ...draft.offer.description,
                    [language]: e.target.value,
                  },
                })
              }
            />
          </Label>
          <Text className={styles.text}>{ct(lang, 'allLanguages')}</Text>
          <Label>
            {ct(lang, 'code')}
            <Select
              value={draft.offer.couponCode}
              onChange={(e) =>
                setting('offer', {
                  ...draft.offer,
                  couponCode: e.target.value,
                })
              }
            >
              <option value="">—</option>
              {coupons
                .filter((c) => c.active && !c.customerId)
                .map((c) => (
                  <option key={c.code}>{c.code}</option>
                ))}
            </Select>
          </Label>
          <fieldset>
            <legend>{ct(lang, 'featuredProducts')}</legend>
            <div className={styles.div5}>
              {products.map((p) => (
                <Label key={p.id}>
                  <Input
                    type="checkbox"
                    checked={draft.offer.productIds.includes(p.id)}
                    onChange={(e) =>
                      setting('offer', {
                        ...draft.offer,
                        productIds: e.target.checked
                          ? [...draft.offer.productIds, p.id]
                          : draft.offer.productIds.filter((id) => id !== p.id),
                      })
                    }
                  />
                  {p.name[lang]}
                </Label>
              ))}
            </div>
          </fieldset>
        </>
      )}
      {section === 'settings' && (
        <>
          <Heading as="h2">{ct(lang, 'settings')}</Heading>
          <Label className={styles.label2}>
            <Input
              type="checkbox"
              checked={draft.shopOpen}
              onChange={(e) => setting('shopOpen', e.target.checked)}
            />
            {ct(lang, 'shopOpen')}
          </Label>
          <Label>
            {ct(lang, 'taxMode')}
            <Select
              aria-label={ct(lang, 'taxMode')}
              value={draft.taxMode}
              onChange={(e) =>
                setting('taxMode', e.target.value as ShopSettings['taxMode'])
              }
            >
              <option value="no_vat">{ct(lang, 'taxNoVat')}</option>
              <option value="unset">{ct(lang, 'taxUnset')}</option>
              <option value="regular">{ct(lang, 'taxRegular')}</option>
              <option value="small_business">
                {ct(lang, 'taxSmallBusiness')}
              </option>
            </Select>
          </Label>
          <Text className={styles.text2}>
            {ct(
              lang,
              draft.taxMode === 'no_vat'
                ? 'noVatNotice'
                : draft.taxMode === 'small_business'
                  ? 'smallBusinessNotice'
                  : draft.taxMode === 'unset'
                    ? 'taxPending'
                    : 'notTaxPayable',
            )}
          </Text>
          <a
            href="https://www.gesetze-im-internet.de/ustg_1980/__12.html"
            target="_blank"
            rel="noreferrer"
          >
            UStG § 12
          </a>
          <a
            href="https://www.gesetze-im-internet.de/ustg_1980/__19.html"
            target="_blank"
            rel="noreferrer"
          >
            UStG § 19
          </a>
          <Label>
            {ct(lang, 'deliverySettings')}
            <Select
              value={draft.deliveryMode}
              onChange={(e) =>
                setting(
                  'deliveryMode',
                  e.target.value as ShopSettings['deliveryMode'],
                )
              }
            >
              <option value="quote">{ct(lang, 'deliveryQuoteMode')}</option>
              <option value="zones">{ct(lang, 'deliveryZoneMode')}</option>
            </Select>
          </Label>
          <Text className={styles.text3}>{ct(lang, 'hamburgOnly')}</Text>
        </>
      )}
      <Button className={styles.button} disabled={busy} aria-busy={busy}>
        {ct(lang, 'saveSettings')}
      </Button>
    </form>
  );
}
