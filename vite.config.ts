import {sites} from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import {defineConfig} from 'vite';
export default defineConfig(async()=>{
 process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= 'false';
 process.env.WRANGLER_SEND_METRICS ??= 'false';
 process.env.WRANGLER_WRITE_LOGS ??= 'false';
 const isStatic=process.env.SUSHI_STATIC==='1';
 const {cloudflare}=await import('@cloudflare/vite-plugin');
 return {resolve:{dedupe:['zod']},css:{postcss:{plugins:[tailwindcss()]}},server:{host:'127.0.0.1',port:5173,strictPort:true,watch:{useFsEvents:false,usePolling:true,ignored:['**/assets/**']}},plugins:[vinext(),sites(),...isStatic?[]:[cloudflare({viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false,config:{name:'sushi-hamburg',main:'./build/worker.ts',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],triggers:{crons:['*/5 * * * *']},d1_databases:[{binding:'DB',database_name:'sushi-hamburg',database_id:'00000000-0000-4000-8000-000000000000'}],r2_buckets:[{binding:'BUCKET',bucket_name:'sushi-hamburg-media'}]}})]]};
});
