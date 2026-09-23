/**
 * Copia NG_APP_* desde .env / .env.production / process.env
 * hacia src/environments/environment.ts (dev) o environment.prod.ts (build).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isProd = process.argv.includes('--prod');

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  const text = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function pickNgApp(source) {
  const out = {};
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith('NG_APP_') && value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

function bool(value, fallback) {
  if (value == null || value === '') return fallback;
  return !['false', '0', 'no'].includes(String(value).toLowerCase());
}

function str(value, fallback) {
  if (value == null) return fallback;
  return String(value);
}

const fileEnv = parseEnvFile(
  resolve(root, isProd ? '.env.production' : '.env')
);
const env = { ...fileEnv, ...pickNgApp(process.env) };

const production = isProd || bool(env.NG_APP_PRODUCTION, false);
const apiDefault = production ? 'https://www.api.easydry.com' : 'https://www.testapi.easydry.com';
const apiBaseUrl = str(env.NG_APP_API_BASE_URL, apiDefault);
const appName = str(env.NG_APP_NAME, 'EasyDry®');
const environmentName = str(env.NG_APP_ENV, production ? 'production' : 'test');

const targetRel = isProd
  ? 'src/environments/environment.prod.ts'
  : 'src/environments/environment.ts';

const contents = `import { AppEnvironment } from './environment.model';

/** Generado desde \`.env${isProd ? '.production' : ''}\` / CI. Edita el \`.env*\`, no este archivo. */
export const environment: AppEnvironment = {
  production: ${production},
  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
  appName: ${JSON.stringify(appName)},
  environmentName: ${JSON.stringify(environmentName)}
};
`;

writeFileSync(resolve(root, targetRel), contents, 'utf8');
console.log(`[env] wrote ${targetRel} (${environmentName})`);
