import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { generarPdf } from '../services/pdf.service';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/presupuestos
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const presupuestos = await prisma.presupuesto.findMany({
      include: { items: { include: { servicio: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(presupuestos);
  } catch (error) {
    console.error('Error listando presupuestos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/presupuestos/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: parseInt(req.params.id as string) },
      include: { items: { include: { servicio: true } } },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    res.json(presupuesto);
  } catch (error) {
    console.error('Error obteniendo presupuesto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/presupuestos
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { cliente, formaPago, garantia, responsable, items } = req.body;

    if (!cliente || !cliente.trim()) {
      res.status(400).json({ error: 'El cliente es requerido' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Debe agregar al menos un servicio' });
      return;
    }

    // Validar items
    for (const item of items) {
      if (!item.descripcion || !item.descripcion.trim()) {
        res.status(400).json({ error: 'Cada servicio debe tener descripción' });
        return;
      }
      if (!item.cantidad || item.cantidad < 1) {
        res.status(400).json({ error: 'La cantidad debe ser al menos 1' });
        return;
      }
      if (!item.precioUnitario || item.precioUnitario <= 0) {
        res.status(400).json({ error: 'El precio debe ser mayor a 0' });
        return;
      }
    }

    // Obtener siguiente número
    const ultimo = await prisma.presupuesto.findFirst({
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const numero = (ultimo?.numero || 0) + 1;

    // Crear/vincular servicios y calcular total
    let total = 0;
    const itemsData = [];

    for (const item of items) {
      const subtotal = item.cantidad * item.precioUnitario;
      total += subtotal;

      // Buscar o crear servicio
      let servicioId: number | null = null;
      const existente = await prisma.servicio.findUnique({
        where: { nombre: item.descripcion.trim() },
      });

      if (existente) {
        servicioId = existente.id;
        // Actualizar precio default
        await prisma.servicio.update({
          where: { id: existente.id },
          data: { precioDefault: item.precioUnitario },
        });
      } else {
        const nuevo = await prisma.servicio.create({
          data: {
            nombre: item.descripcion.trim(),
            precioDefault: item.precioUnitario,
          },
        });
        servicioId = nuevo.id;
      }

      itemsData.push({
        servicioId,
        descripcion: item.descripcion.trim(),
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal,
      });
    }

    const presupuesto = await prisma.presupuesto.create({
      data: {
        numero,
        cliente: cliente.trim(),
        tipo: 'general',
        formaPago: formaPago || 'Transferencia/efectivo',
        garantia: garantia || 'Servicio con garantía de 6 meses del trabajo realizado. (desde día de la fecha)',
        responsable: responsable || 'Centurión Matias',
        estado: 'borrador',
        total,
        items: { create: itemsData },
      },
      include: { items: { include: { servicio: true } } },
    });

    res.status(201).json(presupuesto);
  } catch (error) {
    console.error('Error creando presupuesto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/presupuestos/:id/pdf
router.get('/:id/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: parseInt(req.params.id as string) },
      include: { items: { include: { servicio: true } } },
    });

    if (!presupuesto) {
      res.status(404).json({ error: 'Presupuesto no encontrado' });
      return;
    }

    // Obtener config empresa
    const configRows = await prisma.configuracion.findMany();
    const config: Record<string, string> = {};
    configRows.forEach((c) => (config[c.clave] = c.valor));

    const pdfBuffer = await generarPdf(presupuesto, config);

    const fecha = new Date(presupuesto.fecha);
    const fechaStr = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;
    const clienteStr = presupuesto.cliente.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const fileName = `presupuesto_${fechaStr}_${clienteStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ error: 'Error generando PDF' });
  }
});

export { router as presupuestosRoutes };
