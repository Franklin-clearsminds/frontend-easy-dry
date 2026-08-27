/**
 * CDK adapter de infraestructura. No contiene reglas de negocio.
 * Despliegue: AWS CodePipeline (no GitHub Actions, no Terraform, no Amplify).
 */
export class EasyDryApiStack {
  readonly description = 'API Gateway + Lambda por contexto + DynamoDB + Cognito + S3';
}
