export const environment = {
  production: false,
  appEnv: 'qa' as const,
  apiBaseUrl: 'https://qa-api.easydry.example/api/v1',
  cognito: {
    region: 'us-east-1',
    userPoolId: '',
    clientId: ''
  }
};
