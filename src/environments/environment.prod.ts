import { AppEnvironment } from './environment.model';

/** Generado desde `.env.production` / CI. Edita el `.env*`, no este archivo. */
export const environment: AppEnvironment = {
  production: true,
  useMocks: true,
  apiBaseUrl: "https://www.api.easydry.com",
  appName: "EasyDry®",
  environmentName: "production",
  cognito: {
    region: "us-east-2",
    userPoolId: "",
    clientId: ""
  }
};
