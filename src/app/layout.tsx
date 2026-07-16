import React from 'react';
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'EduTrack — Planificación Docente y Evaluación Criterial FP',
  description: 'EduTrack ayuda a docentes de FP a planificar módulos, gestionar criterios de evaluación, calificar alumnado y hacer seguimiento del progreso del grupo.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

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
