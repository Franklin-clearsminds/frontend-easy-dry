import { CompleteWorkOrderController } from './controller';

export const handler = async (event: { pathParameters?: { id?: string } }) => {
  const controller = new CompleteWorkOrderController();
  return controller.handle(event.pathParameters?.id ?? '');
};
