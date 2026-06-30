# SecureDocs

Plataforma web para la gestión segura de documentos confidenciales.  
Cifrado AES-256-GCM, control de acceso por roles, auditoría inmutable y almacenamiento cifrado en MinIO.

> Proyecto educativo. Funcional para entorno local de desarrollo y demostración.

---

## Documentación

| Documento | Contenido |
|-----------|-----------|
| **README.md** ← estás aquí | Instalación local, arranque y referencia rápida de API |
| [DOCUMENTACION.md](DOCUMENTACION.md) | Arquitectura, modelo de datos, flujos internos y decisiones de diseño |
| [API.md](API.md) | Referencia completa de todos los endpoints con payloads y respuestas |
| [PRUEBAS_MANUALES.md](PRUEBAS_MANUALES.md) | Checklist de pruebas funcionales paso a paso |

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS 11 + TypeScript |
| Base de datos | PostgreSQL 16 + Prisma ORM |
| Almacenamiento | MinIO (compatible con S3) |
| Autenticación | JWT + Passport |
| Criptografía | AES-256-GCM + SHA-256 + Argon2 |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Estado global | Zustand |
| HTTP client | Axios con interceptores JWT |
| Infra local | Docker Compose |
| Seguridad HTTP | Helmet + ThrottlerGuard |

---

## Estructura del Repositorio

```
SecureDocs/
├── backend/           # API NestJS
│   ├── src/           # Código fuente
│   ├── prisma/        # Schema, migraciones y seed
│   ├── .env.example   # Plantilla de variables de entorno
│   └── docker-compose.yml
├── frontend/          # Interfaz React
│   └── src/
├── DOCUMENTACION.md   # Documentación técnica
├── API.md             # Referencia de endpoints
├── PRUEBAS_MANUALES.md
└── README.md
```

---

## Requisitos Previos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js | 20 LTS |
| Docker Desktop | Cualquier versión reciente |

---

## Instalación Local

### 1. Clonar e instalar dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configurar variables de entorno

```bash
cd backend
cp .env.example .env
```

Edita `.env` y reemplaza `DOCUMENT_ENCRYPTION_KEY` con una clave base64 de exactamente 32 bytes:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Las demás variables ya están preconfiguradas para desarrollo local.

### 3. Levantar PostgreSQL y MinIO

```bash
cd backend
docker compose up -d
```

| Servicio | URL | Usuario | Contraseña |
|----------|-----|---------|-----------|
| PostgreSQL | `localhost:5432` | securedocs | securedocs |
| MinIO API | `localhost:9000` | minioadmin | minioadmin |
| MinIO Consola | http://localhost:9001 | minioadmin | minioadmin |

### 4. Aplicar migraciones de base de datos

```bash
cd backend
npx prisma migrate deploy
```

### 5. Crear el usuario administrador inicial

```bash
cd backend
npx ts-node --project tsconfig.json prisma/seed.ts
```

Credenciales del admin:

```
Email:      admin@securedocs.local
Contraseña: Admin1234!
Rol:        admin
```

### 6. Iniciar el backend

