import { cookies } from "next/headers";
import { isLanguage, languageKey } from "@/lib/language-preference";
import type { Metadata } from 'next';
import './globals.css';
import './shop.css';
import './samples.css'; // Local sample collection, October 2026.
import {ShopProvider} from '@/components/shop-context';
export const metadata: Metadata = {title:'Sushi HH Hamburg · Sushi-Catering & Lieferung',icons:{icon:[{url:'/brand/sushi-hh-icon.svg',type:'image/svg+xml'}],apple:'/brand/sushi-hh-original.jpg'},description:'Sushi-Catering in Hamburg: Sushi, Maki und Sets mit Lieferung. Kein Verzehr vor Ort. Donnerstag bis Sonntag. Bestellungen bis 13 Uhr, Lieferung bis 21 Uhr. Menü entdecken, als Gast oder mit Kundenkonto bestellen.'};
export default async function RootLayout({children}:{children:React.ReactNode}){const saved = process.env.SUSHI_STATIC === "1" ? undefined : (await cookies()).get(languageKey)?.value; const language = isLanguage(saved) ? saved : "de"; return <html lang={language} dir={language === "fa" ? "rtl" : "ltr"}><head><link rel="preload" href="/fonts/cormorant-garamond.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/><link rel="preload" href="/fonts/golos-text.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body><ShopProvider initialLanguage={language}>{children}</ShopProvider></body></html>}
