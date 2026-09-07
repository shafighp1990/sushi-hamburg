import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Sushi HH Hamburg · Speisekarte & Bestellung',icons:{icon:[{url:'/brand/sushi-hh-icon.svg',type:'image/svg+xml'}],apple:'/brand/sushi-hh-original.jpg'},description:'Sushi, Maki und Sets in Hamburg. Donnerstag bis Sonntag. Bestellungen bis 13 Uhr, Lieferung bis 21 Uhr. Menü entdecken und über Telegram bestellen.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="de"><head><link rel="preload" href="/fonts/unbounded.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/><link rel="preload" href="/fonts/golos-text.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body>{children}</body></html>}
