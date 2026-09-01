# 🌐 EasyDry® - Panel Web (Angular 19)

Panel web de administración y gestión para el sistema **EasyDry®**, desarrollado en **Angular 19**, **TypeScript** y **TailwindCSS**.

---

## 📋 Requisitos Previos

- **Node.js**: `v18.x` o `v20.x` (LTS recomendada).
- **npm**: `v9.x` o superior.
- **Angular CLI** (opcional a nivel global): `npm i -g @angular/cli`.

---

## ⚙️ Configuración Inicial

### 1. Variables de Entorno

Copia el archivo de ejemplo `.env.example` y renómbralo a `.env`:

```bash
cp .env.example .env
```

Las variables en la web utilizan el prefijo `NG_APP_`:

| Variable | Descripción | Valor Ejemplo (Desarrollo) |
|---|---|---|
| `NG_APP_NAME` | Nombre comercial del sistema | `EasyDry®` |
| `NG_APP_ENV` | Entorno actual (`test` / `production`) | `test` |
| `NG_APP_PRODUCTION` | Flag de producción | `false` |
| `NG_APP_USE_MOCKS` | `true` para usar usuarios/datos demo | `true` |
| `NG_APP_API_BASE_URL` | URL del API Backend | `https://www.testapi.easydry.com` |

> ℹ️ **Sincronización de Entorno**: El proyecto incluye un script (`scripts/sync-env.mjs`) que se ejecuta automáticamente al usar `npm start` o `npm run build` para inyectar estas variables en la configuración de Angular sin exponer secretos.

---

## 📦 Instalación de Dependencias

Ejecuta el siguiente comando para instalar las librerías del proyecto:

```bash
npm install
```

---

## 🚀 Comandos de Ejecución

### Servidor de Desarrollo Local

| Comando | Descripción |
|---|---|
| `npm start` | Sincroniza el `.env` e inicia el servidor de desarrollo (`ng serve`) en `http://localhost:4200/`. |
| `npm run build` | Compila la aplicación para producción en la carpeta `dist/`. |
| `npm run watch` | Sincroniza y compila en modo escucha (watch) para desarrollo. |
| `npm run env:sync` | Ejecuta únicamente la sincronización del archivo `.env`. |

---

## 🧹 Prevención y Resolución de Conflictos

### 1. Conflicto de Puerto (`4200` ocupado)
Si el puerto `4200` ya está siendo utilizado por otro servicio, puedes especificar un puerto diferente:
```bash
npx ng serve --port 4201
```

### 2. Conflicto de Caché de Angular
Si realizas cambios en dependencias o variables de entorno y no se reflejan, limpia la caché borrando la carpeta `.angular`:

En Windows (PowerShell):
```powershell
Remove-Item -Recurse -Force .angular
npm start
```
En Linux / macOS:
```bash
rm -rf .angular
npm start
```

### 3. Diferencia entre el Panel Web y la App Móvil
- **Panel Web**: Corre por defecto en el puerto `4200` (`http://localhost:4200`).
- **App Móvil**: Debe apuntar a `EXPO_PUBLIC_WEB_PANEL_URL=http://localhost:4200/login` en su `.env` si requiere redireccionar al panel web en desarrollo local.

---

## 📂 Estructura del Proyecto

```text
frontend-easy-dry/
├── src/
│   ├── app/            # Componentes, servicios, guardias y módulos de Angular
│   ├── assets/         # Imágenes, iconos y archivos estáticos
│   ├── environments/   # Archivos de ambiente (generados dinámicamente)
│   └── index.html      # HTML principal
├── scripts/
│   └── sync-env.mjs    # Script de sincronización .env -> environment.ts
├── angular.json        # Configuración del CLI de Angular
├── package.json        # Dependencias y scripts
└── .env                # Variables de entorno locales
```
