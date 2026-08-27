import { completeWorkOrder } from './use-case';
import { validateWorkOrderId } from './validator';

export class CompleteWorkOrderController {
  async handle(id: string): Promise<{ statusCode: number; body: string }> {
    const error = validateWorkOrderId(id);
    if (error) {
      return { statusCode: 400, body: JSON.stringify({ error }) };
    }
    const result = await completeWorkOrder(id);
    return { statusCode: 200, body: JSON.stringify(result) };
  }
}
