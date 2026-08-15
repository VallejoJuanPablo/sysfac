import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('pituco', 10);
  await prisma.usuario.upsert({
    where: { username: 'pituco' },
    update: {},
    create: {
      username: 'pituco',
      password: hashedPassword,
      nombre: 'Administrador',
      rol: 'admin',
      activo: true,
    },
  });
  console.log('Usuario admin creado: pituco/pituco');

  // Configuración de empresa
  const config = [
    { clave: 'empresa_nombre', valor: 'MC Soluciones en Frío' },
    { clave: 'empresa_direccion', valor: 'Av. Armenia 2932' },
    { clave: 'empresa_ciudad', valor: 'Corrientes Capital' },
    { clave: 'empresa_email', valor: 'dr.frio@gmail.com' },
    { clave: 'empresa_telefono', valor: '3794-771259' },
    { clave: 'empresa_responsable', valor: 'Centurión Matias' },
  ];

  for (const c of config) {
    await prisma.configuracion.upsert({
      where: { clave: c.clave },
      update: { valor: c.valor },
      create: c,
    });
  }
  console.log('Configuración de empresa creada');

  // Servicios iniciales de ejemplo
  const servicios = [
    { nombre: 'Servicio limpieza split 3.500 fr equipo exterior', precioDefault: 95000 },
    { nombre: 'Extensión de cañería', precioDefault: 80000 },
    { nombre: 'Limpieza y pintura de pared', precioDefault: 50000 },
  ];

  for (const s of servicios) {
    await prisma.servicio.upsert({
      where: { nombre: s.nombre },
      update: {},
      create: s,
    });
  }
  console.log('Servicios iniciales creados');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
