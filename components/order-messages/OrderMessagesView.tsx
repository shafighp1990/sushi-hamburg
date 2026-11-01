"use client";
import { Button } from "@/components/primitives/Button";
import { Heading } from "@/components/primitives/Heading";
import { Text } from "@/components/primitives/Text";
import { Label } from "@/components/primitives/Label";
import { Textarea } from "@/components/primitives/Textarea";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { styles } from "./OrderMessages.styles";
import type { OrderMessagesViewProps } from "./OrderMessagesView.types";
export function OrderMessagesView({ lang, staff, copy, messages, cursor, draft, setDraft, loading, sending, error, notice, load, submit }: OrderMessagesViewProps) {
  return <section className={styles.section} aria-label={copy.title}>
    <div className={styles.heading}>
      <Heading as="h3">{copy.title}</Heading>
      <Button type="button" onClick={() => void load()} disabled={sending}>{copy.refresh}</Button>
    </div>
    <Text>{copy.private}</Text>
    {loading ? <FieldMessage>{copy.loading}</FieldMessage> : !messages.length && <Text>{copy.empty}</Text>}
    {cursor && <Button type="button" onClick={() => void load(cursor)}>{copy.older}</Button>}
    <ol className={styles.list} aria-live="polite" aria-relevant="additions">
      {messages.map((message) => <li key={message.id} data-sender={message.sender}>
        <div><Text as="strong">{message.sender === "team" ? copy.team : staff ? copy.customer : copy.you}</Text>
          <time dateTime={new Date(message.createdAt).toISOString()}>{new Intl.DateTimeFormat(lang, { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(message.createdAt)}</time></div>
        <Text>{message.text}</Text>
      </li>)}
    </ol>
    <form className={styles.form} onSubmit={submit}>
      <Label>{copy.message}<Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} maxLength={2000} required disabled={sending} placeholder={copy.placeholder} /></Label>
      <Button className={styles.button} disabled={sending || !draft.trim()} aria-busy={sending}>{sending ? copy.sending : copy.send}</Button>
    </form>
    {error && <FieldMessage tone="error">{error}</FieldMessage>}
    {notice && <FieldMessage tone="success">{notice}</FieldMessage>}
  </section>;
}
