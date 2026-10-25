import { PrismaClient, Role, AreaJuridica, EstadoExpediente, NivelSensibilidad, TipoEscrito, EstadoEscrito } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] Iniciando siembra de datos para Consultorio Jurídico...');

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'Consultorio2026!';
  const passwordHash = await argon2.hash(defaultPassword);

  // 1. Crear Director
  const director = await prisma.user.upsert({
    where: { email: 'director@consultorio.edu.co' },
    update: {},
    create: {
      email: 'director@consultorio.edu.co',
      name: 'Dr. Roberto Mendoza (Director)',
      passwordHash,
      role: Role.DIRECTOR,
      documentoIdentidad: '72154890',
      telefono: '3001234567',
      acuerdoConfidencialidad: true,
      fechaFirmaConfidencialidad: new Date(),
    },
  });

  // 2. Crear Docente Supervisor de Área Civil
  const docenteCivil = await prisma.user.upsert({
    where: { email: 'docente.civil@consultorio.edu.co' },
    update: {},
    create: {
      email: 'docente.civil@consultorio.edu.co',
      name: 'Dra. Claudia Morales (Docente Civil)',
      passwordHash,
      role: Role.DOCENTE_SUPERVISOR,
      areaAsignada: AreaJuridica.CIVIL,
      documentoIdentidad: '52418963',
      telefono: '3109876543',
      acuerdoConfidencialidad: true,
      fechaFirmaConfidencialidad: new Date(),
    },
  });

  // 3. Crear Pasante
  const pasante = await prisma.user.upsert({
    where: { email: 'pasante.juan@consultorio.edu.co' },
    update: {},
    create: {
      email: 'pasante.juan@consultorio.edu.co',
      name: 'Juan Pérez (Pasante 9no Semestre)',
      passwordHash,
      role: Role.PASANTE,
      areaAsignada: AreaJuridica.CIVIL,
      documentoIdentidad: '1098765432',
      telefono: '3157894561',
      acuerdoConfidencialidad: true,
      fechaFirmaConfidencialidad: new Date(),
      maxCasosActivos: 5,
    },
  });

  // 4. Crear Personal Administrativo de Recepción
  const administrativo = await prisma.user.upsert({
    where: { email: 'admin.recepcion@consultorio.edu.co' },
    update: {},
    create: {
      email: 'admin.recepcion@consultorio.edu.co',
      name: 'María Gómez (Recepción y Admisión)',
      passwordHash,
      role: Role.ADMINISTRATIVO,
      documentoIdentidad: '45896321',
      telefono: '3206549871',
    },
  });

  // 5. Crear Administrador de TI
  const adminTi = await prisma.user.upsert({
    where: { email: 'admin.ti@consultorio.edu.co' },
    update: {},
    create: {
      email: 'admin.ti@consultorio.edu.co',
      name: 'Administrador TI / Soporte',
      passwordHash,
      role: Role.ADMIN_TI,
      documentoIdentidad: '1122334455',
    },
  });

  // 6. Cliente inicial admitido (cumpliendo Ley 2113 y Ley 1581)
  const cliente = await prisma.cliente.upsert({
    where: { numeroDocumento: '1047489632' },
    update: {},
    create: {
      tipoDocumento: 'CC',
      numeroDocumento: '1047489632',
      nombreCompleto: 'Rosa Elena Benítez',
      telefono: '3015556677',
      email: 'rosa.benitez@example.com',
      direccion: 'Barrio La Esperanza, Manzana 4 Lote 12',
      estrato: 1,
      grupoSisben: 'A2',
      declaracionIndefension: true,
      esVictimaViolencia: false,
      esMenorEdad: false,
      indiceVulnerabilidad: 0.92,
      consentimientoHabeasData: true,
      fechaConsentimiento: new Date(),
    },
  });

  // 7. Expediente de Prueba (Radicado institucional único)
  const expediente = await prisma.expediente.upsert({
    where: { radicado: 'CJ-2026-0001' },
    update: {},
    create: {
      radicado: 'CJ-2026-0001',
      areaJuridica: AreaJuridica.CIVIL,
      tipoCaso: 'Fijación de Cuota de Alimentos para Menor',
      hechos: 'El demandado adeuda cuotas de manutención desde hace 6 meses. La madre no cuenta con empleo formal.',
      pretensiones: 'Se fije cuota provisional de alimentos equivalente al 30% del SMMLV.',
      sensibilidad: NivelSensibilidad.NORMAL,
      estado: EstadoExpediente.EN_TRAMITE,
      contraparteNombre: 'Carlos Arturo Domínguez',
      contraparteDocumento: '73541289',
      clienteId: cliente.id,
      docenteSupervisorId: docenteCivil.id,
      pasanteId: pasante.id,
      creadoPorId: administrativo.id,
      fechaApertura: new Date(),
      fechaAsignacion: new Date(),
    },
  });

  // 8. Escrito procesal inicial en borrador
  const escrito = await prisma.escritoProcesal.create({
    data: {
      expedienteId: expediente.id,
      autorId: pasante.id,
      titulo: 'Minuta de demanda de alimentos - Rosa Benítez',
      tipo: TipoEscrito.DEMANDA,
      contenido: 'SEÑOR JUEZ DE FAMILIA DE CARTAGENA (REPARTO)\n\nDEMANDANTE: Rosa Elena Benítez\nDEMANDADO: Carlos Arturo Domínguez\nASUNTO: Demanda de Fijación de Cuota Alimentaria...',
      version: 1,
      estado: EstadoEscrito.BORRADOR,
    },
  });

  console.log('✅ Base de datos sembrada con éxito:');
  console.log(`- Director: director@consultorio.edu.co`);
  console.log(`- Docente Civil: docente.civil@consultorio.edu.co`);
  console.log(`- Pasante: pasante.juan@consultorio.edu.co`);
  console.log(`- Administrativo: admin.recepcion@consultorio.edu.co`);
  console.log(`- Admin TI: admin.ti@consultorio.edu.co`);
  console.log(`- Contraseña por defecto: ${defaultPassword}`);
  console.log(`- Expediente creado: ${expediente.radicado}`);
  console.log(`- Escrito en borrador: ${escrito.titulo}`);
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
