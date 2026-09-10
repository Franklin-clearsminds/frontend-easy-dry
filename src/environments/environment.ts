import { AppEnvironment } from './environment.model';

/** Generado desde `.env` / CI. Edita el `.env*`, no este archivo. */
export const environment: AppEnvironment = {
  production: false,
  useMocks: false,
  apiBaseUrl: "http://localhost:3000/api/v1",
  appName: "EasyDry®",
  environmentName: "test",
  cognito: {
    region: "us-east-2",
    userPoolId: "",
    clientId: ""
  }
};
