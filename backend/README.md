# SecureDocs — Backend

Backend de SecureDocs construido con **NestJS + TypeScript**, PostgreSQL, MinIO, JWT y cifrado AES-256-GCM.

## Requisitos Previos

- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — para levantar PostgreSQL y MinIO localmente

## Instalación

```bash
npm install
```

## Configurar Variables de Entorno

Copia el archivo de ejemplo y ajusta si es necesario:

```bash
cp .env.example .env
```

Genera una clave de cifrado de 32 bytes:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copia el resultado y pégalo como valor de `DOCUMENT_ENCRYPTION_KEY` en `.env`.

## Levantar Servicios Locales (Docker)

Una vez instalado Docker Desktop:

```bash
docker compose up -d
```

Esto levanta:
- PostgreSQL en `localhost:5432`
- MinIO en `localhost:9000` (API) y `localhost:9001` (consola web)

Para ver la consola de MinIO visita: http://localhost:9001 (usuario: `minioadmin`, contraseña: `minioadmin`)

## Migraciones de Base de Datos

```bash
npx prisma migrate dev --name init
```

## Iniciar el Backend

```bash
# Desarrollo (con hot reload)
npm run start:dev

# Producción
npm run build
npm run start:prod
```

El servidor correrá en http://localhost:3000

## Documentación de la API (Swagger)

Una vez iniciado, visita: http://localhost:3000/api

Desde Swagger puedes:
1. Registrar un usuario en `POST /auth/register`
2. Hacer login en `POST /auth/login` y copiar el token
3. Hacer clic en "Authorize" (candado arriba a la derecha) y pegar el token
4. Subir un documento con `POST /documents`
5. Listar tus documentos con `GET /documents`
6. Descargar un documento con `GET /documents/{id}/download`
7. Ver logs de auditoría (solo admin/auditor) con `GET /audit`

## Flujo Principal del MVP

```
POST /auth/register   → Crea usuario
POST /auth/login      → Retorna JWT
GET  /auth/me         → Perfil del usuario autenticado
POST /documents       → Sube archivo (se cifra con AES-256-GCM antes de guardarse)
GET  /documents       → Lista documentos accesibles
GET  /documents/:id/download → Descarga archivo descifrado (solo si tienes permiso)
GET  /audit           → Logs de auditoría (admin y auditor)
GET  /users           → Lista usuarios (solo admin)
```

## Ejecutar Pruebas

```bash
# Pruebas unitarias
npm run test

# Con cobertura
npm run test:cov

# Pruebas e2e
npm run test:e2e
```

## Seguridad

- Las contraseñas se hashean con **Argon2** antes de guardarse.
- Los documentos se cifran con **AES-256-GCM** antes de llegar a MinIO.
- El archivo original nunca se guarda en disco ni en la base de datos.
- Cada acción sensible queda registrada en la tabla `AuditLog`.
- Las rutas están protegidas con **JWT**.
- Los roles `admin`, `user` y `auditor` controlan el acceso a cada endpoint.

## Estructura del Proyecto

```
src/
├── auth/          # Registro, login, JWT, estrategia Passport
├── audit/         # Servicio y controlador de auditoría
├── common/        # Guards, decoradores reutilizables
├── crypto/        # Hash SHA-256 y cifrado AES-256-GCM
├── documents/     # Subida, descarga y listado de documentos
├── prisma/        # PrismaService global
├── storage/       # Integración con MinIO
└── users/         # Gestión básica de usuarios
prisma/
└── schema.prisma  # Modelos de la base de datos
docker-compose.yml # PostgreSQL + MinIO para desarrollo local
```
