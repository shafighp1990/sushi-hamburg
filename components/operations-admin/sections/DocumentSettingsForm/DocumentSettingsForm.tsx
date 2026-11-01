'use client';
import { send } from '@/lib/shop-api';
import { t } from '@/lib/shop-copy';
import { ot } from '@/lib/operations-copy';
import { Label } from '@/components/primitives/Label';
import { Input } from '@/components/primitives/Input';
import { Heading } from '@/components/primitives/Heading';
import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { styles } from './DocumentSettingsForm.styles';
import type { DocumentSettingsFormProps } from './DocumentSettingsForm.types';

export function DocumentSettingsForm({
  lang,
  busy,
  email,
  setEmail,
  emailState,
  run,
}: DocumentSettingsFormProps) {
  return (
    <form
      className={styles.form7}
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await send('/admin/email', email);
          setEmail((v) => ({ ...v, apiKey: '' }));
        });
      }}
    >
      <Heading as="h3">{ot(lang, 'emailService')}</Heading>
      {emailState.local && (
        <Text className={styles.text2}>{ot(lang, 'localMail')}</Text>
      )}
      <Text>{emailState.configured ? '✓' : '—'}</Text>
      <Label>
        Resend API key
        <Input
          type="password"
          autoComplete="new-password"
          value={email.apiKey}
          onChange={(e) => setEmail((v) => ({ ...v, apiKey: e.target.value }))}
        />
      </Label>
      <Label>
        {ot(lang, 'sender')}
        <Input
          type="email"
          value={email.from}
          onChange={(e) => setEmail((v) => ({ ...v, from: e.target.value }))}
        />
      </Label>
      <Button className={styles.button10} disabled={busy} aria-busy={busy}>
        {t(lang, 'save')}
      </Button>
    </form>
  );
}
