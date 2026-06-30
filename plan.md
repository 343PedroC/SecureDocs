# SecureDocs — Estado del Proyecto y Próximos Pasos

---

## Lo que se ha construido hasta ahora

### Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS + TypeScript |
| Base de datos | PostgreSQL + Prisma ORM |
| Almacenamiento | MinIO |
| Autenticación | JWT + Passport |
| Criptografía | AES-256-GCM + SHA-256 + Argon2 (Node.js nativo) |
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Estado global | Zustand |
| HTTP client | Axios con interceptores JWT |
| Infra local | Docker Compose |

---

### Backend (`backend/`)

#### Módulos implementados

**`auth`**
- Registro de usuarios con hash Argon2
- Login con JWT
- Endpoint `GET /auth/me`
- Guard JWT reutilizable (`JwtAuthGuard`)
- Decorador `@CurrentUser()`

**`users`**
- Listado de usuarios (solo admin)
- Búsqueda de usuarios por email o nombre (`GET /users/search?q=`)
- Consulta por ID (solo admin)

**`crypto`**
- Hash SHA-256 del archivo original
- Cifrado AES-256-GCM con IV y auth tag aleatorios
- Descifrado con verificación de integridad
- Validación de clave de 32 bytes al inicio
- 6 pruebas unitarias pasando

**`storage`**
- Conexión con MinIO
- Creación automática del bucket si no existe
- `putObject` y `getObject`
- Claves de almacenamiento internas (UUID), no relacionadas con el nombre del archivo

**`documents`**
- `POST /documents`: subida con cifrado automático y registro de auditoría
- `GET /documents`: listado de documentos accesibles por el usuario
- `GET /documents/:id/download`: descarga autorizada con descifrado
- `POST /documents/:id/share`: compartir con otro usuario por email
- `GET /documents/:id/permissions`: ver quién tiene acceso (solo propietario)
- `DELETE /documents/:id/share/:userId`: revocar acceso (solo propietario)

**`audit`**
- Registro inmutable de todas las acciones sensibles
- `GET /audit` con filtros por acción, entidad y rango de fechas
- Restringido a roles `admin` y `auditor`
- Acciones registradas: `USER_REGISTERED`, `USER_LOGGED_IN`, `DOCUMENT_UPLOADED`, `DOCUMENT_DOWNLOADED`, `DOCUMENT_ACCESS_DENIED`, `DOCUMENT_SHARED`, `DOCUMENT_UNSHARED`

#### Roles
- `admin`: acceso total
- `user`: sube, descarga y comparte documentos
- `auditor`: solo lectura de auditoría

#### Infraestructura
- Docker Compose con PostgreSQL y MinIO
- CORS configurado para el frontend local
- Swagger/OpenAPI disponible en `/api`
- Script de seed para usuario administrador inicial
- Variables de entorno documentadas en `.env.example`

---

### Frontend (`frontend/`)

#### Pantallas implementadas

| Ruta | Pantalla | Acceso |
|------|----------|--------|
| `/login` | Inicio de sesión | Público |
| `/register` | Registro de cuenta | Público |
| `/dashboard` | Panel con resumen según rol | Autenticado |
| `/documents` | Lista, subida, descarga y compartición | admin, user |
| `/audit` | Logs de auditoría con filtros | admin, auditor |
| `/users` | Listado de usuarios | admin |

#### Componentes relevantes
- `ShareModal`: modal de compartición con buscador en tiempo real, lista de permisos actuales y botón de revocar
- `Sidebar`: navegación lateral adaptada por rol
- `RequireAuth`: guard de rutas privadas
- Componentes UI reutilizables: `Button`, `Input`, `Badge`, `Alert`

#### Funcionalidades del frontend
- Autenticación con JWT almacenado en localStorage
- Interceptor Axios: adjunta token y redirige al login en 401
- Protección de rutas por rol
- Subida de archivos con multipart
- Descarga directa al navegador con nombre y tipo MIME originales
- Búsqueda local de documentos por nombre
- Modal de compartición con búsqueda de usuarios por email/nombre con debounce
- Logs de auditoría filtrables por acción y fechas

---

