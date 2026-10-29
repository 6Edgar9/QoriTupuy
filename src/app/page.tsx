import Link from 'next/link';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/80 text-amber-900 text-xs font-bold border border-amber-200 shadow-sm">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Inteligencia Artificial Multimodal Universitaria</span>
        </div>

        {/* Título y Descripción */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight">
            Qori<span className="text-amber-600">Tupuy</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Automatiza la calificación de exámenes manuscritos escaneados utilizando visión computacional de última generación con <strong className="text-slate-800">Gemini 1.5 Pro</strong>.
          </p>
        </div>

        {/* Beneficios clave */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Calificación Aprobada &ge; 85%</h3>
            <p className="text-xs text-slate-500 mt-1">
              Lectura y cálculo de notas automático ordenado alfabéticamente A-Z.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Bandeja de Revisión &lt; 85%</h3>
            <p className="text-xs text-slate-500 mt-1">
              Detección de tachones o dudas caligráficas con ajuste lateral manual.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">PDFs Pesados hasta 100MB</h3>
            <p className="text-xs text-slate-500 mt-1">
              Subida reanudable tolerante a fallas directo a Cloud Storage.
            </p>
          </div>
        </div>

        {/* Botón de acceso directo al Dashboard de Sección */}
        <div className="pt-4 flex items-center justify-center gap-4">
          <Link
            href="/secciones/fila-a?cursoId=MAT-201&evaluacionId=PARCIAL-1"
            className="inline-flex items-center gap-3 px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-600/25 transition-all text-sm group"
          >
            <span>Ir al Dashboard de Evaluación (Fila A)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

