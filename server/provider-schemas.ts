import { z } from 'zod';
export const paymentResponse = z.object({
  id: z.string().nullish(),
  url: z.string().nullish(),
  status: z.string().nullish(),
  state: z.string().nullish(),
  client_reference_id: z.string().nullish(),
  metadata: z.object({ order_id: z.string().nullish() }).nullish(),
  amount_total: z.number().nullish(),
  currency: z.string().nullish(),
  payment_status: z.string().nullish(),
  payment_intent: z.union([z.string(), z.object({ id: z.string() })]).nullish(),
  links: z.array(z.object({ rel: z.string(), href: z.string() })).nullish(),
  purchase_units: z
    .array(
      z.object({
        custom_id: z.string().nullish(),
        reference_id: z.string().nullish(),
        payee: z.object({ merchant_id: z.string().nullish() }).nullish(),
        payments: z
          .object({
            captures: z
              .array(
                z.object({
                  id: z.string(),
                  status: z.string(),
                  amount: z
                    .object({ currency_code: z.string(), value: z.string() })
                    .nullish(),
                }),
              )
              .nullish(),
          })
          .nullish(),
      }),
    )
    .nullish(),
  amount: z.number().nullish(),
  checkout_reference: z.string().nullish(),
  merchant_code: z.string().nullish(),
  merchant_order_data: z.object({ reference: z.string().nullish() }).nullish(),
  hosted_checkout_url: z.string().nullish(),
  checkout_url: z.string().nullish(),
  refunded_amount: z.number().nullish(),
  outstanding_amount: z.number().nullish(),
  transaction_id: z.string().nullish(),
  transactions: z.array(z.object({ status: z.string() })).nullish(),
});
export const additionalResponse = z.union([
  z.array(paymentResponse),
  paymentResponse.extend({ orders: z.array(paymentResponse).nullish() }),
]);
export const webhookEvent = z.object({
  id: z.string().nullish(),
  order_id: z.string().nullish(),
  type: z.string().nullish(),
  event_type: z.string().nullish(),
  data: z
    .object({
      object: z
        .object({
          id: z.string().nullish(),
          payment_intent: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish(),
  resource: z
    .object({
      id: z.string().nullish(),
      supplementary_data: z
        .object({
          related_ids: z
            .object({
              order_id: z.string().nullish(),
              capture_id: z.string().nullish(),
            })
            .nullish(),
        })
        .nullish(),
    })
    .nullish(),
});