## Próximos pasos recomendados

Los siguientes pasos están ordenados por valor e impacto, de mayor a menor prioridad.

---

### Paso 1: Carpetas y organización documental

Permitir que los usuarios organicen sus documentos en carpetas.

**Backend:**
- Modelo `Folder` con campos: `id`, `name`, `ownerId`, `parentId`, `createdAt`
- `POST /folders`: crear carpeta
- `GET /folders`: listar carpetas del usuario
- `DELETE /folders/:id`: eliminar carpeta
- Campo `folderId` opcional en `Document`
- `PATCH /documents/:id`: mover documento a otra carpeta

**Frontend:**
- Panel lateral de carpetas en la pantalla de documentos
- Filtro de documentos por carpeta seleccionada
- Botón para crear carpeta
- Indicador de carpeta en cada documento

---

### Paso 2: Eliminación y restauración de documentos

Permitir eliminar documentos de forma segura y restaurarlos.

**Backend:**
- `DELETE /documents/:id`: cambiar `status` a `deleted` (soft delete), registrar auditoría
- `GET /documents/trash`: listar documentos eliminados del usuario
- `POST /documents/:id/restore`: restaurar documento eliminado
- Acción de auditoría: `DOCUMENT_DELETED`, `DOCUMENT_RESTORED`

**Frontend:**
- Botón de eliminar en documentos propios con confirmación
- Pantalla o sección de papelera
- Botón de restaurar

---

### Paso 3: Control de versiones de documentos

Cada vez que un usuario sube un archivo con el mismo nombre, se guarda como nueva versión.

**Backend:**
- Modelo `DocumentVersion` con referencia al `Document` padre
- Lógica de detección de versión al subir (por nombre o por ID)
- `GET /documents/:id/versions`: listar versiones
- `GET /documents/:id/versions/:versionId/download`: descargar versión anterior
- Acción de auditoría: `DOCUMENT_VERSION_CREATED`

**Frontend:**
- Panel de versiones en el detalle del documento
- Descarga de versiones anteriores

---

### Paso 4: Gestión de usuarios por el administrador

Permitir al admin gestionar roles y estados de usuarios directamente desde la interfaz.

**Backend:**
- `PATCH /users/:id/role`: cambiar rol
- `PATCH /users/:id/disable`: desactivar usuario (nuevo campo `isActive`)
- Bloquear login si `isActive === false`

**Frontend:**
- Botones de cambio de rol y desactivación en la pantalla de usuarios
- Indicador de estado (activo/inactivo)

---

### Paso 5: Perfil de usuario

Permitir que cada usuario vea y edite su propio perfil.

**Backend:**
- `PATCH /auth/profile`: actualizar nombre
- `PATCH /auth/password`: cambiar contraseña (requiere contraseña actual)

**Frontend:**
- Pantalla `/profile` accesible desde el sidebar
- Formularios de edición de nombre y cambio de contraseña

---

### Paso 6: Reportes de auditoría

Dar más valor al rol `auditor` con métricas y resúmenes.

**Backend:**
- `GET /audit/summary`: conteo de acciones agrupadas por tipo y día
- `GET /audit/by-document/:id`: historial completo de un documento
- `GET /audit/by-user/:id`: historial de acciones de un usuario (admin)

**Frontend:**
- Pantalla de reportes con tarjetas de métricas
- Historial por documento desde la pantalla de documentos

---

### Paso 7: Mejoras de seguridad y producción

Preparar el sistema para un entorno real.

- Límite de tamaño de archivo configurable desde variables de entorno
- Rate limiting en endpoints de autenticación
- Helmet para cabeceras de seguridad HTTP
- Rotación de claves de cifrado con re-cifrado de documentos
- Expiración y renovación de JWT (refresh tokens)
- Logs estructurados con niveles (producción vs desarrollo)
- Pruebas e2e del flujo completo con base de datos de prueba

---

### Orden sugerido de ejecución

```
1. Carpetas
2. Eliminar / Restaurar
3. Perfil de usuario
4. Gestión de usuarios por admin
5. Versiones de documentos
6. Reportes
7. Seguridad para producción
```
