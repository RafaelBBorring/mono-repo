import './globals.css';
import { Cinzel, Sora, JetBrains_Mono } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-cinzel', display: 'swap' });
const sora = Sora({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sora', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-jetbrains', display: 'swap' });

export const metadata = {
  title: 'Hermes · Radar de Licitações para Software & Games',
  description: 'Hermes voa por entre os portais de contratação e retorna com as oportunidades de software e jogos — filtradas, decifradas por IA e prontas para candidatura.',
  keywords: ['licitações', 'software', 'games', 'PNCP', 'editais', 'desenvolvimento', 'Hermes'],
  metadataBase: new URL('https://hermes.local'),
  openGraph: {
    title: 'Hermes · Radar de Licitações',
    description: 'Descoberta, decifração e candidatura de licitações de Software & Games.',
    type: 'website'
  }
};

export const viewport = {
  themeColor: '#06060c',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${cinzel.variable} ${sora.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen antialiased selection:bg-caduceus/30">
        {children}
      </body>
    </html>
  );
}
