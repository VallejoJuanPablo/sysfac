import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña requeridos' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({ where: { username } });

    if (!usuario || !usuario.activo) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    const valid = await bcrypt.compare(password, usuario.password);
    if (!valid) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.userId },
      select: { id: true, username: true, nombre: true, rol: true },
    });

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export { router as authRoutes };
