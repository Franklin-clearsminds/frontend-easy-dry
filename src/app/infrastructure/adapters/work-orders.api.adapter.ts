import { Injectable, inject } from '@angular/core';
import { WorkOrder, WorkOrderRepositoryPort } from '../../domain';
import { ApiClient } from '../http/api-client';

@Injectable({ providedIn: 'root' })
export class WorkOrdersApiAdapter implements WorkOrderRepositoryPort {
  private readonly api = inject(ApiClient);

  findById(id: number): Promise<WorkOrder | null> {
    return this.api.get<WorkOrder>(`/work-orders/${id}`);
  }

  listByBranchAndDate(branchId: string, date: string): Promise<WorkOrder[]> {
    return this.api.get<{ data: WorkOrder[] }>('/work-orders', { branchId, date }).then((r) => r.data);
  }

  create(order: WorkOrder): Promise<WorkOrder> {
    return this.api.post<WorkOrder>('/work-orders', order);
  }

  complete(id: number, version: number): Promise<WorkOrder> {
    return this.api.post<WorkOrder>(`/work-orders/${id}/complete`, { version });
  }

  approve(id: number, version: number): Promise<WorkOrder> {
    return this.api.post<WorkOrder>(`/work-orders/${id}/approve`, { version });
  }

  reject(id: number, version: number, reason: string): Promise<WorkOrder> {
    return this.api.post<WorkOrder>(`/work-orders/${id}/reject`, { version, reason });
  }
}
