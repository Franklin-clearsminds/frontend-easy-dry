export interface Product {
  id: string;
  sku: string;
  nombre: string;
  unit: string;
  reorderPointWarehouse: number;
  reorderPointBranch: number;
  active: boolean;
}

export interface StockPosition {
  productId: string;
  location: 'CENTRAL_WAREHOUSE' | string;
  quantity: number;
}
