import { User } from '../identity/user';
import { Role } from '../identity/role';
import { Branch, Bay } from '../operations/branch';
import { WorkOrder } from '../operations/work-order';
import { CatalogService } from '../operations/catalog-service';
import { Product, StockPosition } from '../inventory/product';
import { Machine, Incident } from '../maintenance/machine';
import { MetricSnapshot } from '../reporting/metric';

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByCognitoSub(sub: string): Promise<User | null>;
}

export interface RoleRepositoryPort {
  findById(id: string): Promise<Role | null>;
}

export interface BranchRepositoryPort {
  list(): Promise<Branch[]>;
  findById(id: string): Promise<Branch | null>;
  listBays(branchId: string): Promise<Bay[]>;
}

export interface WorkOrderRepositoryPort {
  findById(id: string): Promise<WorkOrder | null>;
  listByBranchAndDate(branchId: string, date: string): Promise<WorkOrder[]>;
  create(order: WorkOrder): Promise<WorkOrder>;
  complete(id: string, version: number): Promise<WorkOrder>;
  approve(id: string, version: number): Promise<WorkOrder>;
  reject(id: string, version: number, reason: string): Promise<WorkOrder>;
}

export interface CatalogServiceRepositoryPort {
  list(): Promise<CatalogService[]>;
}

export interface InventoryRepositoryPort {
  listProducts(): Promise<Product[]>;
  getStock(productId: string, location: string): Promise<StockPosition | null>;
}

export interface MachineRepositoryPort {
  listByBranch(branchId: string): Promise<Machine[]>;
}

export interface IncidentRepositoryPort {
  listOpen(): Promise<Incident[]>;
}

export interface ReportingRepositoryPort {
  getDailyMetrics(branchId: string, date: string): Promise<MetricSnapshot | null>;
}

export interface FileStoragePort {
  presignUpload(purpose: string, contentType: string): Promise<{ uploadUrl: string; objectKey: string }>;
}
