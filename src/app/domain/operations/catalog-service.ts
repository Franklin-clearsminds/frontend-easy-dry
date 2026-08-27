export type ServiceCategory = 'GENERAL' | 'SPECIAL' | 'EXTRA';

export interface CatalogService {
  id: string;
  codigo: string;
  nombre: string;
  category: ServiceCategory;
  requiresPhoto: boolean;
  requiresVideo: boolean;
  active: boolean;
}
