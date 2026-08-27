export const environment = {
  production: false,
  appEnv: 'development' as const,
  apiBaseUrl: 'https://dev-api.easydry.example/api/v1',
  cognito: {
    region: 'us-east-1',
    userPoolId: '',
    clientId: ''
  }
};
