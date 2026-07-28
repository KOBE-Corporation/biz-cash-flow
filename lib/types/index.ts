export type MovementType = "IN" | "OUT" | "ADJUSTMENT";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "CANCELLED";

export type PurchaseStatus = "PENDING" | "RECEIVED" | "CANCELLED";

export type PaymentMethod = "CASH" | "MOBILE_MONEY";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RECEIVE"
  | "CANCEL"
  | "SALE"
  | "ADJUST"
  | "LOGIN"
  | "OTHER";

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Niveau de conditionnement exprime en unites de base (ex: carton = 200 paquets). */
export type PackLevelTemplate = {
  id: string;
  name: string;
  unitsOfBase: number;
};

/** Prix de vente pour un niveau de conditionnement d'un produit. */
export type ProductPackPrice = PackLevelTemplate & {
  salePrice: number;
};

export type Category = {
  id: string;
  name: string;
  description?: string;
  /** Unite de vente de base (paquet, bouteille, piece…). */
  baseUnitName: string;
  /** Niveaux de gros derives de l'unite de base. */
  packLevels: PackLevelTemplate[];
  isActive: boolean;
  createdById: string;
  createdByName: string;
  updatedById?: string;
  updatedByName?: string;
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
  createdById: string;
  createdByName: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Historique / offre d'achat par fournisseur (comparaison de prix). */
export type ProductSupplierOffer = {
  id: string;
  productId: string;
  supplierId: string;
  supplierName: string;
  /** Prix d'achat du lot achete. */
  packPurchasePrice: number;
  /** Nom du lot achete (casier, carton…). */
  purchasePackName: string;
  /** Nombre d'unites de base dans ce lot. */
  unitsPerPurchasePack: number;
  /** Cout revient par unite de base. */
  costPerBaseUnit: number;
  lastPurchaseAt: Date;
  createdById: string;
  createdByName: string;
  updatedById?: string;
  updatedByName?: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  /** Code-barres unique (scan caisse). */
  barcode: string;
  description?: string;
  /** Stock en unites de base. */
  quantity: number;
  minStock: number;
  /** Dernier cout de revient connu par unite de base. */
  purchasePrice: number;
  /** Prix de vente de l'unite de base (decide par le vendeur). */
  salePrice: number;
  baseUnitName: string;
  packLevels: ProductPackPrice[];
  isActive: boolean;
  categoryId: string;
  /** Fournisseur preferentiel optionnel. */
  supplierId?: string;
  createdById: string;
  createdByName: string;
  updatedById?: string;
  updatedByName?: string;
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
  createdById: string;
  createdByName: string;
  createdAt: Date;
};

export type PurchaseItem = {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  productSku: string;
  /** Nombre de lots achetes. */
  quantity: number;
  /** Prix unitaire du lot. */
  unitPrice: number;
  purchasePackName: string;
  unitsPerPurchasePack: number;
};

export type Purchase = {
  id: string;
  reference: string;
  supplierId?: string;
  supplierName?: string;
  status: PurchaseStatus;
  totalAmount: number;
  notes?: string;
  purchasedAt: Date;
  items: PurchaseItem[];
  createdById: string;
  createdByName: string;
  updatedById?: string;
  updatedByName?: string;
  receivedById?: string;
  receivedByName?: string;
  cancelledById?: string;
  cancelledByName?: string;
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
  /** Unites de base vendues (pour stock). */
  unitsOfBase?: number;
  packName?: string;
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

export type AuditLog = {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  userId: string;
  userName: string;
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

export type CartLine = {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
  packName?: string;
  unitsOfBase?: number;
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
