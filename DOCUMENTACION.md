# SecureDocs — Documentación Técnica

## Índice

1. [Descripción General](#1-descripción-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Stack Tecnológico Detallado](#3-stack-tecnológico-detallado)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Módulos del Backend](#5-módulos-del-backend)
6. [Pantallas del Frontend](#6-pantallas-del-frontend)
7. [Flujos Internos](#7-flujos-internos)
8. [Sistema de Roles y Permisos](#8-sistema-de-roles-y-permisos)
9. [Criptografía y Seguridad](#9-criptografía-y-seguridad)
10. [Auditoría](#10-auditoría)
11. [Variables de Entorno](#11-variables-de-entorno)
12. [Limitaciones y Trabajo Futuro](#12-limitaciones-y-trabajo-futuro)

---

## 1. Descripción General

SecureDocs es una plataforma de gestión de documentos confidenciales diseñada como proyecto educativo. Su característica principal es que **ningún documento se almacena en texto plano**: todo archivo se cifra con AES-256-GCM antes de guardarse en el servidor de almacenamiento, y solo se descifra en el momento de la descarga autorizada.

El sistema implementa tres capas de seguridad:

- **Autenticación**: JWT firmado con secreto configurable, expiración de 1 hora.
- **Autorización**: Control de acceso por rol (RBAC) y por propiedad de documento.
- **Cifrado en reposo**: AES-256-GCM con IV y auth tag únicos por documento.

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                       Navegador                             │
│         React + Vite + Tailwind (localhost:5173)            │
│  Axios (JWT en cabecera) · Zustand (estado global)          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST (JSON)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  NestJS API (localhost:3000)                 │
│                                                             │
│  AuthModule · UsersModule · FoldersModule                   │
│  DocumentsModule · AuditModule                              │
│  CryptoService · StorageService · PrismaService             │
│                                                             │
│  Guards: JwtAuthGuard · RolesGuard · ThrottlerGuard         │
│  Middleware: Helmet (cabeceras HTTP)                        │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌───────────────────────────────────┐
│  PostgreSQL :5432     │  │         MinIO :9000               │
│  (via Prisma ORM)     │  │  Almacena documentos cifrados     │
│                       │  │  Bucket: securedocs               │
│  Tablas:              │  │  Clave: docs/<uuid>               │
│  User                 │  └───────────────────────────────────┘
│  Folder               │
│  Document             │
│  DocumentVersion      │
│  DocumentPermission   │
│  AuditLog             │
└──────────────────────┘
```

### Flujo de una request típica

1. El frontend envía la request con `Authorization: Bearer <token>`.
2. `JwtAuthGuard` valida el token y carga el usuario desde la base de datos (incluyendo `isActive`).
3. Si el usuario está desactivado, se devuelve 401 inmediatamente.
4. `RolesGuard` verifica que el rol del usuario sea suficiente para el endpoint (si aplica).
5. `ThrottlerGuard` comprueba el rate limit (30 req/min por IP).
6. El controlador delega al servicio correspondiente.
7. El servicio ejecuta la lógica de negocio y registra la acción en `AuditLog`.

---

## 3. Stack Tecnológico Detallado

### Backend

| Componente | Tecnología | Versión | Propósito |
|-----------|-----------|---------|-----------|
| Framework | NestJS | 11 | Estructura modular, IoC, decoradores |
| ORM | Prisma | 5 | Acceso a PostgreSQL con type safety |
| Base de datos | PostgreSQL | 16 | Persistencia principal |
| Almacenamiento | MinIO | 8 | Almacenamiento de objetos (S3-compatible) |
| Autenticación | passport-jwt | 4 | Validación de JWT en cada request |
| Hashing | argon2 | 0.44 | Hash seguro de contraseñas (resistente a GPU) |
| Cifrado | Node.js crypto | nativo | AES-256-GCM para documentos |
| Validación | class-validator | 0.15 | DTOs y validación de request bodies |
| Seguridad | helmet | 8 | Cabeceras HTTP de seguridad |
| Rate limiting | @nestjs/throttler | 6 | Protección contra abuso de endpoints |
| Documentación | @nestjs/swagger | 11 | UI Swagger en `/api` |
| IDs únicos | uuid v4 | 14 | Claves de almacenamiento y IDs |

### Frontend

| Componente | Tecnología | Versión | Propósito |
|-----------|-----------|---------|-----------|
| Framework | React | 19 | UI reactiva |
| Build tool | Vite | 8 | Bundler y dev server rápido |
| Estilos | Tailwind CSS | 4 | Utilidades CSS |
| Router | React Router | 7 | Navegación SPA |
| Estado | Zustand | 5 | Estado global del usuario autenticado |
| HTTP | Axios | 1.18 | Llamadas a la API con interceptores |
| Formularios | react-hook-form | 7 | Validación y gestión de formularios |
| Iconos | lucide-react | 1.22 | Iconografía consistente |

---

## 4. Modelo de Datos

### Diagrama de entidades

```
User
├── id (UUID, PK)
├── email (unique)
├── passwordHash (Argon2)
├── name
├── role: admin | user | auditor
├── isActive (boolean, default true)
├── createdAt
└── updatedAt

Folder
├── id (UUID, PK)
├── name
├── ownerId → User
├── parentId → Folder? (auto-referencia para jerarquía)
└── createdAt

Document
├── id (UUID, PK)
├── ownerId → User
├── folderId → Folder? (nullable)
├── originalName
├── mimeType
├── size (bytes)
├── sha256 (hash del archivo original para integridad)
├── storageKey (clave en MinIO: "docs/<uuid>")
├── encryptionIv (hex, 12 bytes)
├── encryptionAuthTag (hex, 16 bytes)
├── status: active | deleted
├── createdAt
└── updatedAt

DocumentVersion
├── id (UUID, PK)
├── documentId → Document
├── versionNumber (1, 2, 3...)
├── originalName
├── mimeType
├── size
├── sha256
├── storageKey (clave propia en MinIO)
├── encryptionIv
├── encryptionAuthTag
└── createdAt

DocumentPermission
├── id (UUID, PK)
├── documentId → Document
├── userId → User
├── permission: owner | read
├── createdAt
└── UNIQUE(documentId, userId)

AuditLog
├── id (UUID, PK)
├── actorId → User? (nullable para acciones de sistema)
├── action (enum AuditAction)
├── entityType (e.g. "Document", "User", "folder")
├── entityId
├── ipAddress
├── metadata (JSON, datos adicionales)
└── createdAt
```

### Enum AuditAction

```
USER_REGISTERED      USER_LOGGED_IN
DOCUMENT_UPLOADED    DOCUMENT_DOWNLOADED    DOCUMENT_ACCESS_DENIED
DOCUMENT_SHARED      DOCUMENT_UNSHARED
DOCUMENT_DELETED     DOCUMENT_RESTORED
DOCUMENT_VERSION_CREATED
DOCUMENT_MOVED
FOLDER_CREATED       FOLDER_DELETED
USER_ROLE_CHANGED    USER_DISABLED          USER_ENABLED
PROFILE_UPDATED      PASSWORD_CHANGED
```

---

## 5. Módulos del Backend

### PrismaModule

Singleton global que expone `PrismaService` (extiende `PrismaClient`). Todos los demás módulos lo consumen a través de inyección de dependencias.

### AuthModule

Gestiona registro, login y perfil.

- `AuthService`: registra usuarios con hash Argon2, verifica credenciales, emite JWT, actualiza perfil y contraseña.
- `JwtStrategy`: valida el token en cada request protegida, carga el usuario completo (incluye `isActive`) y lo inyecta en `request.user`.
- Si `isActive === false`, la estrategia lanza `UnauthorizedException` antes de llegar al controlador.

### UsersModule

Gestión de usuarios (acceso admin).

- `UsersService`: lista, busca y modifica usuarios. La búsqueda (`/users/search`) solo devuelve usuarios activos.
- Expone endpoints para cambiar rol y activar/desactivar cuentas.

### FoldersModule

Organización de documentos en carpetas.

- `FoldersService`: crea, lista y elimina carpetas. La eliminación es **recursiva**: mueve documentos a raíz, elimina subcarpetas de hojas a raíz, luego la carpeta principal.

### DocumentsModule

Núcleo del sistema.

- `DocumentsService`: orquesta criptografía, almacenamiento, permisos y auditoría.
- Al subir un archivo con el mismo nombre que uno existente (mismo propietario), el contenido actual se guarda como `DocumentVersion` y el documento se actualiza con el nuevo contenido.

### AuditModule

Registro de actividad.

- `AuditService`: escribe entradas en `AuditLog` desde todos los demás módulos. Expone consultas filtradas, resumen estadístico e historial por documento/usuario.

### CryptoModule

Operaciones criptográficas de bajo nivel.

- `CryptoService`: implementa AES-256-GCM (cifrado/descifrado) y SHA-256. Se inicializa en `onModuleInit` validando que `DOCUMENT_ENCRYPTION_KEY` sea exactamente 32 bytes. Si no, la app no arranca.

### StorageModule

Abstracción sobre MinIO.

- `StorageService`: conecta al servidor MinIO al iniciar, crea el bucket si no existe, y expone `putObject` / `getObject`.

---

## 6. Pantallas del Frontend

| Ruta | Página | Roles | Descripción |
|------|--------|-------|-------------|
| `/login` | Login | Público | Formulario de acceso |
| `/register` | Register | Público | Registro de nueva cuenta |
| `/dashboard` | Dashboard | Todos | Panel de bienvenida según rol |
| `/documents` | Documents | admin, user | Gestión completa de documentos |
| `/audit` | Audit | admin, auditor | Logs de auditoría con filtros |
| `/audit/reports` | AuditReports | admin, auditor | Métricas y gráficos de actividad |
| `/users` | Users | admin | Gestión de usuarios y roles |
| `/profile` | Profile | Todos | Editar nombre y cambiar contraseña |

### Componentes relevantes

- **`ShareModal`**: modal de compartición con buscador de usuarios en tiempo real (debounce), lista de permisos actuales y botón de revocar.
- **`Sidebar`**: navegación lateral con items filtrados por rol. Muestra nombre, email y rol del usuario en la parte inferior.
- **`RequireAuth`**: guard de rutas privadas — redirige a `/login` si no hay token en localStorage/Zustand.
- **`AppLayout`**: layout con sidebar fijo + área de contenido.

### Gestión de estado (Zustand)

El store `auth.store.ts` persiste `token` en `localStorage`. Al arrancar la app, Axios lee el token del localStorage automáticamente vía interceptor de request. Si una respuesta devuelve 401, el interceptor limpia el token y redirige a `/login`.

---

## 7. Flujos Internos

### 7.1 Subida de documento

```
Usuario selecciona archivo
        │
        ▼
Frontend → POST /documents (multipart: file, folderId?)
        │
        ▼
DocumentsService.upload()
        │
        ├── ¿Existe documento con mismo nombre y propietario?
        │       │ SÍ → guardar contenido actual como DocumentVersion (n+1)
        │       │      actualizar Document con nuevo storageKey/IV/hash
        │       └── NO → crear Document + DocumentPermission(owner)
        │
        ├── CryptoService.sha256(buffer)
        ├── CryptoService.encrypt(buffer) → { encrypted, iv, authTag }
        ├── StorageService.putObject("docs/<uuid>", encrypted)
        └── AuditService.log(DOCUMENT_UPLOADED | DOCUMENT_VERSION_CREATED)
```

### 7.2 Descarga de documento

```
Usuario hace clic en "Descargar"
        │
        ▼
Frontend → GET /documents/:id/download
        │
        ▼
DocumentsService.download()
        │
        ├── ¿Tiene permiso owner|read?
        │       └── NO → audit(DOCUMENT_ACCESS_DENIED) + 403
        │
        ├── ¿status === 'active'?
        │       └── NO → 404
        │
        ├── StorageService.getObject(storageKey) → buffer cifrado
        ├── CryptoService.decrypt(buffer, iv, authTag) → buffer original
        ├── AuditService.log(DOCUMENT_DOWNLOADED)
        └── res.set(Content-Type, Content-Disposition) → stream al cliente
```

### 7.3 Compartición de documento

```
Propietario abre ShareModal → busca usuario por email/nombre
        │
        ▼
Frontend → POST /documents/:id/share  { email: "..." }
        │
        ▼
DocumentsService.shareDocument()
        │
        ├── ¿El solicitante es propietario? → NO: 403
        ├── ¿El documento existe y está activo? → NO: 404
        ├── ¿El usuario destino existe? → NO: 404
        ├── ¿El destino es el mismo propietario? → 400
        ├── ¿Ya tiene acceso? → 409
        ├── crear DocumentPermission(read)
        └── audit(DOCUMENT_SHARED)
```

### 7.4 Versiones de documento

Cuando el usuario sube un archivo con el mismo `originalName` que ya tiene en activo:

1. Se crea un `DocumentVersion` que conserva el `storageKey`, `encryptionIv`, `encryptionAuthTag` y metadatos del estado anterior.
2. El `Document` padre se actualiza con los nuevos valores (nuevo `storageKey`, nuevo contenido cifrado).
3. El historial de versiones se lista con `GET /documents/:id/versions` y cada versión es descargable individualmente.

### 7.5 Eliminación y papelera

- `DELETE /documents/:id` cambia `status` a `deleted` (soft delete). Los datos en MinIO no se borran.
- `GET /documents/trash` devuelve todos los documentos del usuario con `status === 'deleted'`.
- `POST /documents/:id/restore` cambia `status` de vuelta a `active`.

No existe borrado permanente en esta versión; los datos en MinIO permanecen.

---

## 8. Sistema de Roles y Permisos

### Roles de usuario

| Rol | Acceso a documentos | Auditoría | Usuarios | Carpetas |
|-----|-------------------|-----------|----------|----------|
| `admin` | Todos (via permisos) | Lectura + reportes | Gestión completa | Propias |
| `user` | Solo con permiso owner/read | — | Solo búsqueda | Propias |
| `auditor` | — | Lectura + reportes | — | — |

### Permisos de documento (DocumentPermission)

| Permiso | Quién lo tiene | Qué puede hacer |
|---------|---------------|----------------|
| `owner` | El usuario que subió el documento | Descargar, compartir, revocar, mover, eliminar, restaurar |
| `read` | Usuarios con los que se compartió | Solo descargar |

### Guards en NestJS

- **`JwtAuthGuard`**: verifica el JWT y carga `request.user`. Presente en todos los endpoints protegidos.
- **`RolesGuard`**: compara `request.user.role` con los roles declarados en `@Roles(...)`. Se usa para endpoints de admin y auditor.
- **`ThrottlerGuard`**: aplicado globalmente en `AppModule`. Límite: 30 requests/minuto por IP.

---

## 9. Criptografía y Seguridad

### Contraseñas — Argon2

Se usa `argon2.hash()` para almacenar contraseñas. Argon2 es resistente a ataques de fuerza bruta con GPU, a diferencia de bcrypt o PBKDF2. La verificación se hace con `argon2.verify()`.

### Documentos — AES-256-GCM

Cada documento tiene su propio **IV aleatorio de 12 bytes** y su propio **auth tag de 16 bytes**. El auth tag garantiza que el contenido no haya sido manipulado (autenticación de integridad).

```
Cifrado:
  iv     = randomBytes(12)
  cipher = createCipheriv('aes-256-gcm', key, iv)
  encrypted = cipher.update(buffer) + cipher.final()
  authTag = cipher.getAuthTag()

Almacenado en BD:
  encryptionIv      = iv.toString('hex')
  encryptionAuthTag = authTag.toString('hex')

Descifrado:
  decipher = createDecipheriv('aes-256-gcm', key, ivBuffer)
  decipher.setAuthTag(authTagBuffer)
  original = decipher.update(encrypted) + decipher.final()
  // Si el auth tag no coincide → Error automático (integridad comprometida)
```

La clave AES (`DOCUMENT_ENCRYPTION_KEY`) se valida al arrancar: debe ser exactamente 32 bytes en base64. Si no, la app no inicia.

### Integridad — SHA-256

Al subir, se calcula `sha256(buffer_original)` y se guarda en el documento. Permite verificar fuera de banda que el archivo descifrado coincide con el original.

### JWT

- Firmado con `HS256` usando `JWT_SECRET` (configurable).
- Expiración: `JWT_EXPIRES_IN` (por defecto `1h`).
- La estrategia JWT recarga el usuario desde BD en cada request y verifica `isActive`. Un JWT válido de un usuario desactivado produce 401.

### Cabeceras HTTP (Helmet)

Helmet configura automáticamente cabeceras como `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, entre otras.

---

## 10. Auditoría

Toda acción sensible se registra en `AuditLog` de forma **inmutable** (no hay endpoints de borrado de logs).

Cada entrada contiene:
- `actorId`: quién realizó la acción
- `action`: tipo de acción (enum fijo en el schema)
- `entityType` / `entityId`: sobre qué entidad actuó
- `ipAddress`: IP de origen
- `metadata`: JSON con detalles adicionales (nombre del archivo, rol anterior/nuevo, etc.)
- `createdAt`: timestamp inmutable de PostgreSQL

Las acciones que se registran son:

| Categoría | Acciones |
|-----------|---------|
| Usuarios | `USER_REGISTERED`, `USER_LOGGED_IN`, `USER_ROLE_CHANGED`, `USER_DISABLED`, `USER_ENABLED`, `PROFILE_UPDATED`, `PASSWORD_CHANGED` |
| Documentos | `DOCUMENT_UPLOADED`, `DOCUMENT_DOWNLOADED`, `DOCUMENT_ACCESS_DENIED`, `DOCUMENT_SHARED`, `DOCUMENT_UNSHARED`, `DOCUMENT_DELETED`, `DOCUMENT_RESTORED`, `DOCUMENT_VERSION_CREATED`, `DOCUMENT_MOVED` |
| Carpetas | `FOLDER_CREATED`, `FOLDER_DELETED` |

---

## 11. Variables de Entorno

Archivo de configuración: `backend/.env` (creado a partir de `backend/.env.example`).

| Variable | Obligatoria | Descripción | Ejemplo |
|----------|------------|-------------|---------|
| `DATABASE_URL` | Sí | URL de conexión a PostgreSQL | `postgresql://user:pass@localhost:5432/dbname` |
| `JWT_SECRET` | Sí | Secreto para firmar JWT | Cadena aleatoria larga |
| `JWT_EXPIRES_IN` | No | Expiración del JWT | `1h` (default) |
| `DOCUMENT_ENCRYPTION_KEY` | Sí | Clave AES-256 en base64 (exactamente 32 bytes) | Generada con `crypto.randomBytes(32)` |
| `MINIO_ENDPOINT` | No | Host de MinIO | `localhost` |
| `MINIO_PORT` | No | Puerto de MinIO | `9000` |
| `MINIO_USE_SSL` | No | SSL en MinIO | `false` |
| `MINIO_ACCESS_KEY` | No | Access key de MinIO | `minioadmin` |
| `MINIO_SECRET_KEY` | No | Secret key de MinIO | `minioadmin` |
| `MINIO_BUCKET` | No | Nombre del bucket | `securedocs` |
| `PORT` | No | Puerto del backend | `3000` |
| `CORS_ORIGIN` | No | Orígenes CORS separados por coma | `http://localhost:5173` |
| `MAX_FILE_SIZE_MB` | No | Tamaño máximo de archivo en MB | `100` |

El frontend solo tiene una variable de entorno (`frontend/.env`):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL base de la API | `http://localhost:3000` |

---

## 12. Limitaciones y Trabajo Futuro

### Limitaciones actuales

| Aspecto | Situación actual |
|---------|----------------|
| Despliegue | Solo local con Docker Compose |
| HTTPS | No configurado (requiere proxy reverso o hosting) |
| Gestión de secretos | Variables en `.env` en texto plano |
| Backups | No implementados |
| Borrado permanente | Los documentos eliminados permanecen en MinIO |
| Refresh tokens | No implementados; JWT de vida corta (1h) |
| Notificaciones | No implementadas (email al compartir, etc.) |
| Tests de integración/e2e | Solo pruebas unitarias de `CryptoService` |

### Posibles mejoras para producción

- **Base de datos gestionada**: Neon, Supabase o Railway (PostgreSQL en la nube)
- **Almacenamiento cloud**: Cloudflare R2 o AWS S3 en lugar de MinIO local
- **Hosting**: Railway, Render o VPS con Nginx como proxy reverso
- **Refresh tokens**: implementar rotación de JWT para sesiones largas sin comprometer seguridad
- **Borrado permanente**: endpoint `DELETE /documents/:id/permanent` con limpieza en MinIO
- **Notificaciones por email**: avisar al usuario cuando un documento es compartido con él
- **2FA**: autenticación de dos factores para cuentas admin
