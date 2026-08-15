import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { authRoutes } from './routes/auth.routes';
import { presupuestosRoutes } from './routes/presupuestos.routes';
import { serviciosRoutes } from './routes/servicios.routes';
import { dashboardRoutes } from './routes/dashboard.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/presupuestos', presupuestosRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`SysFac backend corriendo en puerto ${PORT}`);
});
