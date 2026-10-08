import handler from 'vinext/server/fetch-handler';
import { handleShop } from '../server/api';
export default {
  fetch(request: Request, env: any, ctx: ExecutionContext) {
    return new URL(request.url).pathname.startsWith('/api/')
      ? handleShop(request, env)
      : handler.fetch(request, env, ctx);
  },
};
