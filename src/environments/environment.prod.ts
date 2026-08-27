export const environment = {
  production: true,
  appEnv: 'production' as const,
  apiBaseUrl: 'https://api.easydry.example/api/v1',
  cognito: {
    region: 'us-east-1',
    userPoolId: '',
    clientId: ''
  }
};
