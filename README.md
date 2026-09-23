# 🌐 EasyDry® - Panel Web Administrativo (Angular 19)

Panel web de administración, gobernanza y gestión operativa integral para el sistema **EasyDry®**, desarrollado con **Angular 19**, **TypeScript**, **TailwindCSS** y **Lucide Icons**.

---

## 📋 Requisitos Previos

- **Node.js**: `v18.x` o `v20.x` (LTS recomendada).
- **pnpm**: `v9.x` o `v10.x` (gestor de paquetes oficial del monorepo).
- **Angular CLI** (opcional a nivel global): `pnpm add -g @angular/cli`.

---

## ⚙️ Configuración Inicial

### 1. Variables de Entorno

Copia el archivo de ejemplo `.env.example` y renómbralo a `.env`:

```bash
cp .env.example .env
```

Las variables en la aplicación web utilizan el prefijo `NG_APP_`:

| Variable | Descripción | Valor Ejemplo (Desarrollo) |
|---|---|---|
| `NG_APP_NAME` | Nombre comercial del sistema | `EasyDry®` |
| `NG_APP_ENV` | Entorno actual (`test` / `production`) | `test` |
| `NG_APP_PRODUCTION` | Flag de compilación para producción | `false` |
| `NG_APP_API_BASE_URL` | URL base del API Backend NestJS | `http://localhost:3000/api/v1` |

> ℹ️ **Sincronización Automática de Entorno**: El proyecto incluye el script `scripts/sync-env.mjs`, que se ejecuta automáticamente al usar `pnpm start` o `pnpm build` para generar dinámicamente `src/environments/environment.ts` a partir del `.env` sin exponer credenciales sensibles en el repositorio.

---

## 📦 Instalación de Dependencias

Ejecuta el siguiente comando en la raíz de `frontend-easy-dry`:

```bash
pnpm install
```

---

## 🚀 Comandos de Ejecución

| Comando | Descripción |
|---|---|
| `pnpm start` | Sincroniza `.env` e inicia el servidor de desarrollo (`ng serve`) en `http://localhost:4200/`. |
| `pnpm build` | Compila la aplicación optimizada para producción en `dist/frontend-easy-dry/`. |
| `pnpm watch` | Sincroniza y compila en modo escucha reactivo (watch). |
| `pnpm env:sync` | Ejecuta únicamente la sincronización del archivo `.env`. |

---

## 🏛️ Arquitectura y Módulos de Negocio

El frontend está estructurado bajo **Clean Architecture** y principios de diseño modular por dominios (DDD):

1. **Dashboard Corporativo (`/dashboard`)**:
   - KPIs gerenciales de lavado, mantenimientos, ingresos y metas operativas por región y sucursal.
2. **Servicios & Hojas de Control (`/servicios`)**:
   - Pestañas limpias para **Servicios Generales** y **Servicios Especiales** (Pulido, Cerámico, Motor, Chasis).
   - Tabla con filtrado global por sucursal, operador, bahía, estado y texto.
   - Paginación dinámica con selector de registros por página y contador totalizado (`Mostrar: X por página • Total: Y registros`).
3. **Bahías & Operación (`/mi-bahia`)**:
   - Supervisión del flujo de lavado en tiempo real por bahía, placa, tipo de vehículo y tiempos de atención.
4. **Taller Técnico & Maquinaria (`/maquinaria`, `/mantenimiento`, `/incidentes`)**:
   - Registro de hidrolavadoras, compresores, bombas dosificadoras y aspiradoras industriales.
   - Órdenes de trabajo preventivas y correctivas con consumo de repuestos y hojas de vida de equipos.
5. **Bodega & Suministros (`/inventario`)**:
   - Gestión de existencias de químicos, ceras, pads, microfibras y despacho de lotes hacia bodegas satélite.
6. **Catálogo & Tarifarios (`/configuracion/catalogo-servicios`)**:
   - Catálogo maestro de servicios generales y especiales con recetas sugeridas de insumos por vehículo.
7. **Sucursales & Bahías (`/sucursales`)**:
   - Directorio de sedes nacionales (Quito Norte, Quito Sur, Cumbayá, Guayaquil) con asignación de servicios y bahías.
8. **Usuarios & Control de Acceso RBAC (`/usuarios`)**:
   - Administración de credenciales corporativas, 13 roles oficiales y auditoría de permisos.

---

## 🔐 Matriz de Credenciales Demo para Pruebas

Para validar los diferentes niveles de acceso, consulta el archivo central [USUARIOS-DEMO.md](../USUARIOS-DEMO.md).  
Todos los usuarios de prueba utilizan la contraseña estándar: `Admin123*`.

| Rol | Correo Demo |
|---|---|
| Super Administrador | `superadmin@easydry.com` |
| Administrador | `admin@easydry.com` |
| Gerente de Sucursal | `gerente.norte@easydry.com` |
| Supervisor Regional | `supervisor.costa@easydry.com` |
| Coordinador Comercial | `comercial@easydry.com` |
| Jefe Servicios Especiales | `especiales@easydry.com` |

---

## 🧹 Resolución de Problemas Frecuentes

### 1. Puerto `4200` en uso
Si el puerto predeterminado está ocupado, especifica otro puerto:
```bash
pnpm exec ng serve --port 4201
```

### 2. Limpieza de Caché de Angular
Si modificas estilos o variables de entorno y no se reflejan:
- **Windows (PowerShell):**
  ```powershell
  Remove-Item -Recurse -Force .angular; pnpm start
  ```
- **Linux / macOS:**
  ```bash
  rm -rf .angular && pnpm start
  ```

---

## 📂 Estructura del Código

```text
frontend-easy-dry/
├── src/
│   ├── app/
│   │   ├── core/           # Guards de autenticación, interceptores HTTP, modelos y mocks
│   │   ├── features/       # Módulos y vistas de negocio (servicios, taller, inventario, etc.)
│   │   └── shared/         # Componentes compartidos (navbar, sidebar, pagination, filter-bar)
│   ├── assets/             # Logotipos SVG, tipografías e imágenes estáticas
│   ├── environments/       # Archivos de entorno generados dinámicamente
│   ├── styles.css          # Configuración global y capas de TailwindCSS
│   └── index.html          # Shell HTML con fuentes Outfit e Inter
├── scripts/
│   └── sync-env.mjs        # Generador de environment.ts a partir de .env
├── angular.json            # Configuración del compilador Angular v19
└── package.json            # Dependencias y scripts de ejecución
```
