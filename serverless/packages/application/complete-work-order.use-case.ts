import { WorkOrder } from '../domain/work-order';

export interface WorkOrderRepository {
  findById(id: string): Promise<WorkOrder | null>;
  save(order: WorkOrder): Promise<void>;
}

export class CompleteWorkOrderUseCase {
  constructor(private readonly repository: WorkOrderRepository) {}

  async execute(id: string): Promise<WorkOrder> {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new Error('WORK_ORDER_NOT_FOUND');
    }
    order.complete();
    await this.repository.save(order);
    return order;
  }
}
