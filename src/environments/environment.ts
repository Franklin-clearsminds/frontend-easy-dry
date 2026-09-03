import { AppEnvironment } from './environment.model';

/** Generado desde `.env` / CI. Edita el `.env*`, no este archivo. */
export const environment: AppEnvironment = {
  production: false,
  useMocks: true,
  apiBaseUrl: "https://www.testapi.easydry.com",
  appName: "EasyDry®",
  environmentName: "test",
  cognito: {
    region: "us-east-2",
    userPoolId: "",
    clientId: ""
  }
};
