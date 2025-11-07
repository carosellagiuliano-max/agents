import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { ensureCsrfToken } from '@/lib/security/csrf';

import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Schnittwerk by Vanessa Carosella',
    template: '%s | Schnittwerk by Vanessa Carosella',
  },
  description:
    'Schnittwerk – Premium Hairstyling, Farbexpertise und nachhaltige Produkte in St. Gallen. Jetzt Termin sichern.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.schnittwerk-vanessa.ch'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  ensureCsrfToken();
  return (
    <html className="scroll-smooth" lang="de-CH">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
