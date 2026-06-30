# SecureDocs — Frontend

Interfaz web de SecureDocs construida con React, TypeScript, Vite y Tailwind CSS.

## Requisitos

- Node.js 20+
- Backend de SecureDocs corriendo en http://localhost:3000

## Instalación

```bash
npm install
```

## Configurar variables de entorno

```bash
cp .env.example .env
```

El valor por defecto apunta al backend local:

```
VITE_API_URL=http://localhost:3000
```

## Iniciar en desarrollo

```bash
npm run dev
```

La app estará disponible en http://localhost:5173

## Build para producción

```bash
npm run build
```

## Pantallas incluidas

| Ruta | Pantalla | Roles |
|------|----------|-------|
| `/login` | Inicio de sesión | Público |
| `/register` | Registro | Público |
| `/dashboard` | Panel principal | Todos |
| `/documents` | Lista y subida de documentos | admin, user |
| `/audit` | Logs de auditoría con filtros | admin, auditor |
| `/users` | Gestión de usuarios | admin |

## Funcionalidades

- Autenticación con JWT (almacenado en localStorage)
- Protección de rutas por rol
- Subida de documentos (cifrado transparente en el backend)
- Descarga de documentos con verificación de permisos
- Búsqueda local en la lista de documentos
- Logs de auditoría con filtros por acción y fecha
- Cierre de sesión

## Estructura

```
src/
├── components/
│   ├── layout/   # AppLayout, Sidebar, RequireAuth
│   └── ui/       # Button, Input, Badge, Alert
├── lib/          # Cliente Axios con interceptores JWT
├── pages/        # Login, Register, Dashboard, Documents, Audit, Users
└── store/        # Estado global de autenticación (Zustand)
```
