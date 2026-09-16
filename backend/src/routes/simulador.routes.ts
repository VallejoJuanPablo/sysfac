import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth.middleware';
import { generarPdfCotizacion } from '../services/simulador-pdf.service';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Guardar cotización
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      nombre,
      valorVehiculo,
      montoFinanciar,
      plazo,
      tna,
      sistema,
      condicion,
      seguroAutoAnual,
      seguroVidaMensual,
      gastoAdminMensual,
      ivaIntereses,
      cuotaPura,
      cuotaTotal,
      totalIntereses,
      costoTotal,
    } = req.body;

    if (!valorVehiculo || !montoFinanciar || !plazo || !tna) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    const cotizacion = await prisma.cotizacion.create({
      data: {
        nombre: nombre || '',
        valorVehiculo,
        montoFinanciar,
        plazo,
        tna,
        sistema: sistema || 'frances',
        condicion: condicion || '0km',
        seguroAutoAnual: seguroAutoAnual || 0,
        seguroVidaMensual: seguroVidaMensual || 0,
        gastoAdminMensual: gastoAdminMensual || 0,
        ivaIntereses: ivaIntereses || false,
        cuotaPura,
        cuotaTotal,
        totalIntereses,
        costoTotal,
      },
    });

    res.status(201).json(cotizacion);
  } catch (err) {
    console.error('Error al guardar cotización:', err);
    res.status(500).json({ error: 'Error al guardar cotización' });
  }
});

// Listar cotizaciones
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(cotizaciones);
  } catch (err) {
    console.error('Error al listar cotizaciones:', err);
    res.status(500).json({ error: 'Error al listar cotizaciones' });
  }
});

// Obtener una cotización
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: parseInt(req.params.id as string) },
    });
    if (!cotizacion) {
      res.status(404).json({ error: 'Cotización no encontrada' });
      return;
    }
    res.json(cotizacion);
  } catch (err) {
    console.error('Error al obtener cotización:', err);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
});

// Eliminar cotización
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.cotizacion.delete({
      where: { id: parseInt(req.params.id as string) },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar cotización:', err);
    res.status(500).json({ error: 'Error al eliminar cotización' });
  }
});

// Generar PDF de cotización
router.get('/:id/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: parseInt(req.params.id as string) },
    });
    if (!cotizacion) {
      res.status(404).json({ error: 'Cotización no encontrada' });
      return;
    }

    const pdfBuffer = await generarPdfCotizacion(cotizacion);

    const fechaStr = cotizacion.createdAt.toISOString().slice(0, 10).replace(/-/g, '');
    const nombreStr = (cotizacion.nombre || 'cotizacion')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    const fileName = `simulacion_${fechaStr}_${nombreStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error al generar PDF:', err);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
});

export const simuladorRoutes = router;
