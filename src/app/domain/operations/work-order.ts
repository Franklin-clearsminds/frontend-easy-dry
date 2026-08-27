export type WorkOrderStatus = 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED';

export type VehicleCategory = 'SEDAN' | 'SUV' | 'PICKUP' | 'HATCHBACK' | 'MOTORCYCLE';

export interface VehicleSnapshot {
  plate: string;
  brand: string;
  model: string;
  color: string;
  category: VehicleCategory;
}

export interface WorkOrderSupplyLine {
  productId: string;
  quantity: number;
}

export interface WorkOrder {
  id: string;
  code: string;
  status: WorkOrderStatus;
  branchId: string;
  bayId: string;
  operatorId: string;
  catalogServiceId: string;
  vehicle: VehicleSnapshot;
  supplies: WorkOrderSupplyLine[];
  evidenceInKey?: string;
  evidenceOutKey?: string;
  version: number;
  createdAt: string;
  completedAt?: string;
}
