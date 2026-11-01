import { handleShop } from '../../server/api';
import type { PaymentEnv } from '../../server/payments';

export const onRequest: PagesFunction<PaymentEnv> = ({
  request,
  env,
  waitUntil,
}) => handleShop(request, env, { waitUntil });
