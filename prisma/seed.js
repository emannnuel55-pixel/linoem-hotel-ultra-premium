import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando sembrado de la Base de Datos LINOEM...');

  const passwordHash = await bcrypt.hash('Hotel#2026!', 10);
  const adminPasswordHash = await bcrypt.hash('Admin#2026!Hotel', 10);
  const clientePasswordHash = await bcrypt.hash('Cliente123!', 10);

  // 1. Usuarios Default
  const users = [
    { email: 'admin@hotel.com', firstName: 'Super', lastName: 'Admin', role: 'Superadmin', passwordHash: adminPasswordHash, departmentKey: 'direccion', isVerified: true },
    { email: 'cliente@hotel.com', firstName: 'Cliente', lastName: 'Demo', role: 'Cliente', passwordHash: clientePasswordHash, isVerified: true },
    { email: 'recepcion@hotel.com', firstName: 'Recepción', lastName: 'Central', role: 'Recepcion', passwordHash, departmentKey: 'recepcion', isVerified: true },
    { email: 'limpieza@hotel.com', firstName: 'Jefe', lastName: 'Limpieza', role: 'Limpieza', passwordHash, departmentKey: 'limpieza', isVerified: true },
    { email: 'mantenimiento@hotel.com', firstName: 'Jefe', lastName: 'Mantenimiento', role: 'Mantenimiento', passwordHash, departmentKey: 'mantenimiento', isVerified: true },
    { email: 'gerencia@hotel.com', firstName: 'Gerente', lastName: 'General', role: 'Gerencia', passwordHash, departmentKey: 'direccion', isVerified: true },
    { email: 'finanzas@hotel.com', firstName: 'Analista', lastName: 'Finanzas', role: 'Finanzas', passwordHash, departmentKey: 'finanzas', isVerified: true }
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u
    });
    console.log(`👤 Usuario creado: ${u.email}`);
  }

  // 2. Habitaciones de Ejemplo
  const rooms = [
    { roomNumber: '101', floor: '1', roomType: 'Sencilla', capacity: 2, price: 1200, status: 'Disponible', description: 'Habitación cómoda y elegante.', amenities: '["Wifi", "TV", "Aire Acondicionado"]', images: '["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500"]' },
    { roomNumber: '102', floor: '1', roomType: 'Doble', capacity: 4, price: 1800, status: 'Mantenimiento', description: 'Ideal para familias pequeñas.', amenities: '["Wifi", "2 Camas Matrimoniales", "Mini refrigerador"]', images: '["https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=500"]' },
    { roomNumber: '201', floor: '2', roomType: 'Deluxe Ocean View', capacity: 2, price: 3200, status: 'Ocupada', description: 'Vista inigualable al mar con terraza privada.', amenities: '["Wifi", "Jacuzzi", "Balcón", "Minibar"]', images: '["https://images.unsplash.com/photo-1582719478250-c89cae4db85b?w=500"]' },
    { roomNumber: '301', floor: '3', roomType: 'Suite Presidencial', capacity: 2, price: 7500, status: 'Disponible', description: 'Lujo absoluto en nuestra mejor suite.', amenities: '["Todo Incluido", "Mayordomo", "Vista Panorámica", "Acceso VIP"]', images: '["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500"]' }
  ];

  for (const r of rooms) {
    await prisma.room.upsert({
      where: { roomNumber: r.roomNumber },
      update: {},
      create: r
    });
    console.log(`🛏️ Habitación creada: ${r.roomNumber} - ${r.roomType}`);
  }

  console.log('✅ Base de datos inicializada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error sembrando BD:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
