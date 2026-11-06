import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Permitir hasta 100MB y tiempo de ejecución adecuado
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se ha proporcionado ningún archivo.' },
        { status: 400 }
      );
    }

    // Validar tipo PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Formato inválido: solo se admiten archivos en formato PDF.' },
        { status: 400 }
      );
    }

    // Validar tamaño máximo (100MB)
    const MAX_SIZE_BYTES = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 100MB.' },
        { status: 400 }
      );
    }

    // Directorio de destino en public/uploads/
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Sanitizar nombre de archivo
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}_${safeName}`;
    const absolutePath = path.join(uploadsDir, uniqueFileName);

    // Escribir archivo físicamente en disco
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(absolutePath, buffer);

    // Ruta pública para visualización en navegador (ej: /uploads/123456_examen.pdf)
    const publicUrl = `/uploads/${uniqueFileName}`;

    console.log(`📁 [Upload Local Exitoso]: Guardado en ${absolutePath} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    return NextResponse.json({
      success: true,
      fileName: uniqueFileName,
      originalName: file.name,
      sizeBytes: file.size,
      publicUrl,       // Para iframe y visor de PDF en el frontend
      absolutePath,    // Para lectura directa con fs en el servidor
    });
  } catch (error: any) {
    console.error('❌ Error al guardar archivo localmente:', error);
    return NextResponse.json(
      { error: `Error al almacenar el archivo en disco: ${error.message}` },
      { status: 500 }
    );
  }
}

