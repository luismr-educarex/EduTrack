import React from 'react';
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { EduTrackProvider } from '@/contexts/EduTrackContext';
import AuthGate from '@/components/AuthGate';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https';
  const baseUrl = host ? `${protocol}://${host}` : 'http://localhost:4028';
  const title = 'EduTrack — Planificación Docente y Evaluación Criterial FP';
  const description =
    'EduTrack ayuda a docentes de FP a planificar módulos, evaluar por criterios y sincronizar las entregas online con MoodleSync.';
  const socialImage = new URL('/og.png', baseUrl).toString();

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    icons: {
      icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
    },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: socialImage, width: 1536, height: 1024, alt: 'EduTrack · MoodleSync para módulos online' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body className={ibmPlexSans.className}>
        <AuthProvider>
          <AuthGate>
            <EduTrackProvider>
              {children}
              <Toaster position="bottom-right" richColors closeButton />
            </EduTrackProvider>
          </AuthGate>
        </AuthProvider>
</body>
    </html>
  );
}
