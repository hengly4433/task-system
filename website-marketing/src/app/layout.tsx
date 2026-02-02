import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: 'BiTi - Task Management Platform',
  description: 'Powerful task management platform designed to help teams collaborate, organize projects, and achieve their goals efficiently.',
  keywords: ['task management', 'project management', 'team collaboration', 'productivity'],
  openGraph: {
    title: 'BiTi - Task Management Platform',
    description: 'Powerful task management platform designed to help teams collaborate, organize projects, and achieve their goals efficiently.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <Providers>
          <Header />
          <main style={{ paddingTop: '80px' }}>
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
