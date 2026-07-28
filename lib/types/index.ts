export type MovementType = "IN" | "OUT" | "ADJUSTMENT";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "CANCELLED";

export type PurchaseStatus = "PENDING" | "RECEIVED" | "CANCELLED";

export type PaymentMethod = "CASH" | "MOBILE_MONEY";

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Category = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Supplier = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  description?: string;
  quantity: number;
  minStock: number;
  purchasePrice: number;
  salePrice: number;
  isActive: boolean;
  categoryId: string;
  supplierId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type StockMovement = {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  unitPrice?: number;
  reference?: string;
  notes?: string;
  createdById?: string;
  createdAt: Date;
};

export type PurchaseItem = {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
};

export type Purchase = {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseStatus;
  totalAmount: number;
  notes?: string;
  purchasedAt: Date;
  items: PurchaseItem[];
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceItem = {
  id: string;
  invoiceId: string;
  productId?: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
};

export type Invoice = {
  id: string;
  number: string;
  customerName: string;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountReceived?: number;
  changeDue?: number;
  notes?: string;
  issuedAt: Date;
  issuedById: string;
  issuedByName: string;
  items: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
};

export type DashboardStats = {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  stockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
};

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

export type RepoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
