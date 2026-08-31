export interface AppEnvironment {
  production: boolean;
  useMocks: boolean;
  apiBaseUrl: string;
  appName: string;
  environmentName: string;
  cognito: {
    region: string;
    userPoolId: string;
    clientId: string;
  };
}
