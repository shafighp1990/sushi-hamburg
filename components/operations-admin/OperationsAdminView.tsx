'use client';

import { send } from '@/lib/shop-api';
import { t } from '@/lib/shop-copy';
import { ot } from '@/lib/operations-copy';

import { Label } from '@/components/primitives/Label';
import { Input } from '@/components/primitives/Input';
import { Heading } from '@/components/primitives/Heading';
import { Button } from '@/components/primitives/Button';
import { FieldMessage } from '@/components/primitives/FieldMessage';
import { Text } from '@/components/primitives/Text';

import { styles } from './OperationsAdminView.styles';
import type { OperationsAdminViewProps } from './OperationsAdminView.types';
import { OperationsAdminHours } from './sections/OperationsAdminHours';
import { OperationsAdminPayments } from './sections/OperationsAdminPayments';
import { NewsletterCampaignForm } from './sections/NewsletterCampaignForm';
import { DocumentSettingsForm } from './sections/DocumentSettingsForm';

export function OperationsAdminView({
  lang,
  tab,
  setTab,
  draft,
  setDraft,
  connections,
  fields,
  setFields,
  date,
  setDate,
  busy,
  error,
  notice,
  campaigns,
  campaign,
  setCampaign,
  language,
  setLanguage,
  messages,
  preview,
  setPreview,
  email,
  setEmail,
  emailState,
  stats,
  run,
  save,
  updateDay,
}: OperationsAdminViewProps) {
  return (
    <section className={styles.section}>
      <Heading as="h2">{ot(lang, 'operations')}</Heading>
      <nav className={styles.nav}>
        {(['hours', 'payments', 'newsletter', 'documents'] as const).map(
          (k) => (
            <Button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>
              {ot(lang, k)}
            </Button>
          ),
        )}
      </nav>
      {error && (
        <FieldMessage tone="error" role="alert" className={styles.fieldMessage}>
          {error}
        </FieldMessage>
      )}
      {notice && (
        <FieldMessage className={styles.fieldMessage2}>{notice}</FieldMessage>
      )}
      {tab === 'hours' && (
        <OperationsAdminHours
          lang={lang}
          draft={draft}
          setDraft={setDraft}
          date={date}
          setDate={setDate}
          busy={busy}
          save={save}
          updateDay={updateDay}
        />
      )}
      {tab === 'payments' && (
        <OperationsAdminPayments
          lang={lang}
          draft={draft}
          setDraft={setDraft}
          connections={connections}
          fields={fields}
          setFields={setFields}
          busy={busy}
          run={run}
          save={save}
        />
      )}
      {tab === 'newsletter' && (
        <>
          <form
            className={styles.form4}
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <Label className={styles.label3}>
              <Input
                type="checkbox"
                checked={draft.newsletter.newProducts}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    newsletter: { newProducts: e.target.checked },
                  }))
                }
              />
              {ot(lang, 'newProducts')}
            </Label>
            <Button disabled={busy} aria-busy={busy} className={styles.button6}>
              {t(lang, 'save')}
            </Button>
          </form>
          <Text>
            {stats
              .map(
                (s) =>
                  `${ot(lang, s.state as 'active' | 'pending' | 'unsubscribed')}: ${s.n}`,
              )
              .join(' · ')}
          </Text>
          <div className={styles.div3}>
            <NewsletterCampaignForm
              lang={lang}
              busy={busy}
              campaign={campaign}
              setCampaign={setCampaign}
              language={language}
              setLanguage={setLanguage}
              run={run}
              save={save}
            />
            <div>
              {campaigns.map((c) => (
                <Button
                  className={styles.button8}
                  key={c.id}
                  onClick={() => setCampaign(c)}
                >
                  <Text as="b">{c.subject[lang] || c.subject.de || c.id}</Text>
                  <Text as="span">
                    {new Date(c.nextSendAt).toLocaleString(lang)} ·{' '}
                    {c.active ? '✓' : '—'}
                  </Text>
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
      {tab === 'documents' && (
        <>
          <div className={styles.div5}>
            <form
              className={styles.form6}
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <Heading as="h3">{ot(lang, 'issuer')}</Heading>
              <Text>{ot(lang, 'issuerNote')}</Text>
              {(['name', 'address', 'email', 'taxId'] as const).map((k) => (
                <Label key={k}>
                  {k === 'name'
                    ? ot(lang, 'legalName')
                    : k === 'taxId'
                      ? ot(lang, 'taxId')
                      : t(lang, k)}
                  <Input
                    value={draft.issuer[k]}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        issuer: { ...d.issuer, [k]: e.target.value },
                      }))
                    }
                  />
                </Label>
              ))}
              <Button
                className={styles.button9}
                disabled={busy}
                aria-busy={busy}
              >
                {t(lang, 'save')}
              </Button>
            </form>
            <DocumentSettingsForm
              lang={lang}
              busy={busy}
              email={email}
              setEmail={setEmail}
              emailState={emailState}
              run={run}
              save={save}
            />
          </div>
          <Heading as="h3">{ot(lang, 'outbox')}</Heading>
          <Button
            className={styles.button11}
            disabled={busy}
            aria-busy={busy}
            onClick={() => run(() => send('/admin/mail/process', {}))}
          >
            {ot(lang, 'process')}
          </Button>
          <div className={styles.div6}>
            {messages.map((m) => (
              <div key={m.id} className={styles.div7}>
                <Text as="b">{m.recipient}</Text>
                <Text as="span">
                  {m.kind} · {m.state} · {m.error || ''}
                </Text>
                {emailState.preview && (
                  <Button
                    className={styles.button12}
                    onClick={() =>
                      void run(async () =>
                        setPreview(
                          JSON.stringify(
                            await send('/admin/mail/preview', { id: m.id }),
                            null,
                            2,
                          ),
                        ),
                      )
                    }
                  >
                    {ot(lang, 'preview')}
                  </Button>
                )}
              </div>
            ))}
          </div>
          {preview && <pre className={styles.pre}>{preview}</pre>}
        </>
      )}
    </section>
  );
}
