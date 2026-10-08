import { handleShop } from '../../server/api';
export const onRequest: PagesFunction = ({ request, env }) =>
  handleShop(request, env as any);
