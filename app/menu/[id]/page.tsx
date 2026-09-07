import {ProductDetail} from '@/components/knowledge';
import {products} from '@/lib/catalog';
import {notFound} from 'next/navigation';
export const dynamicParams=false;
export function generateStaticParams(){return products.map(p=>({id:p.id}))}
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const{id}=await params;const p=products.find(p=>p.id===id);return {title:p?`${p.name.de} · Zutaten & Bestellung | Sushi Hamburg`:'Sushi Hamburg',description:p?.description.de}}
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;if(!products.some(p=>p.id===id))notFound();return <ProductDetail id={id}/>}
