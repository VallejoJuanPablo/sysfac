import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/dashboard/stats
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const totalPresupuestos = await prisma.presupuesto.count();

    // Presupuestos del mes actual
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const presupuestosMes = await prisma.presupuesto.count({
      where: { createdAt: { gte: inicioMes } },
    });

    // Monto total de todos los presupuestos
    const montoResult = await prisma.presupuesto.aggregate({
      _sum: { total: true },
    });
    const montoTotal = montoResult._sum.total || 0;

    // Total servicios registrados
    const totalServicios = await prisma.servicio.count({ where: { activo: true } });

    res.json({
      totalPresupuestos,
      presupuestosMes,
      montoTotal,
      totalServicios,
    });
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export { router as dashboardRoutes };
