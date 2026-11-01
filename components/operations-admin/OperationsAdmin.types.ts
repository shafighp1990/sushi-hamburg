import type { Provider } from '@/lib/operations';
import type { Campaign } from '@/lib/shop-types';

export type PaymentConnection = {
  provider: Provider;
  fields: { key: string; present: boolean; value?: string }[];
  configured?: boolean;
};
export type ConnectionResponse = {
  providers: PaymentConnection[];
  methods: Record<Provider, boolean>;
};
export type SubscriberCount = {
  state: 'active' | 'pending' | 'unsubscribed';
  n: number;
};
export type NewsletterResponse = {
  campaigns: Campaign[];
  subscribers: SubscriberCount[];
};
export type MailRecord = {
  id: string;
  recipient: string;
  kind: string;
  state: string;
  error: string | null;
};
export type EmailState = {
  configured?: boolean;
  from?: string;
  local?: boolean;
  preview?: boolean;
};
