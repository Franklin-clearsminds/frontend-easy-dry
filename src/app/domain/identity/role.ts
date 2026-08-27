export type SystemRole =
  | 'SUPER_ADMIN'
  | 'GERENTE'
  | 'SUPERVISOR'
  | 'OPERADOR'
  | 'SERVICIOS_EXTRAS'
  | 'TECNICO'
  | 'CUSTOM';

export interface Permission {
  code: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  code: SystemRole | string;
  nombre: string;
  isSystem: boolean;
  permissions: string[];
  modules: string[];
}
