import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import '@fontsource/newsreader/400.css';
import './globals.css';

export const metadata: Metadata = { title: 'Capiro', description: 'Government affairs workspace' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={GeistSans.variable}><body>{children}</body></html>;
}
