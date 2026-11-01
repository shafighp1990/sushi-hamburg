'use client';
import type { Campaign } from '@/lib/shop-types';
import { send } from '@/lib/shop-api';
import { t, languages } from '@/lib/shop-copy';
import { ot } from '@/lib/operations-copy';
import { Label } from '@/components/primitives/Label';
import { Input } from '@/components/primitives/Input';
import { Heading } from '@/components/primitives/Heading';
import { Button } from '@/components/primitives/Button';
import { Select } from '@/components/primitives/Select';
import { Textarea } from '@/components/primitives/Textarea';
import { styles } from './NewsletterCampaignForm.styles';
import type { NewsletterCampaignFormProps } from './NewsletterCampaignForm.types';

export function NewsletterCampaignForm({
  lang,
  busy,
  campaign,
  setCampaign,
  language,
  setLanguage,
  run,
}: NewsletterCampaignFormProps) {
  return (
    <form
      className={styles.form5}
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await send('/admin/newsletter', campaign);
        });
      }}
    >
      <Heading as="h3">{ot(lang, 'campaign')}</Heading>
      <div className={styles.div4}>
        {languages.map((l) => (
          <Button
            type="button"
            key={l}
            aria-pressed={language === l}
            onClick={() => setLanguage(l)}
          >
            {l.toUpperCase()}
          </Button>
        ))}
      </div>
      <Label>
        {ot(lang, 'subject')}
        <Input
          value={campaign.subject[language]}
          onChange={(e) =>
            setCampaign((c) => ({
              ...c,
              subject: { ...c.subject, [language]: e.target.value },
            }))
          }
        />
      </Label>
      <Label>
        {ot(lang, 'text')}
        <Textarea
          rows={6}
          value={campaign.text[language]}
          onChange={(e) =>
            setCampaign((c) => ({
              ...c,
              text: { ...c.text, [language]: e.target.value },
            }))
          }
        />
      </Label>
      <Label>
        {ot(lang, 'frequency')}
        <Select
          value={campaign.repeat}
          onChange={(e) =>
            setCampaign((c) => ({
              ...c,
              repeat: e.target.value as Campaign['repeat'],
            }))
          }
        >
          {(['once', 'daily', 'weekly', 'monthly'] as const).map((r) => (
            <option value={r} key={r}>
              {ot(lang, r)}
            </option>
          ))}
        </Select>
      </Label>
      <Label>
        {ot(lang, 'schedule')} (
        {new Intl.DateTimeFormat().resolvedOptions().timeZone})
        <Input
          type="datetime-local"
          required
          value={new Date(
            campaign.nextSendAt -
              new Date(campaign.nextSendAt).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)}
          onChange={(e) => {
            const n = new Date(e.target.value).getTime();
            if (Number.isFinite(n))
              setCampaign((c) => ({ ...c, nextSendAt: n }));
          }}
        />
      </Label>
      <Label className={styles.label4}>
        <Input
          type="checkbox"
          checked={campaign.active}
          onChange={(e) =>
            setCampaign((c) => ({
              ...c,
              active: e.target.checked,
            }))
          }
        />
        {ot(lang, 'enabled')}
      </Label>
      <Button className={styles.button7} disabled={busy} aria-busy={busy}>
        {t(lang, 'save')}
      </Button>
    </form>
  );
}
