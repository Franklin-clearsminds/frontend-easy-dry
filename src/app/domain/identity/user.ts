export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface User {
  id: string;
  cognitoSub: string;
  email: string;
  nombre: string;
  apellido: string;
  roleId: string;
  branchId?: string;
  bayId?: string;
  status: UserStatus;
}
