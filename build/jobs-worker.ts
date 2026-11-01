import {runJobs} from '../server/jobs';
import type {PaymentEnv} from '../server/payments';
export default {
 scheduled(_event:ScheduledController,env:PaymentEnv,ctx:ExecutionContext){
  if(!env.SHOP_ORIGIN)throw new Error('SHOP_ORIGIN is required for scheduled mail');
  ctx.waitUntil(runJobs(env,env.SHOP_ORIGIN));
 },
 fetch(){return new Response('Not found',{status:404});}
};
