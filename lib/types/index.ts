export type MovementType = "IN" | "OUT" | "ADJUSTMENT";

export type Product = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
  purchasePrice: number;
  salePrice: number;
  categoryId: string;
  supplierId?: string;
};

export type StockMovement = {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  reference?: string;
  createdAt: Date;
};

export type DashboardStats = {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  stockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "CANCELLED";

export type PurchaseStatus = "PENDING" | "RECEIVED" | "CANCELLED";

export type PaymentMethod = "CASH" | "MOBILE_MONEY";

export type CartLine = {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
};

export type SaleDraft = {
  lines: CartLine[];
  paymentMethod: PaymentMethod;
  note?: string;
  discount: number;
};
