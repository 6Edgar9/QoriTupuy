'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Qori<span className="text-amber-600">Tupuy</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              SaaS Universitario
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Motor: Gemini 1.5 Pro Multimodal</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              DOC
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        QoriTupuy &copy; {new Date().getFullYear()} — Plataforma de Corrección Caligráfica Automatizada para Exámenes Universitarios.
      </footer>
    </div>
  );
}

