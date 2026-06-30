# SecureDocs — Referencia de API

Base URL: `http://localhost:3000`  
Documentación Swagger interactiva: `http://localhost:3000/api`

## Convenciones

- Todos los endpoints protegidos requieren la cabecera `Authorization: Bearer <token>`.
- Los cuerpos de request y respuesta son JSON (`Content-Type: application/json`), excepto la subida de documentos que es `multipart/form-data`.
- Los errores siguen el formato estándar de NestJS:

```json
{
  "statusCode": 400,
  "message": "Descripción del error",
  "error": "Bad Request"
}
```

- Rate limit: **30 requests/minuto por IP**. Al superarlo se devuelve `429 Too Many Requests`.

---

## Índice

- [Sistema](#sistema)
- [Auth](#auth)
- [Usuarios](#usuarios)
- [Carpetas](#carpetas)
- [Documentos](#documentos)
- [Auditoría](#auditoría)

---

## Sistema

### `GET /health`

Comprueba que el servidor está en marcha. No requiere autenticación.

**Respuesta 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-30T06:00:00.000Z"
}
```

---

## Auth

### `POST /auth/register`

Registra un nuevo usuario. El rol asignado es siempre `user`.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "name": "Nombre Apellido",
  "password": "contraseña_min8"
}
```

| Campo | Tipo | Validación |
|-------|------|-----------|
| `email` | string | Formato email válido, único |
| `name` | string | Mínimo 2 caracteres |
| `password` | string | Mínimo 8 caracteres |

**Respuesta 201:**
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "name": "Nombre Apellido",
  "role": "user",
  "createdAt": "2026-06-30T06:00:00.000Z"
}
```

**Errores:**
- `409 Conflict` — El email ya está registrado.

---

### `POST /auth/login`

Inicia sesión y devuelve un token JWT.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}
```

**Respuesta 200:**
```json
{
  "access_token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "name": "Nombre",
    "role": "user",
    "isActive": true
  }
}
```

**Errores:**
- `401 Unauthorized` — Credenciales incorrectas.
- `403 Forbidden` — La cuenta está desactivada.

---

### `GET /auth/me`

Devuelve el perfil del usuario autenticado.

**Auth:** JWT requerido.

**Respuesta 200:**
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "name": "Nombre",
  "role": "user"
}
```

---

### `PATCH /auth/profile`

Actualiza el nombre del usuario autenticado.

**Auth:** JWT requerido.

**Body:**
```json
{
  "name": "Nuevo Nombre"
}
```

| Campo | Validación |
|-------|-----------|
| `name` | Mínimo 2 caracteres |

**Respuesta 200:**
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "name": "Nuevo Nombre",
  "role": "user",
  "isActive": true
}
```

---

### `PATCH /auth/password`

Cambia la contraseña del usuario autenticado.

**Auth:** JWT requerido.

**Body:**
```json
{
  "currentPassword": "contraseña_actual",
  "newPassword": "nueva_contraseña_min8"
}
```

| Campo | Validación |
|-------|-----------|
| `currentPassword` | No vacío |
| `newPassword` | Mínimo 8 caracteres |

**Respuesta 200:**
```json
{
  "message": "Contraseña actualizada correctamente"
}
```

**Errores:**
- `400 Bad Request` — La contraseña actual es incorrecta.

---

## Usuarios

### `GET /users/search?q=`

Busca usuarios activos por email o nombre. Útil para el buscador al compartir documentos. Devuelve máximo 10 resultados.

**Auth:** JWT requerido.  
**Query param:** `q` — texto a buscar (email o nombre, insensible a mayúsculas).

**Respuesta 200:**
```json
[
  { "id": "uuid", "email": "usuario@ejemplo.com", "name": "Nombre" }
]
```

---

### `GET /users`

Lista todos los usuarios registrados.

**Auth:** JWT + rol `admin`.

**Respuesta 200:**
```json
[
  {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "name": "Nombre",
    "role": "user",
    "isActive": true,
    "createdAt": "2026-06-30T06:00:00.000Z"
  }
]
```

---

### `GET /users/:id`

Obtiene un usuario por su ID.

**Auth:** JWT + rol `admin`.

**Respuesta 200:** Mismo formato que el elemento de `GET /users`.

**Errores:**
- `404 Not Found` — Usuario no encontrado.

---

### `PATCH /users/:id/role`

Cambia el rol de un usuario. Un admin no puede cambiar su propio rol.

**Auth:** JWT + rol `admin`.

**Body:**
```json
{
  "role": "auditor"
}
```

| Valor de `role` | Descripción |
|----------------|-------------|
| `admin` | Acceso total |
| `user` | Acceso estándar |
| `auditor` | Solo auditoría |

**Respuesta 200:**
```json
{
  "id": "uuid",
  "email": "...",
  "name": "...",
  "role": "auditor",
  "isActive": true
}
```

**Errores:**
- `400 Bad Request` — Intento de cambiar el propio rol.
- `404 Not Found` — Usuario no encontrado.

---

### `PATCH /users/:id/disable`

Desactiva la cuenta de un usuario. No puede desactivarse a uno mismo. El usuario desactivado recibe 401 en cada request aunque tenga JWT válido.

**Auth:** JWT + rol `admin`.

**Respuesta 200:**
```json
{
  "id": "uuid",
  "email": "...",
  "name": "...",
  "role": "user",
  "isActive": false
}
```

---

### `PATCH /users/:id/enable`

Activa una cuenta previamente desactivada.

**Auth:** JWT + rol `admin`.

**Respuesta 200:** Igual que `/disable` pero con `isActive: true`.

---

## Carpetas

### `POST /folders`

Crea una nueva carpeta. Opcionalmente puede tener una carpeta padre (subcarpeta).

**Auth:** JWT requerido.

**Body:**
```json
{
  "name": "Proyectos",
  "parentId": "uuid-opcional"
}
```

| Campo | Validación |
|-------|-----------|
| `name` | Mínimo 1 carácter |
| `parentId` | UUID válido (opcional). Debe pertenecer al mismo usuario. |

**Respuesta 201:**
```json
{
  "id": "uuid",
  "name": "Proyectos",
  "ownerId": "uuid",
  "parentId": null,
  "createdAt": "2026-06-30T06:00:00.000Z"
}
```

---

### `GET /folders`

Lista todas las carpetas del usuario autenticado, ordenadas por jerarquía y nombre.

**Auth:** JWT requerido.

**Respuesta 200:**
```json
[
  {
    "id": "uuid",
    "name": "Proyectos",
    "ownerId": "uuid",
    "parentId": null,
    "createdAt": "...",
    "children": [
      { "id": "uuid2", "name": "Proyecto A" }
    ]
  }
]
```

---

### `DELETE /folders/:id`

Elimina una carpeta y todas sus subcarpetas recursivamente. Los documentos que contenía se mueven a la raíz (sin carpeta). Solo el propietario puede eliminar.

**Auth:** JWT requerido.

**Respuesta 200:** Sin cuerpo (`undefined`).

**Errores:**
- `403 Forbidden` — No eres el propietario.
- `404 Not Found` — Carpeta no encontrada.

---

## Documentos

### `GET /documents`

Lista los documentos a los que el usuario tiene acceso (como propietario o con permiso compartido). Solo devuelve documentos con `status === 'active'`.

**Auth:** JWT requerido.  
**Query params opcionales:**

| Param | Descripción |
|-------|-------------|
| `folderId` | UUID de carpeta para filtrar. Enviar `null` para ver documentos sin carpeta. Omitir para ver todos. |

**Respuesta 200:**
```json
[
  {
    "id": "uuid",
    "originalName": "contrato.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "sha256": "abc123...",
    "status": "active",
    "folderId": "uuid-carpeta",
    "createdAt": "...",
    "updatedAt": "...",
    "permission": "owner",
    "versionCount": 2,
    "owner": { "id": "uuid", "email": "...", "name": "..." },
    "folder": { "id": "uuid", "name": "Proyectos" }
  }
]
```

---

### `POST /documents`

Sube un nuevo documento. El archivo se cifra automáticamente con AES-256-GCM antes de guardarse en MinIO.

Si el usuario ya tiene un documento activo con el mismo nombre (`originalName`), el contenido actual se guarda como versión y el documento se actualiza con el nuevo contenido.

**Auth:** JWT requerido.  
**Content-Type:** `multipart/form-data`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `file` | File | Archivo a subir (requerido) |
| `folderId` | string | UUID de carpeta (opcional) |

Tamaño máximo configurable con `MAX_FILE_SIZE_MB` (default: 100 MB).

**Respuesta 201 — Nuevo documento:**
```json
{
  "id": "uuid",
  "originalName": "contrato.pdf",
  "mimeType": "application/pdf",
  "size": 204800,
  "sha256": "abc123...",
  "createdAt": "..."
}
```

**Respuesta 201 — Nueva versión:**
```json
{
  "id": "uuid",
  "originalName": "contrato.pdf",
  "mimeType": "application/pdf",
  "size": 215040,
  "sha256": "def456...",
  "createdAt": "...",
  "newVersion": true,
  "versionNumber": 3
}
```

---

### `GET /documents/trash`

Lista los documentos eliminados (soft delete) del usuario autenticado.

**Auth:** JWT requerido.

**Respuesta 200:**
```json
[
  {
    "id": "uuid",
    "originalName": "viejo.docx",
    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "size": 51200,
    "status": "deleted",
    "updatedAt": "..."
  }
]
```

---

### `GET /documents/:id/download`

Descarga el documento descifrado. El backend descifra el contenido antes de enviarlo.

**Auth:** JWT requerido (debe tener permiso `owner` o `read`).

**Respuesta 200:** Binario del archivo con cabeceras:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="contrato.pdf"
Content-Length: 204800
```

**Errores:**
- `403 Forbidden` — Sin permiso de acceso (se registra en auditoría).
- `404 Not Found` — Documento no encontrado o eliminado.

---

### `DELETE /documents/:id`

Elimina un documento con soft delete (cambia `status` a `deleted`). Solo el propietario puede eliminar. El archivo en MinIO no se borra. Se puede restaurar.

**Auth:** JWT + propietario.

**Respuesta 200:**
```json
{
  "message": "Documento eliminado correctamente"
}
```

---

### `POST /documents/:id/restore`

Restaura un documento desde la papelera (cambia `status` a `active`).

**Auth:** JWT + propietario.

**Respuesta 200:**
```json
{
  "message": "Documento restaurado correctamente"
}
```

**Errores:**
- `404 Not Found` — No hay documento eliminado con ese ID.

---

### `PATCH /documents/:id`

Mueve un documento a una carpeta diferente. Solo el propietario puede mover.

**Auth:** JWT + propietario.

**Body:**
```json
{
  "folderId": "uuid-de-carpeta"
}
```

Enviar `folderId: null` para mover a la raíz (sin carpeta).

**Respuesta 200:**
```json
{
  "id": "uuid",
  "folderId": "uuid-de-carpeta"
}
```

---

### `GET /documents/:id/versions`

Lista las versiones anteriores del documento. La versión más reciente siempre es el documento principal; este endpoint devuelve las versiones guardadas antes.

**Auth:** JWT requerido (propietario o acceso compartido).

**Respuesta 200:**
```json
[
  {
    "id": "uuid-version",
    "versionNumber": 2,
    "originalName": "contrato.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "sha256": "abc123...",
    "createdAt": "..."
  },
  {
    "id": "uuid-version-2",
    "versionNumber": 1,
    ...
  }
]
```

---

### `GET /documents/:id/versions/:versionId/download`

Descarga una versión anterior del documento, descifrada.

**Auth:** JWT requerido (propietario o acceso compartido).

**Respuesta 200:** Binario con cabeceras equivalentes a la descarga principal.

**Errores:**
- `403 Forbidden` — Sin permiso.
- `404 Not Found` — Versión no encontrada.

---

### `POST /documents/:id/share`

Comparte un documento con otro usuario por email. El usuario destino obtendrá permiso `read`.

**Auth:** JWT + propietario.

**Body:**
```json
{
  "email": "destinatario@ejemplo.com"
}
```

**Respuesta 201:**
```json
{
  "message": "Documento compartido con Nombre (destinatario@ejemplo.com)",
  "user": {
    "id": "uuid",
    "email": "destinatario@ejemplo.com",
    "name": "Nombre"
  }
}
```

**Errores:**
- `400 Bad Request` — No puedes compartir contigo mismo.
- `404 Not Found` — No existe usuario con ese email.
- `409 Conflict` — El usuario ya tiene acceso.

---

### `GET /documents/:id/permissions`

Lista todos los usuarios con acceso al documento.

**Auth:** JWT + propietario.

**Respuesta 200:**
```json
[
  {
    "id": "uuid-permiso",
    "documentId": "uuid",
    "userId": "uuid",
    "permission": "owner",
    "createdAt": "...",
    "user": {
      "id": "uuid",
      "email": "propietario@ejemplo.com",
      "name": "Propietario",
      "role": "user"
    }
  },
  {
    "id": "uuid-permiso-2",
    "permission": "read",
    "user": { ... }
  }
]
```

---

### `DELETE /documents/:id/share/:userId`

Revoca el acceso de un usuario al documento.

**Auth:** JWT + propietario.

**Errores:**
- `400 Bad Request` — No puedes revocar tu propio acceso como propietario.
- `404 Not Found` — El usuario no tiene acceso al documento.

**Respuesta 200:**
```json
{
  "message": "Acceso de Nombre revocado correctamente"
}
```

---

## Auditoría

Todos los endpoints de auditoría requieren **JWT + rol `admin` o `auditor`**, excepto `/by-user/:id` que requiere solo `admin`.

### `GET /audit`

Devuelve los últimos 200 logs de auditoría con filtros opcionales.

**Auth:** JWT + admin/auditor.  
**Query params (todos opcionales):**

| Param | Descripción |
|-------|-------------|
| `action` | Filtrar por tipo de acción (enum `AuditAction`) |
| `entityType` | Filtrar por tipo de entidad ("Document", "User", "folder") |
| `entityId` | Filtrar por ID de entidad específica |
| `from` | Fecha de inicio (ISO 8601) |
| `to` | Fecha de fin (ISO 8601) |

**Respuesta 200:**
```json
[
  {
    "id": "uuid",
    "actorId": "uuid",
    "action": "DOCUMENT_UPLOADED",
    "entityType": "Document",
    "entityId": "uuid-doc",
    "ipAddress": "127.0.0.1",
    "metadata": { "originalName": "contrato.pdf", "size": 204800 },
    "createdAt": "...",
    "actor": {
      "id": "uuid",
      "email": "usuario@ejemplo.com",
      "name": "Nombre"
    }
  }
]
```

---

### `GET /audit/summary`

Devuelve un resumen estadístico de acciones agrupadas por tipo y por día.

**Auth:** JWT + admin/auditor.  
**Query params opcionales:** `from`, `to` (ISO 8601).

**Respuesta 200:**
```json
{
  "total": 145,
  "byAction": {
    "DOCUMENT_UPLOADED": 32,
    "DOCUMENT_DOWNLOADED": 67,
    "USER_LOGGED_IN": 28,
    "DOCUMENT_ACCESS_DENIED": 3
  },
  "byDay": [
    { "date": "2026-06-28", "count": 42 },
    { "date": "2026-06-29", "count": 61 },
    { "date": "2026-06-30", "count": 42 }
  ]
}
```

---

### `GET /audit/by-document/:id`

Devuelve el historial completo de auditoría de un documento específico.

**Auth:** JWT + admin/auditor.

**Respuesta 200:** Array de entradas de auditoría (mismo formato que `GET /audit`), ordenadas por fecha descendente.

---

### `GET /audit/by-user/:id`

Devuelve las últimas 200 acciones realizadas por un usuario específico.

**Auth:** JWT + rol `admin` exclusivamente.

**Respuesta 200:** Array de entradas de auditoría (mismo formato que `GET /audit`), ordenadas por fecha descendente.
