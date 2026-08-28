import {
  Sucursal,
  Bahia,
  VehiculoServicio,
  CatalogoServicio,
  ProductoInsumo,
  StockSucursal,
  Maquinaria,
  Incidente,
  Usuario
} from '../models';

export type WorkOrder = VehiculoServicio;
export type Branch = Sucursal;
export type Bay = Bahia;
export type CatalogService = CatalogoServicio;
export type Product = ProductoInsumo;
export type StockPosition = StockSucursal;
export type Machine = Maquinaria;
export type Incident = Incidente;
export type User = Usuario;

export interface UserRepositoryPort {
  findById(id: number): Promise<User | null>;
}

export interface BranchRepositoryPort {
  list(): Promise<Branch[]>;
  findById(id: number): Promise<Branch | null>;
  listBays(branchId: number): Promise<Bay[]>;
}

export interface WorkOrderRepositoryPort {
  findById(id: number): Promise<WorkOrder | null>;
  listByBranchAndDate(branchId: string, date: string): Promise<WorkOrder[]>;
  create(order: WorkOrder): Promise<WorkOrder>;
  complete(id: number, version: number): Promise<WorkOrder>;
  approve(id: number, version: number): Promise<WorkOrder>;
  reject(id: number, version: number, reason: string): Promise<WorkOrder>;
}

export interface CatalogServiceRepositoryPort {
  list(): Promise<CatalogService[]>;
}

export interface InventoryRepositoryPort {
  listProducts(): Promise<Product[]>;
}

export interface MachineRepositoryPort {
  listByBranch(branchId: string): Promise<Machine[]>;
}

export interface IncidentRepositoryPort {
  listOpen(): Promise<Incident[]>;
}

export interface FileStoragePort {
  presignUpload(purpose: string, contentType: string): Promise<{ uploadUrl: string; objectKey: string }>;
}
