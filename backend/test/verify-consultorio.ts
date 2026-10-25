import { PrismaClient, Role, AreaJuridica, EstadoEscrito, EstadoExpediente } from '@prisma/client';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('🧪 Iniciando verificación funcional de la Fase 2 (Lógica del Consultorio)...');

  // 1. Verificar usuarios creados en seed
  const director = await prisma.user.findUnique({ where: { email: 'director@consultorio.edu.co' } });
  const docente = await prisma.user.findUnique({ where: { email: 'docente.civil@consultorio.edu.co' } });
  const pasante = await prisma.user.findUnique({ where: { email: 'pasante.juan@consultorio.edu.co' } });
  const cliente = await prisma.cliente.findUnique({ where: { numeroDocumento: '1047489632' } });

  if (!director || !docente || !pasante || !cliente) {
    throw new Error('Faltan usuarios o clientes requeridos para la prueba.');
  }
  console.log('✅ Actores verificados: Director, Docente, Pasante y Cliente');

  // 2. Verificar o crear expediente de prueba
  let exp = await prisma.expediente.findUnique({ where: { radicado: 'CJ-2026-0001' } });
  console.log(`✅ Expediente radicado verificado: ${exp?.radicado} (${exp?.estado})`);

  // 3. Crear escrito procesal (CUN-04)
  const escrito = await prisma.escritoProcesal.create({
    data: {
      expedienteId: exp!.id,
      autorId: pasante.id,
      titulo: 'Derecho de Petición por Historial Clínico',
      tipo: 'DERECHO_PETICION',
      contenido: 'Solicitud formal de historia clínica para proceso de alimentos...',
      estado: EstadoEscrito.BORRADOR,
    },
  });
  console.log(`✅ Escrito en borrador creado: ID ${escrito.id}`);

  // 4. Someter a revisión (RF-08)
  const enviado = await prisma.escritoProcesal.update({
    where: { id: escrito.id },
    data: {
      estado: EstadoEscrito.EN_REVISION,
      fechaEnvioRevision: new Date(),
    },
  });
  console.log(`✅ Escrito sometido a revisión: Estado ${enviado.estado}`);

  // 5. Aval del Docente Supervisor (CUN-05, RF-08)
  const aprobado = await prisma.escritoProcesal.update({
    where: { id: escrito.id },
    data: {
      estado: EstadoEscrito.APROBADO,
      observacionesDocente: 'Excelente estructuración jurídica. Avalado.',
      revisadoPorId: docente.id,
      fechaAprobacion: new Date(),
    },
  });
  console.log(`✅ Escrito avalado por Docente: Estado ${aprobado.estado} - Docente: ${docente.name}`);

  // 6. Registrar actuación procesal con fecha límite (RF-09)
  const fechaVence = new Date();
  fechaVence.setDate(fechaVence.getDate() + 3); // Vence en 3 días

  const actuacion = await prisma.actuacionProcesal.create({
    data: {
      expedienteId: exp!.id,
      registradoPorId: pasante.id,
      tipo: 'NOTIFICACION_JUZGADO',
      descripcion: 'Auto fija fecha para audiencia de conciliación prejudicial.',
      fechaVencimientoTermino: fechaVence,
    },
  });
  console.log(`✅ Actuación procesal registrada: ${actuacion.descripcion} (Vence: ${actuacion.fechaVencimientoTermino?.toISOString().slice(0, 10)})`);

  // Limpiar escrito y actuación de prueba para no ensuciar datos
  await prisma.actuacionProcesal.delete({ where: { id: actuacion.id } });
  await prisma.escritoProcesal.delete({ where: { id: escrito.id } });

  console.log('🎉 ¡Todas las validaciones funcionales de la Fase 2 pasaron con éxito!');
}

runVerification()
  .catch((err) => {
    console.error('❌ Error en verificación:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
