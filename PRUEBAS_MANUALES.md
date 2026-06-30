# SecureDocs — Guía de Pruebas Manuales

Esta guía cubre el flujo completo de la aplicación paso a paso. Ideal para verificar que el entorno local funciona correctamente antes de una demo o entrega.

## Prerrequisitos

Antes de empezar, asegúrate de que:

- [ ] `docker compose up -d` está corriendo (PostgreSQL + MinIO)
- [ ] El backend está arrancado en `http://localhost:3000`
- [ ] El frontend está arrancado en `http://localhost:5173`
- [ ] El seed se ejecutó y existe el usuario `admin@securedocs.local`

---

## Bloque 1 — Autenticación

### 1.1 Login con admin

1. Abre `http://localhost:5173`
2. Introduce `admin@securedocs.local` y `Admin1234!`
3. Haz clic en **Entrar**

**Resultado esperado:** Redirige al Dashboard. El sidebar muestra todos los items: Dashboard, Documentos, Auditoría, Reportes, Usuarios, Mi perfil.

---

### 1.2 Registro de nuevo usuario

1. Cierra sesión (botón al final del sidebar)
2. Ve a `/register`
3. Rellena nombre, email y contraseña (mínimo 8 caracteres)
4. Clic en **Registrarse**

**Resultado esperado:** Redirige al Dashboard. El sidebar solo muestra: Dashboard, Documentos, Mi perfil.

---

### 1.3 Intento de login con contraseña incorrecta

1. Ve a `/login`
2. Introduce un email correcto pero contraseña incorrecta
3. Haz clic en **Entrar**

**Resultado esperado:** Se muestra el mensaje "Credenciales incorrectas". No se redirige.

---

## Bloque 2 — Perfil de usuario

### 2.1 Cambiar el nombre

1. Inicia sesión con cualquier usuario
2. Ve a `/profile` (enlace "Mi perfil" en el sidebar)
3. Cambia el nombre en el formulario **Información personal**
4. Clic en **Guardar nombre**

**Resultado esperado:** Aparece confirmación verde. El nombre actualizado aparece en el sidebar.

---

### 2.2 Cambiar contraseña

1. En `/profile`, rellena el formulario **Cambiar contraseña**:
   - Contraseña actual: la actual
   - Nueva contraseña: mínimo 8 caracteres
   - Confirmar nueva: igual a la anterior
2. Clic en **Cambiar contraseña**

**Resultado esperado:** Mensaje de éxito verde.

---

### 2.3 Cambiar contraseña con contraseña actual incorrecta

1. Rellena el formulario con una contraseña actual equivocada
2. Clic en **Cambiar contraseña**

**Resultado esperado:** Error "La contraseña actual es incorrecta".

---

## Bloque 3 — Documentos

### 3.1 Subir un documento

1. Inicia sesión con el usuario de prueba
2. Ve a `/documents`
3. Clic en **Subir documento**
4. Selecciona cualquier archivo (PDF, imagen, Word, etc.)

**Resultado esperado:**
- Aparece mensaje verde de confirmación.
- El archivo aparece en la tabla con su nombre, tamaño y badge "Propietario".

---

### 3.2 Descargar el documento

1. En la fila del documento subido, clic en **Descargar**

**Resultado esperado:** El navegador descarga el archivo. Al abrirlo, el contenido es idéntico al original.

---

### 3.3 Control de versiones — subir nueva versión

1. Sube un archivo diferente pero con **el mismo nombre** que el documento anterior

**Resultado esperado:**
- Mensaje verde indicando "actualizado a versión 2"
- La columna tamaño muestra el nuevo tamaño
- El número de versión aparece en el campo tipo (`v2`)

---

### 3.4 Ver y descargar versión anterior

1. Clic en el botón **Versiones** (icono de reloj) de un documento con versiones
2. Se abre el modal de versiones
3. Clic en **Descargar** en una versión anterior

**Resultado esperado:** El modal muestra la lista con número de versión, tamaño y fecha. La descarga recupera el contenido original de esa versión.

---

### 3.5 Crear una carpeta

1. En `/documents`, clic en el icono de carpeta con `+` (esquina superior del panel lateral)
2. Escribe un nombre y pulsa Enter o el botón de confirmar

