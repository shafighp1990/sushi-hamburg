import handler from 'vinext/server/fetch-handler';
import { handleShop } from '../server/api';
import { runJobs } from '../server/jobs';
export default {
  scheduled(_event:ScheduledController,env:any,ctx:ExecutionContext){ctx.waitUntil(runJobs(env,env.SHOP_ORIGIN));},
  fetch(request: Request, env: any, ctx: ExecutionContext) {
    return new URL(request.url).pathname.startsWith('/api/')
      ? handleShop(request, env,ctx)
      : handler.fetch(request, env, ctx);
  },
};
