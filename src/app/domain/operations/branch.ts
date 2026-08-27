export type BranchStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
export type BayStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';

export interface Branch {
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  status: BranchStatus;
  managerUserId?: string;
}

export interface Bay {
  id: string;
  branchId: string;
  codigo: string;
  nombre: string;
  status: BayStatus;
  operatorId?: string;
}