**Resultado esperado:** La carpeta aparece en el panel lateral izquierdo con icono amarillo.

---

### 3.6 Mover un documento a una carpeta

1. En la fila del documento, clic en **Mover** (icono flecha)
2. En el modal, selecciona la carpeta creada

**Resultado esperado:** La columna "Carpeta" muestra el nombre de la carpeta. Si filtras por esa carpeta desde el panel lateral, aparece el documento.

---

### 3.7 Filtrar documentos por carpeta

1. Clic en una carpeta del panel lateral

**Resultado esperado:** Solo se muestran los documentos dentro de esa carpeta.

---

### 3.8 Eliminar un documento

1. En la fila de un documento, clic en **Eliminar**
2. Confirma el diálogo

**Resultado esperado:** Mensaje verde. El documento desaparece de la vista activa.

---

### 3.9 Papelera y restaurar

1. Clic en el botón **Papelera** (parte superior derecha)

**Resultado esperado:** Vista de papelera mostrando el documento eliminado.

2. Clic en **Restaurar** en el documento eliminado

**Resultado esperado:** Mensaje verde. El documento vuelve a la vista activa. La vista cambia automáticamente a "Activos".

---

### 3.10 Eliminar una carpeta

1. En el panel lateral, pasa el cursor por una carpeta y clic en la `x` roja
2. Confirma el diálogo

**Resultado esperado:** La carpeta desaparece. Los documentos que contenía quedan sin carpeta (columna "Carpeta" vacía).

---

## Bloque 4 — Compartición de documentos

### 4.1 Compartir con otro usuario

Para esta prueba necesitas dos cuentas. Usa el admin y el usuario de prueba creado en el Bloque 1.

1. Inicia sesión como **usuario de prueba** (no admin)
2. Sube un documento
3. Clic en **Compartir** (icono de personas)
4. En el buscador del modal, escribe el email del admin
5. Selecciona al admin y clic en **Compartir**

**Resultado esperado:** El admin aparece en la lista de permisos del modal.

---

### 4.2 Verificar acceso compartido

1. Cierra sesión e inicia como **admin**
2. Ve a `/documents`

**Resultado esperado:** El documento compartido aparece con badge "Compartido". El admin puede descargarlo.

---

### 4.3 Revocar acceso

1. Vuelve a iniciar sesión como el **usuario de prueba** (propietario)
2. Abre el modal de compartición del documento
3. En la lista de permisos, clic en **Revocar** junto al admin

**Resultado esperado:** El admin desaparece de la lista de permisos.

---

### 4.4 Verificar que el acceso fue revocado

1. Inicia sesión como admin
2. El documento ya no debe aparecer en `/documents`

---

## Bloque 5 — Gestión de usuarios (admin)

### 5.1 Ver todos los usuarios

1. Inicia sesión como admin
2. Ve a `/users`

**Resultado esperado:** Lista con todos los usuarios, sus roles, estado (activo/inactivo) y fecha de registro.

---

### 5.2 Cambiar el rol de un usuario

1. En la fila del usuario de prueba, despliega el selector de rol y elige **Auditor**

**Resultado esperado:** El badge de rol cambia a "Auditor". Se muestra mensaje de confirmación.

---

### 5.3 Verificar cambio de rol en el frontend

1. Cierra sesión e inicia como el usuario de prueba

**Resultado esperado:** El sidebar ahora muestra Auditoría y Reportes, pero no Documentos.

---

### 5.4 Restaurar rol original

1. Inicia sesión como admin
2. Cambia el rol del usuario de vuelta a **Usuario**

---

### 5.5 Desactivar una cuenta

1. En `/users`, clic en **Desactivar** junto al usuario de prueba
2. Confirma el diálogo

**Resultado esperado:** El badge de estado cambia a "Inactivo" (gris).

---

### 5.6 Verificar que el usuario desactivado no puede iniciar sesión

1. Intenta iniciar sesión con las credenciales del usuario desactivado

**Resultado esperado:** Error "Tu cuenta ha sido desactivada".

---

### 5.7 Reactivar la cuenta

1. Inicia sesión como admin
2. En `/users`, clic en **Activar** junto al usuario desactivado

