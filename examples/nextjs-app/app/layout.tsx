import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@tryonit/react/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'TryOnIt + Next.js',
  description: 'Virtual try-on on a Next.js App Router product page with TryOnIt.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
