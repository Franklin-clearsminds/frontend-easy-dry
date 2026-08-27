export type WorkOrderStatus = 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED';

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class WorkOrder {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public status: WorkOrderStatus,
    public readonly branchId: string,
    public readonly bayId: string,
    public readonly operatorId: string,
    public version: number
  ) {}

  complete(): void {
    if (this.status !== 'IN_PROGRESS') {
      throw new DomainError('WORK_ORDER_INVALID_TRANSITION', 'Solo se puede completar una OT en proceso.');
    }
    this.status = 'COMPLETED';
    this.version += 1;
  }

  approve(): void {
    if (this.status !== 'COMPLETED') {
      throw new DomainError('WORK_ORDER_INVALID_TRANSITION', 'Solo se puede aprobar una OT finalizada.');
    }
    this.status = 'APPROVED';
    this.version += 1;
  }

  reject(reason: string): void {
    if (!reason.trim()) {
      throw new DomainError('WORK_ORDER_REJECT_REASON_REQUIRED', 'El rechazo exige motivo.');
    }
    if (this.status !== 'COMPLETED') {
      throw new DomainError('WORK_ORDER_INVALID_TRANSITION', 'Solo se puede rechazar una OT finalizada.');
    }
    this.status = 'REJECTED';
    this.version += 1;
  }
}
