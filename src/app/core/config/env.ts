import { environment } from '../../../environments/environment';
import { AppEnvironment } from '../../../environments/environment.model';

export type { AppEnvironment };
export { environment };

export function apiUrl(path: string): string {
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function isMockMode(): boolean {
  return environment.useMocks || !environment.apiBaseUrl;
}

export function isCognitoConfigured(): boolean {
  const { region, userPoolId, clientId } = environment.cognito;
  return Boolean(region && userPoolId && clientId);
}
