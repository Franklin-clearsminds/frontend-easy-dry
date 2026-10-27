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
| `NG_APP_API_BASE_URL` | URL base del API Backend NestJS (el WebSocket se deriva de ella quitando `/api/v1`) | `http://localhost:3001/api/v1` |

> ℹ️ **Sincronización Automática de Entorno**: El proyecto incluye el script `scripts/sync-env.mjs`, que se ejecuta automáticamente al usar `pnpm start` o `pnpm build` para generar dinámicamente `src/environments/environment.ts` a partir del `.env` sin exponer credenciales sensibles en el repositorio.

---

## 📦 Instalación de Dependencias

Ejecuta el siguiente comando en la raíz de `frontend-easy-dry`:

```bash
pnpm install
```

> ⚠️ **Usa siempre `pnpm`**, nunca `npm install`. Este monorepo usa `pnpm-workspace.yaml`; mezclar gestores de paquetes corrompe el árbol de `node_modules`.

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
4. **Taller Técnico & Maquinaria (`/maquinaria`, `/mantenimiento`, `/incidentes`, `/limpiezas`)**:
   - Registro de hidrolavadoras, compresores, bombas dosificadoras y aspiradoras industriales, con hoja de vida de cada equipo.
   - Mantenimientos **preventivos** programados (ya no hay tipos de mantenimiento ni lista de verificación), con consumo de repuestos.
   - Limpieza de maquinaria con evidencia fotográfica y seguimiento de las atrasadas.
5. **Bodega & Suministros (`/inventario`)**:
   - Gestión de existencias de químicos, ceras, pads, microfibras y despacho de lotes hacia bodegas satélite.
6. **Catálogo & Tarifarios (`/configuracion/catalogo-servicios`)**:
   - Catálogo maestro de servicios generales y especiales con recetas sugeridas de insumos por vehículo.
7. **Sucursales & Bahías (`/sucursales`)**:
   - Directorio de sedes nacionales (Quito Norte, Quito Sur, Cumbayá, Guayaquil) con asignación de servicios y bahías.
8. **Usuarios & Control de Acceso RBAC (`/usuarios`)**:
   - Administración de cuentas corporativas, roles y auditoría de permisos. Las contraseñas solo las asignan quienes tienen el permiso para ello. Los permisos se refrescan al instante tras un cambio de rol (sin requerir cierre de sesión).
9. **Productividad & Retos (`/productividad`)**:
   - Ranking de agencias y ranking de lavadores (cantidad de servicios + tiempo promedio) calculados en el servidor.
   - Directorio de retos comerciales/operativos: creación, carrusel de retos activos y cierre manual con registro de ganador y resultado.
10. **Notificaciones en Tiempo Real**:
    - Centro de notificaciones conectado por WebSocket (`socket.io-client`, namespace `/notifications`); persistencia real, no sintéticas en el cliente. Los indicadores del menú lateral (notificaciones, envíos y aprobaciones pendientes) se actualizan solos.
11. **Evidencias multimedia**:
    - Fotos, videos y documentos se abren a tamaño completo en un visor global (`VisorMediaService` + `<app-visor-media-host>` + directiva `appVerMedia`), con ampliación opcional. Los archivos privados se resuelven con URL firmada.
    - Las fotos de perfil usan la directiva `appAvatar`: resuelve la dirección del archivo y, si no carga, muestra las iniciales en lugar de una imagen rota.
12. **Envíos y confirmación**:
    - Recepción con diferencias: los envíos con desconformidad se marcan en rojo y quien tiene permiso los resuelve; todo queda registrado.
13. **Reportes operativos (`/reportes`)**: reportes por agencia y período, con archivos generados en el servidor.

> **Carga bajo demanda:** cada pantalla con pestañas (Dashboard, Sucursales, Notificaciones, Mapa de red, etc.) pide al servidor solo los datos de la pestaña visible, y las tablas grandes paginan en el servidor.

---

## 🔐 Cuentas de acceso

No hay usuarios de ejemplo. La primera cuenta es la de Super Admin sembrada por el backend (`SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` de su `.env`); el resto se crea desde **Usuarios** o con el importador del Excel. Ver [USUARIOS-DEMO.md](../USUARIOS-DEMO.md).

---

## 🧪 Pruebas Automatizadas

Suite de pruebas unitarias con Karma + Jasmine (`pnpm test`) y pruebas de integración contra el backend (`pnpm run test:integracion`):

```bash
pnpm test
```

---

## 🚀 Despliegue (Vercel)

El `vercel.json` define el build y la reescritura a `index.html`, e ignora los builds de cualquier rama que no sea `develop` (`ignoreCommand`): solo `develop` se despliega; `main` y las demás ramas no generan Preview.

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
│   │   ├── core/           # Guards de autenticación, interceptores HTTP, servicios y modelos
│   │   ├── features/       # Módulos y vistas de negocio (servicios, taller, inventario, etc.)
│   │   └── shared/         # Componentes y directivas compartidos (sidebar, tablas, visor de medios, avatar, filtros)
│   ├── assets/             # Logotipos SVG, tipografías e imágenes estáticas
│   ├── environments/       # Archivos de entorno generados dinámicamente
│   ├── styles.css          # Configuración global y capas de TailwindCSS
│   └── index.html          # Shell HTML con fuentes Outfit e Inter
├── scripts/
│   └── sync-env.mjs        # Generador de environment.ts a partir de .env
├── angular.json            # Configuración del compilador Angular v19
└── package.json            # Dependencias y scripts de ejecución
```
