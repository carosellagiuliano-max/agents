import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Schnittwerk by Vanessa Carosella | Friseursalon St. Gallen',
  description:
    'Ihr Friseursalon in St. Gallen. Online Terminbuchung, professionelle Haarpflege und Styling. Rorschacher Str. 152, 9000 St. Gallen.',
  keywords: ['Friseur', 'St. Gallen', 'Haare', 'Styling', 'Terminbuchung', 'Salon'],
  authors: [{ name: 'Schnittwerk by Vanessa Carosella' }],
  openGraph: {
    title: 'Schnittwerk by Vanessa Carosella',
    description: 'Ihr Friseursalon in St. Gallen',
    type: 'website',
    locale: 'de_CH',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de-CH">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