```bash
cd backend
npm run start:dev
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/api

### 7. Iniciar el frontend

```bash
cd frontend
npm run dev
```

- App: http://localhost:5173

---

## Primer Uso

1. Abre http://localhost:5173
2. Inicia sesión con `admin@securedocs.local` / `Admin1234!`
3. Sube un documento desde **Documentos** — se cifra automáticamente con AES-256-GCM
4. Descárgalo — el backend lo descifra antes de enviarlo al navegador
5. Crea carpetas para organizar documentos
6. Comparte un documento con otro usuario por email
7. Revisa la **Auditoría** o los **Reportes** para ver el registro de actividad
8. Desde **Usuarios**, cambia roles o desactiva cuentas (admin)

---

## Roles

| Rol | Qué puede hacer |
|-----|----------------|
| `admin` | Todo: gestionar usuarios, documentos, auditoría, carpetas |
| `user` | Subir, descargar, compartir y organizar sus propios documentos |
| `auditor` | Solo lectura de logs de auditoría y reportes de actividad |

---

## Seguridad Implementada

- Contraseñas hasheadas con **Argon2**
- Documentos cifrados con **AES-256-GCM** (clave de 32 bytes, IV y auth tag por documento)
- Hash **SHA-256** del archivo original para verificación de integridad
- **JWT** con expiración de 1 hora; usuarios desactivados bloqueados en cada request
- Control de acceso por rol con `RolesGuard` en NestJS
- Rate limiting global: 30 requests/minuto por IP (`@nestjs/throttler`)
- Cabeceras de seguridad HTTP con **Helmet**
- Registro inmutable de todas las acciones sensibles en `AuditLog`
- Tamaño máximo de archivo configurable con `MAX_FILE_SIZE_MB`

---

## API — Referencia Rápida

Para la referencia completa con payloads y respuestas, ver [API.md](API.md).  
Swagger interactivo disponible en http://localhost:3000/api cuando el backend está corriendo.

### Auth (`/auth`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/auth/register` | — | Registrar nuevo usuario |
| `POST` | `/auth/login` | — | Iniciar sesión, devuelve JWT |
| `GET` | `/auth/me` | JWT | Perfil del usuario autenticado |
| `PATCH` | `/auth/profile` | JWT | Actualizar nombre |
| `PATCH` | `/auth/password` | JWT | Cambiar contraseña |

### Usuarios (`/users`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/users/search?q=` | JWT | Buscar por email o nombre |
| `GET` | `/users` | admin | Listar todos los usuarios |
| `PATCH` | `/users/:id/role` | admin | Cambiar rol |
| `PATCH` | `/users/:id/disable` | admin | Desactivar cuenta |
| `PATCH` | `/users/:id/enable` | admin | Activar cuenta |

### Carpetas (`/folders`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/folders` | JWT | Crear carpeta |
| `GET` | `/folders` | JWT | Listar carpetas propias |
| `DELETE` | `/folders/:id` | JWT | Eliminar carpeta (recursivo) |

### Documentos (`/documents`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/documents` | JWT | Listar documentos accesibles |
| `POST` | `/documents` | JWT | Subir documento (se cifra) |
| `GET` | `/documents/trash` | JWT | Ver papelera |
| `GET` | `/documents/:id/download` | JWT | Descargar descifrado |
| `DELETE` | `/documents/:id` | propietario | Eliminar (soft delete) |
| `POST` | `/documents/:id/restore` | propietario | Restaurar desde papelera |
| `PATCH` | `/documents/:id` | propietario | Mover a carpeta |
| `GET` | `/documents/:id/versions` | JWT | Listar versiones anteriores |
| `GET` | `/documents/:id/versions/:vId/download` | JWT | Descargar versión anterior |
| `POST` | `/documents/:id/share` | propietario | Compartir por email |
| `GET` | `/documents/:id/permissions` | propietario | Ver permisos |
| `DELETE` | `/documents/:id/share/:userId` | propietario | Revocar acceso |

### Auditoría (`/audit`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/audit` | admin/auditor | Logs con filtros |
| `GET` | `/audit/summary` | admin/auditor | Resumen por tipo y día |
| `GET` | `/audit/by-document/:id` | admin/auditor | Historial de un documento |
| `GET` | `/audit/by-user/:id` | admin | Historial de un usuario |

---

## Comandos Útiles

```bash
# Ver logs de Docker
docker compose logs -f

# Parar servicios Docker
docker compose down

# Abrir Prisma Studio (explorador visual de BD)
cd backend && npx prisma studio

# Pruebas unitarias del backend
cd backend && npm run test

# Regenerar cliente Prisma tras cambiar el schema
cd backend && npx prisma generate

# Build de producción del frontend
cd frontend && npm run build
```

---

## Estado del Proyecto

**Funcional para desarrollo y demostración local.**

Pendiente para un despliegue en producción real:
- Base de datos gestionada (Neon, Supabase, Railway, etc.)
- Almacenamiento cloud S3-compatible (Cloudflare R2, AWS S3, etc.)
- HTTPS con certificado TLS
- Gestión de secretos (no `.env` en texto plano)
- Backups automáticos de base de datos
- Monitoreo y alertas
