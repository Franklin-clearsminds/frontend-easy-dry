import { AppEnvironment } from './environment.model';

/** Generado desde `.env` / CI. Edita el `.env*`, no este archivo. */
export const environment: AppEnvironment = {
  production: false,
  useMocks: true,
  apiBaseUrl: "http://localhost:3000/api/v1",
  appName: "EasyDry®",
  environmentName: "development",
  cognito: {
    region: "us-east-2",
    userPoolId: "us-east-2_PROD_POOL_ID",
    clientId: "easydry_prod_client_id"
  }
};
