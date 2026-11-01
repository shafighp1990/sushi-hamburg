'use client';
import { send } from '@/lib/shop-api';
import { t } from '@/lib/shop-copy';
import { ot } from '@/lib/operations-copy';
import { providers, providerNames } from '@/lib/operations';
import { Label } from '@/components/primitives/Label';
import { Input } from '@/components/primitives/Input';
import { Heading } from '@/components/primitives/Heading';
import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { Select } from '@/components/primitives/Select';
import { styles } from './OperationsAdminPayments.styles';
import type { OperationsAdminPaymentsProps } from './OperationsAdminPayments.types';

export function OperationsAdminPayments({
  lang,
  draft,
  setDraft,
  connections,
  fields,
  setFields,
  busy,
  run,
  save,
}: OperationsAdminPaymentsProps) {
  return (
    <div className={styles.div2}>
      <form
        className={styles.form2}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Heading as="h3">{ot(lang, 'enabled')}</Heading>
        {['cash_on_delivery', ...providers].map((p) => (
          <Label className={styles.label2} key={p}>
            <Input
              type="checkbox"
              checked={
                draft.paymentEnabled[p as keyof typeof draft.paymentEnabled]
              }
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  paymentEnabled: {
                    ...d.paymentEnabled,
                    [p]: e.target.checked,
                  },
                }))
              }
            />
            {p === 'cash_on_delivery' ? t(lang, 'payment') : providerNames[p]}
          </Label>
        ))}
        <Button disabled={busy} aria-busy={busy} className={styles.button4}>
          {t(lang, 'save')}
        </Button>
      </form>
      {connections.map((c) => (
        <form
          className={styles.form3}
          key={c.provider}
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await send('/admin/connections', {
                provider: c.provider,
                fields: fields[c.provider] || {},
              });
              setFields((f) => ({ ...f, [c.provider]: {} }));
            });
          }}
        >
          <Heading as="h3">{providerNames[c.provider]}</Heading>
          <Text>{ot(lang, c.configured ? 'configured' : 'missing')}</Text>
          <Text className={styles.text}>{ot(lang, 'keepSecret')}</Text>
          {c.fields.map((f) => (
            <Label key={f.key}>
              {ot(
                lang,
                f.key.endsWith('_ENV')
                  ? 'environment'
                  : f.key.includes('WEBHOOK_SECRET')
                    ? 'webhookSecret'
                    : f.key.includes('WEBHOOK_ID')
                      ? 'webhookId'
                      : f.key.includes('CLIENT_ID')
                        ? 'clientId'
                        : f.key.includes('CLIENT_SECRET')
                          ? 'clientSecret'
                          : f.key.includes('MERCHANT')
                            ? 'merchantCode'
                            : 'apiKey',
              )}
              {f.key.endsWith('_ENV') ? (
                <Select
                  value={fields[c.provider]?.[f.key] || f.value}
                  onChange={(e) =>
                    setFields((v) => ({
                      ...v,
                      [c.provider]: {
                        ...v[c.provider],
                        [f.key]: e.target.value,
                      },
                    }))
                  }
                >
                  <option value="sandbox">Sandbox / Test</option>
                  <option value="live">Live</option>
                </Select>
              ) : (
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={fields[c.provider]?.[f.key] || ''}
                  placeholder={f.present ? '••••••••' : ''}
                  onChange={(e) =>
                    setFields((v) => ({
                      ...v,
                      [c.provider]: {
                        ...v[c.provider],
                        [f.key]: e.target.value,
                      },
                    }))
                  }
                />
              )}
            </Label>
          ))}
          <Text as="small">{ot(lang, 'webhook')}</Text>
          <code className={styles.code}>
            {typeof location !== 'undefined' ? location.origin : ''}
            /api/webhooks/{c.provider}
          </code>
          <Button disabled={busy} aria-busy={busy} className={styles.button5}>
            {t(lang, 'save')}
          </Button>
        </form>
      ))}
    </div>
  );
}
