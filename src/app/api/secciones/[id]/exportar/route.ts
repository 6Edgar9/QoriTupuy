import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: seccionId } = await context.params;

    if (!seccionId) {
      return NextResponse.json(
        { error: 'El ID de la sección es obligatorio.' },
        { status: 400 }
      );
    }

    // Consultar datos de la sección y evaluación
    const seccion = await prisma.seccion.findUnique({
      where: { id: seccionId },
      include: {
        evaluacion: {
          include: {
            curso: true,
          },
        },
      },
    });

    if (!seccion) {
      return NextResponse.json(
        { error: 'Sección no encontrada.' },
        { status: 404 }
      );
    }

    // Consultar únicamente los exámenes válidos con confianza de lectura confirmada
    const examenes = await prisma.examenAlumno.findMany({
      where: {
        seccion_id: seccionId,
        confianza_lectura: true,
      },
      orderBy: [
        { nombre: 'asc' },
      ],
    });

    if (examenes.length === 0) {
      return NextResponse.json(
        { error: 'No hay exámenes calificados válidos para exportar en esta sección.' },
        { status: 400 }
      );
    }

    // Mapeo estricto para formato de importación universitaria USS
    const filasExportar = examenes.map((ex, index) => ({
      'N°': index + 1,
      'Código_Alumno': ex.codigo_alumno || '—',
      'Apellidos_Nombres': ex.nombre.trim(),
      'Nota_Final': Number(ex.nota_total.toFixed(2)),
      'Nota_Máxima': ex.nota_maxima || 20,
      'Condición': ex.nota_total >= 10.5 ? 'APROBADO' : 'DESAPROBADO',
      'Estado_Revisión': ex.estado_revision === 'corregido_manual' ? 'Revisión Manual' : 'Validado IA',
    }));

    // Crear libro y hoja de cálculo con XLSX
    const worksheet = XLSX.utils.json_to_sheet(filasExportar);

    // Ajuste de anchos de columna para presentación profesional
    worksheet['!cols'] = [
      { wch: 5 },  // N°
      { wch: 16 }, // Código_Alumno
      { wch: 35 }, // Apellidos_Nombres
      { wch: 12 }, // Nota_Final
      { wch: 12 }, // Nota_Máxima
      { wch: 14 }, // Condición
      { wch: 18 }, // Estado_Revisión
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registro_Notas_USS');

    // Generar buffer XLSX
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Sanitizar nombre de archivo
    const seccionNombreClean = seccion.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cursoNombreClean = seccion.evaluacion?.curso?.nombre?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Curso';
    const fileName = `Notas_USS_${cursoNombreClean}_${seccionNombreClean}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error al exportar notas a Excel:', error);
    return NextResponse.json(
      { error: 'Error al exportar a Excel: ' + (error.message || 'Error desconocido') },
      { status: 500 }
    );
  }
}

