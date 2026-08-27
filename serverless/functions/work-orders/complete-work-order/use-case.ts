import { CompleteWorkOrderUseCase } from '../../../packages/application/complete-work-order.use-case';
import { DynamoWorkOrderRepository } from '../../../packages/infrastructure/dynamodb/dynamo-work-order.repository';

const useCase = new CompleteWorkOrderUseCase(new DynamoWorkOrderRepository());

export function completeWorkOrder(id: string) {
  return useCase.execute(id);
}
