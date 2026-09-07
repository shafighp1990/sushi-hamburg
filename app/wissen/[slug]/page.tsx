import {KnowledgeArticle} from '@/components/knowledge';
import {articles} from '@/lib/knowledge';
import {notFound} from 'next/navigation';
export const dynamicParams=false;
export function generateStaticParams(){return articles.map(a=>({slug:a.id}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const a=articles.find(a=>a.id===slug);return {title:a?`${a.title.de} | Sushi Hamburg`:'Sushi-Wissen',description:a?.body.de[0]}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const{slug}=await params;if(!articles.some(a=>a.id===slug))notFound();return <KnowledgeArticle id={slug}/>}
