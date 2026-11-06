import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DesglosePregunta } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seccionId = searchParams.get('seccionId');
    const tipo = searchParams.get('tipo'); // 'aprobados' | 'revision' | undefined (todos)

    if (!seccionId) {
      return NextResponse.json(
        { error: 'El parámetro seccionId es requerido.' },
        { status: 400 }
      );
    }

    const whereClause: Record<string, any> = {
      seccion_id: seccionId,
    };

    if (tipo === 'aprobados' || tipo === 'confiables') {
      whereClause.confianza_lectura = true;
    } else if (tipo === 'revision' || tipo === 'urgente') {
      whereClause.confianza_lectura = false;
    }

    const examenes = await prisma.examenAlumno.findMany({
      where: whereClause,
      orderBy:
        tipo === 'aprobados' || tipo === 'confiables'
          ? [{ nombre: 'asc' }]
          : [{ creado_el: 'desc' }],
    });

    const parsedExamenes = examenes.map((ex: any) => {
      let desglose_json: DesglosePregunta[] = [];
      try {
        desglose_json =
          typeof ex.desglose_json === 'string'
            ? JSON.parse(ex.desglose_json)
            : ex.desglose_json;
      } catch (e) {
        desglose_json = [];
      }

      let detalle_respuestas = [];
      try {
        detalle_respuestas =
          typeof ex.detalle_respuestas === 'string'
            ? JSON.parse(ex.detalle_respuestas)
            : ex.detalle_respuestas || [];
      } catch (e) {
        detalle_respuestas = [];
      }

      return {
        ...ex,
        desglose_json,
        detalle_respuestas,
      };
    });

    return NextResponse.json(parsedExamenes);
  } catch (error: any) {
    console.error('Error al listar exámenes:', error);
    return NextResponse.json(
      { error: 'Error al obtener exámenes: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nota_total, estado_revision, motivo_revision_manual, revisado_por, confianza_lectura } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El id del examen es requerido.' },
        { status: 400 }
      );
    }

    const examenActualizado = await prisma.examenAlumno.update({
      where: { id },
      data: {
        ...(nota_total !== undefined && { nota_total: Number(nota_total) }),
        ...(estado_revision && { estado_revision }),
        ...(motivo_revision_manual !== undefined && { motivo_revision_manual }),
        ...(revisado_por !== undefined && { revisado_por }),
        ...(confianza_lectura !== undefined && { confianza_lectura: Boolean(confianza_lectura) }),
      },
    });

    let desglose_json: DesglosePregunta[] = [];
    try {
      desglose_json =
        typeof examenActualizado.desglose_json === 'string'
          ? JSON.parse(examenActualizado.desglose_json)
          : (examenActualizado.desglose_json as any);
    } catch (e) {
      desglose_json = [];
    }

    return NextResponse.json({
      ...examenActualizado,
      desglose_json,
    });
  } catch (error: any) {
    console.error('Error al actualizar examen:', error);
    return NextResponse.json(
      { error: 'Error al actualizar examen: ' + error.message },
      { status: 500 }
    );
  }
}
