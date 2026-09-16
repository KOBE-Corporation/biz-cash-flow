export type MovementType = "IN" | "OUT" | "ADJUSTMENT";

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";

export type PurchaseStatus = "PENDING" | "RECEIVED" | "CANCELLED";

export type PaymentMethod = "CASH" | "MOBILE_MONEY" | "CREDIT";

export type CashDirection = "IN" | "OUT";

export type CashSourceType =
  | "SALE"
  | "PURCHASE"
  | "REFUND"
  | "MANUAL"
  | "ADJUSTMENT";

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

/**
 * Politique de suivi par categorie (flexible : chaque famille active
 * ce dont elle a besoin — peremption, fabrication, lot, serie…).
 */
export type CategoryTracking = {
  /** Suivre la date de fabrication sur les produits / receptions. */
  tracksManufacturedAt: boolean;
  /** Suivre la date de peremption. */
  tracksExpiry: boolean;
  /** Suivre un numero de lot / batch. */
  tracksBatchNumber: boolean;
  /** Suivre un numero de serie (ex. smartphones). */
  tracksSerialNumber: boolean;
  /** Alerte « bientot » : J jours avant peremption. */
  expiryAlertDays: number;
  /** Alerte critique : J jours avant peremption. */
  expiryCriticalDays: number;
  /** Duree de vie par defaut (jours) — suggere expiresAt = fabricated + shelf. */
  defaultShelfLifeDays?: number;
  /** Remise suggeree (%) pour ecouler avant perte. */
  suggestedNearExpiryDiscountPercent?: number;
};

export type ExpiryStatus = "none" | "ok" | "soon" | "critical" | "expired";

export type Category = {
  id: string;
  name: string;
  description?: string;
  /** Unite de vente de base (paquet, bouteille, piece…). */
  baseUnitName: string;
  /** Niveaux de gros derives de l'unite de base. */
  packLevels: PackLevelTemplate[];
  tracking: CategoryTracking;
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
  /** Lot courant (MVP) — dates / refs selon politique categorie. */
  manufacturedAt?: Date;
  expiresAt?: Date;
  batchNumber?: string;
  serialNumber?: string;
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
  manufacturedAt?: Date;
  expiresAt?: Date;
  batchNumber?: string;
  serialNumber?: string;
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

export type CreditNoteItem = {
  id: string;
  productId?: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  unitsOfBase?: number;
  packName?: string;
};

/** Avoir / note de credit liee a une facture. */
export type CreditNote = {
  id: string;
  number: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  reason: string;
  items: CreditNoteItem[];
  createdAt: Date;
  createdById: string;
  createdByName: string;
};

export type Invoice = {
  id: string;
  number: string;
  customerName: string;
  /** Telephone pour relance WhatsApp (optionnel). */
  customerPhone?: string;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  /** Montant deja encaisse (0 si a credit). */
  amountPaid: number;
  /** Cumul des notes de credit. */
  creditedAmount: number;
  amountReceived?: number;
  changeDue?: number;
  notes?: string;
  issuedAt: Date;
  issuedById: string;
  issuedByName: string;
  lastReminderAt?: Date;
  cancelledAt?: Date;
  cancelledById?: string;
  cancelledByName?: string;
  cancelReason?: string;
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

/** Ligne du journal de caisse (entree ou sortie d'argent). */
export type CashLedgerEntry = {
  id: string;
  direction: CashDirection;
  amount: number;
  paymentMethod?: PaymentMethod;
  label: string;
  description?: string;
  reference?: string;
  sourceType: CashSourceType;
  sourceId?: string;
  occurredAt: Date;
  createdById: string;
  createdByName: string;
  createdAt: Date;
};

export type DashboardStats = {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  stockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  /** CA encaissé aujourd'hui (factures payees du jour). */
  todaySalesTotal: number;
  todaySalesCount: number;
  /** Solde caisse du jour (entrees − sorties). */
  todayNetCash: number;
  /** Factures avec solde restant. */
  unpaidCount: number;
  unpaidTotal: number;
  /** Alertes peremption. */
  expiryAlertCount: number;
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
