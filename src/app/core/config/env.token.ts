import { environment } from '../../../environments/environment';

export interface AppEnvironment {
  apiBaseUrl: string;
  cognitoRegion: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  appEnv: 'development' | 'qa' | 'production';
}

export const APP_ENVIRONMENT: AppEnvironment = {
  apiBaseUrl: environment.apiBaseUrl,
  cognitoRegion: environment.cognito.region,
  cognitoUserPoolId: environment.cognito.userPoolId,
  cognitoClientId: environment.cognito.clientId,
  appEnv: environment.appEnv
};
