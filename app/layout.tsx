import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Sushi Hamburg · Frisch gerollt. Direkt zu dir.',description:'Sushi, Maki und Sets in Hamburg. Donnerstag bis Sonntag. Bestellungen bis 13 Uhr, Lieferung bis 21 Uhr. Menü entdecken und über Telegram bestellen.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="de"><body>{children}</body></html>}
