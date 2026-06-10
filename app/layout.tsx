import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Dan-sha-ri | Cost Tracker',
  description: 'Minimalist consumption cost tracker',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`}>
      <body className="font-sans bg-gray-50 text-slate-900 antialiased min-h-screen flex flex-col selection:bg-slate-200 selection:text-slate-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
