# SecureDocs

Plataforma web para la gestión segura de documentos confidenciales.  
Cifrado AES-256-GCM, control de acceso por roles, auditoría inmutable y almacenamiento seguro.

---

## Estructura del Repositorio

```
SecureDocs/
├── backend/      # API NestJS + Prisma + PostgreSQL + MinIO
├── frontend/     # Interfaz React + TypeScript + Tailwind
├── plan.md       # Plan de acción del MVP
└── SecureDocs.md # Especificación del proyecto
```

---

## Requisitos Previos

| Herramienta | Versión mínima | Enlace |
|-------------|---------------|--------|
| Node.js | 20 LTS | https://nodejs.org |
| Docker Desktop | Cualquiera reciente | https://www.docker.com/products/docker-desktop/ |

---

## Arrancar el Proyecto Localmente

### 1. Instalar dependencias

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configurar variables de entorno del backend

```bash
cd backend
cp .env.example .env
```

El archivo `.env` ya viene configurado para desarrollo local. La clave de cifrado es generada automáticamente. Para producción, cambia **todos** los valores por secretos reales.

### 3. Levantar PostgreSQL y MinIO con Docker

```bash
cd backend
docker compose up -d
```

Esto levanta:
- **PostgreSQL** en `localhost:5432`
- **MinIO** en `localhost:9000` (API) y `localhost:9001` (consola web)

Consola MinIO: http://localhost:9001  
Usuario: `minioadmin` / Contraseña: `minioadmin`

### 4. Crear las tablas de la base de datos

```bash
cd backend
npx prisma migrate dev --name init
```

### 5. Crear el usuario administrador inicial

```bash
cd backend
npx ts-node --project tsconfig.json prisma/seed.ts
```

Esto crea:
- Email: `admin@securedocs.local`
- Contraseña: `Admin1234!`
- Rol: `admin`

### 6. Iniciar el backend

```bash
cd backend
npm run start:dev
```

Disponible en: http://localhost:3000  
Swagger (documentación API): http://localhost:3000/api

### 7. Iniciar el frontend

Abre una nueva terminal:

```bash
cd frontend
npm run dev
```

Disponible en: http://localhost:5173

---

## Primer Uso

1. Abre http://localhost:5173
2. Inicia sesión con `admin@securedocs.local` / `Admin1234!`
3. O crea una cuenta nueva en `/register`
4. Sube un documento desde la pantalla **Documentos**
5. Descárgalo — el backend lo descifra antes de enviarlo
6. Revisa la **Auditoría** con el usuario admin

---

## Endpoints Principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del servidor |
| `POST` | `/auth/register` | Registrar usuario |
| `POST` | `/auth/login` | Iniciar sesión |
| `GET` | `/auth/me` | Perfil autenticado |
| `POST` | `/documents` | Subir documento (se cifra automáticamente) |
| `GET` | `/documents` | Listar documentos accesibles |
| `GET` | `/documents/:id/download` | Descargar documento descifrado |
| `GET` | `/audit` | Logs de auditoría (admin/auditor) |
| `GET` | `/users` | Listar usuarios (admin) |

---

## Seguridad

- Contraseñas hasheadas con **Argon2**
- Documentos cifrados con **AES-256-GCM** antes de guardarse en MinIO
- Hash **SHA-256** del archivo original para verificar integridad
- Comunicación protegida con **JWT**
- Rutas protegidas por rol: `admin`, `user`, `auditor`
- Cada acción sensible queda registrada en la tabla `AuditLog`

---

## Comandos Útiles

```bash
# Ver logs de los contenedores Docker
docker compose logs -f

# Detener servicios Docker
docker compose down

# Abrir Prisma Studio (explorador visual de la base de datos)
cd backend
npx prisma studio

# Ejecutar pruebas unitarias del backend
cd backend
npm run test
```
