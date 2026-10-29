import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QoriTupuy — Automatización de Calificación de Exámenes con IA',
  description: 'SaaS educativo para la corrección caligráfica y automatizada de exámenes manuscritos con visión multimodal y Gemini 1.5 Pro.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}

