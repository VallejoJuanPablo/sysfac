import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/servicios?q=texto
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const servicios = await prisma.servicio.findMany({
      where: {
        activo: true,
        ...(q ? { nombre: { contains: q } } : {}),
      },
      orderBy: { nombre: 'asc' },
    });
    res.json(servicios);
  } catch (error) {
    console.error('Error listando servicios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/servicios
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, precioDefault } = req.body;

    if (!nombre || !nombre.trim()) {
      res.status(400).json({ error: 'El nombre es requerido' });
      return;
    }

    const existente = await prisma.servicio.findUnique({
      where: { nombre: nombre.trim() },
    });

    if (existente) {
      res.status(409).json({ error: 'Ya existe un servicio con ese nombre', servicio: existente });
      return;
    }

    const servicio = await prisma.servicio.create({
      data: {
        nombre: nombre.trim(),
        precioDefault: precioDefault || 0,
      },
    });

    res.status(201).json(servicio);
  } catch (error) {
    console.error('Error creando servicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export { router as serviciosRoutes };
