import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@securedocs.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Administrador';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    console.log(`[seed] Usuario admin ya existe: ${adminEmail}`);
    return;
  }

  const passwordHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: 'admin',
    },
  });

  console.log(`[seed] Usuario admin creado: ${admin.email} (id: ${admin.id})`);
  console.log(`[seed] Contraseña: ${adminPassword}`);
  console.log('[seed] Cambia la contraseña después del primer inicio de sesión.');
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
