import { WorkOrder } from '../../packages/domain/work-order';
import { WorkOrderRepository } from '../../packages/application/complete-work-order.use-case';

export class DynamoWorkOrderRepository implements WorkOrderRepository {
  async findById(_id: string): Promise<WorkOrder | null> {
    return null;
  }

  async save(_order: WorkOrder): Promise<void> {
    return;
  }
}
