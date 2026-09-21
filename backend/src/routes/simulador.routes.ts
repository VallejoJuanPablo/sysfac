import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth.middleware';
import { generarPdfCotizacion } from '../services/simulador-pdf.service';
import { generarContratoPdf } from '../services/contrato-pdf.service';

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

    if (!montoFinanciar || !plazo || !tna) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    const cotizacion = await prisma.cotizacion.create({
      data: {
        tipoPrestamo: req.body.tipoPrestamo || 'prendario',
        entidad: req.body.entidad || 'Reka Cobranzas',
        nombre: nombre || '',
        valorVehiculo: valorVehiculo || 0,
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

// Generar contrato PDF
router.post('/contrato', async (req: AuthRequest, res: Response) => {
  try {
    const { montoFinanciar, plazo, tna } = req.body;
    if (!montoFinanciar || !plazo || !tna) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    const data = {
      entidad: req.body.entidad || 'Reka Cobranzas',
      tipoPrestamo: req.body.tipoPrestamo || 'prendario',
      deudorNombre: req.body.deudorNombre || '',
      deudorDni: req.body.deudorDni || '',
      deudorDomicilio: req.body.deudorDomicilio || '',
      deudorTelefono: req.body.deudorTelefono || '',
      nombre: req.body.nombre || '',
      valorVehiculo: req.body.valorVehiculo || 0,
      montoFinanciar,
      plazo,
      tna,
      sistema: req.body.sistema || 'frances',
      condicion: req.body.condicion || '0km',
      cuotaPura: req.body.cuotaPura || 0,
      cuotaTotal: req.body.cuotaTotal || 0,
      totalIntereses: req.body.totalIntereses || 0,
      costoTotal: req.body.costoTotal || 0,
    };

    const pdfBuffer = await generarContratoPdf(data);

    const nombreStr = (data.deudorNombre || data.nombre || 'contrato')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    const fechaStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `contrato_${fechaStr}_${nombreStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error al generar contrato:', err);
    res.status(500).json({ error: 'Error al generar contrato' });
  }
});

// Generar PDF directo (sin guardar)
router.post('/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const { montoFinanciar, plazo, tna } = req.body;
    if (!montoFinanciar || !plazo || !tna) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    const data = {
      tipoPrestamo: req.body.tipoPrestamo || 'prendario',
      entidad: req.body.entidad || 'Reka Cobranzas',
      nombre: req.body.nombre || '',
      valorVehiculo: req.body.valorVehiculo || 0,
      montoFinanciar,
      plazo,
      tna,
      sistema: req.body.sistema || 'frances',
      condicion: req.body.condicion || '0km',
      seguroAutoAnual: req.body.seguroAutoAnual || 0,
      seguroVidaMensual: req.body.seguroVidaMensual || 0,
      gastoAdminMensual: req.body.gastoAdminMensual || 0,
      ivaIntereses: req.body.ivaIntereses || false,
      cuotaPura: req.body.cuotaPura || 0,
      cuotaTotal: req.body.cuotaTotal || 0,
      totalIntereses: req.body.totalIntereses || 0,
      costoTotal: req.body.costoTotal || 0,
      createdAt: new Date(),
    };

    const pdfBuffer = await generarPdfCotizacion(data);

    const nombreStr = (data.nombre || 'cotizacion')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    const fechaStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `simulacion_${fechaStr}_${nombreStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error al generar PDF directo:', err);
    res.status(500).json({ error: 'Error al generar PDF' });
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