**Resultado esperado:** El badge vuelve a "Activo" (verde).

---

## Bloque 6 — Auditoría

### 6.1 Ver logs de auditoría

1. Inicia sesión como admin
2. Ve a `/audit`

**Resultado esperado:** Lista de eventos con actor, acción, entidad, IP y fecha.

---

### 6.2 Filtrar por acción

1. En el desplegable **Acción**, selecciona `DOCUMENT_UPLOADED`

**Resultado esperado:** Solo aparecen eventos de subida de documentos.

---

### 6.3 Filtrar por rango de fechas

1. Selecciona una fecha de inicio y una de fin
2. Clic en **Buscar**

**Resultado esperado:** Solo aparecen eventos dentro del rango seleccionado.

---

### 6.4 Ver reportes de actividad

1. Ve a `/audit/reports`

**Resultado esperado:**
- Tarjetas con totales: eventos totales, documentos subidos, descargas, accesos denegados.
- Gráfico de barras con las acciones más frecuentes.
- Gráfico de actividad por día.

---

### 6.5 Filtrar reportes por fecha

1. Selecciona un rango de fechas en la parte superior
2. Clic en **Aplicar**

**Resultado esperado:** Las métricas y gráficos se actualizan al rango seleccionado.

---

## Bloque 7 — Seguridad básica

### 7.1 Acceso sin autenticación

1. Sin iniciar sesión, intenta ir directamente a `http://localhost:5173/documents`

**Resultado esperado:** Redirige automáticamente a `/login`.

---

### 7.2 Token de usuario desactivado invalida inmediatamente

1. Inicia sesión con el usuario de prueba — copia el token de localStorage (DevTools → Application → Local Storage).
2. Desactiva esa cuenta desde el admin.
3. Recarga la página en la sesión del usuario de prueba.

**Resultado esperado:** El usuario es redirigido a `/login` porque el token ya no es válido.

---

### 7.3 Usuario sin permiso no puede descargar

1. Con el admin, obtén el ID de un documento que pertenece solo al usuario de prueba.
2. Intenta acceder directamente a `http://localhost:3000/documents/<id>/download` con el JWT del admin (usando Swagger o curl).

**Resultado esperado:** `403 Forbidden`. El evento `DOCUMENT_ACCESS_DENIED` aparece en el log de auditoría.

---

### 7.4 Swagger disponible

1. Abre `http://localhost:3000/api`

**Resultado esperado:** Swagger UI con todos los endpoints documentados y la opción de autenticar con Bearer token.

---

## Resumen del Checklist

| # | Prueba | Estado |
|---|--------|--------|
| 1.1 | Login con admin | |
| 1.2 | Registro de nuevo usuario | |
| 1.3 | Login con contraseña incorrecta | |
| 2.1 | Cambiar nombre de perfil | |
| 2.2 | Cambiar contraseña | |
| 2.3 | Cambiar contraseña incorrecta | |
| 3.1 | Subir documento | |
| 3.2 | Descargar documento | |
| 3.3 | Subir nueva versión | |
| 3.4 | Ver y descargar versión anterior | |
| 3.5 | Crear carpeta | |
| 3.6 | Mover documento a carpeta | |
| 3.7 | Filtrar por carpeta | |
| 3.8 | Eliminar documento | |
| 3.9 | Papelera y restaurar | |
| 3.10 | Eliminar carpeta | |
| 4.1 | Compartir documento | |
| 4.2 | Verificar acceso compartido | |
| 4.3 | Revocar acceso | |
| 4.4 | Verificar revocación | |
| 5.1 | Ver usuarios (admin) | |
| 5.2 | Cambiar rol | |
| 5.3 | Verificar cambio de rol | |
| 5.5 | Desactivar cuenta | |
| 5.6 | Login con cuenta desactivada | |
| 5.7 | Reactivar cuenta | |
| 6.1 | Ver logs de auditoría | |
| 6.2 | Filtrar por acción | |
| 6.3 | Filtrar por fechas | |
| 6.4 | Ver reportes | |
| 7.1 | Acceso sin autenticación | |
| 7.2 | Token de usuario desactivado | |
| 7.3 | Descarga sin permiso | |
| 7.4 | Swagger disponible | |
