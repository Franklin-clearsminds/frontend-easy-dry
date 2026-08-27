export type MachineStatus =
  | 'OPERATIONAL'
  | 'NEEDS_MAINTENANCE'
  | 'IN_REPAIR'
  | 'OUT_OF_SERVICE';

export interface Machine {
  id: string;
  codigo: string;
  serial: string;
  nombre: string;
  branchId: string;
  bayId?: string;
  status: MachineStatus;
  hours: number;
}

export type IncidentPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'OPEN' | 'IN_REVIEW' | 'IN_PROGRESS' | 'RESOLVED';

export interface Incident {
  id: string;
  machineId: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  description: string;
}
