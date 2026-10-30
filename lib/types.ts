import type { RecordMetadata } from "@/components/shared/record-metadata";
import type { Currency } from "@/lib/currency";

export type LocationType = "WAREHOUSE" | "SHOWROOM" | "BIN";
export type StocktakeStatus =
  "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "CASH" | "BANK" | "CREDIT";
export type BankAccountType = "CASH" | "BANK";
export type BankTransactionType =
  "SALE" | "PURCHASE" | "ADJUSTMENT" | "CREDIT_PAYMENT" | "EXPENSE";
export type BankTransactionDirection = "in" | "out";
export type StockAdjustmentDirection = "in" | "out";
export type StockAdjustmentReason =
  "DAMAGE" | "LOSS" | "FOUND" | "COUNT" | "OPENING" | "RETURN" | "OTHER";

export type StockMovementType =
  | "SALE"
  | "SALE_VOID"
  | "SALE_REVERSAL"
  | "SALE_RETURN"
  | "PURCHASE"
  | "PURCHASE_VOID"
  | "PURCHASE_REVERSAL"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "ADJUSTMENT"
  | "PRODUCTION_ISSUE"
  | "PRODUCTION_RECEIPT"
  | "PRODUCTION_REVERSE"
  | "OPENING"
  | "IMPORT"
  | "STOCKTAKE";
export type ItemType = "RAW" | "SEMI" | "FINISHED" | "OTHER";
export type ProductionOrderStatus =
  "DRAFT" | "RELEASED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type TransferStatus =
  "PENDING" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
export type CreditStatus = "OPEN" | "PARTIAL" | "PAID";
/** How a credit balance was created. OPENING is cutover AR/AP with no sale/purchase. */
export type CreditSource = "SALE" | "PURCHASE" | "OPENING";
export type DocumentStatus = "POSTED" | "VOIDED";
export type CommissionBasis = "PROFIT" | "SALES";

export type { Currency };

export interface HealthResponse {
  status: string;
  service: string;
  currency?: Currency;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T, Totals = undefined> {
  data: T[];
  meta: PaginatedMeta;
  totals?: Totals;
}

export interface InventoryListTotals {
  quantity: string;
  inventoryValue: string;
}

export interface PurchaseListTotals {
  subtotal: string;
  total: string;
}

export interface SaleListTotals {
  subtotal: string;
  total: string;
  commission: string;
}

export interface ExpenseListTotals {
  amount: string;
}

export interface CreditListTotals {
  amount: string;
  paidAmount: string;
  balance: string;
}

export interface LinkedCredit {
  paidAmount?: string;
  status?: CreditStatus;
}

export interface Role extends RecordMetadata {
  id: string;
  name: string;
  /** Auth/login: codes only. `GET /roles` may return full `Permission` objects. */
  permissions?: string[] | Permission[];
  description?: string;
}

export interface User extends RecordMetadata {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Location extends RecordMetadata {
  id: string;
  name: string;
  type: LocationType;
  address?: string;
  isActive?: boolean;
  parentId?: string | null;
  parent?: Location | null;
}

export interface StockLot extends RecordMetadata {
  id: string;
  locationId: string;
  itemId: string;
  lotNumber: string;
  expiryDate?: string | null;
  quantity: string;
  item?: Item;
  location?: Location;
}

export interface StocktakeLine {
  id: string;
  itemId: string;
  systemQty: string;
  countedQty?: string | null;
  item?: Item;
}

export interface Stocktake extends RecordMetadata {
  id: string;
  locationId: string;
  status: StocktakeStatus;
  notes?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  location?: Location;
  createdBy?: { id: string; fullName: string };
  lines?: StocktakeLine[];
}

export interface UnitOfMeasure extends RecordMetadata {
  id: string;
  code: string;
  name: string;
  symbol: string;
  category: "COUNT" | "LENGTH" | "AREA" | "VOLUME" | "MASS" | "TIME" | "OTHER";
  uneceCode?: string | null;
  decimalPlaces: number;
  isActive: boolean;
  requiresReview: boolean;
}
export interface Item extends RecordMetadata {
  unitGroupId?: string | null;
  unitGroup?: UnitGroup | null;
  unitConversions?: ItemConversion[];
  unitId?: string;
  stockUnit?: UnitOfMeasure;
  id: string;
  sku?: string | null;
  barcode?: string | null;
  description: string;
  unit?: string | null;
  itemType?: ItemType | null;
  /** Phantom / non-stocked: BOM pass-through by default */
  isPhantom?: boolean;
  /** Relative path from API, e.g. `/uploads/items/...` */
  imagePath?: string | null;
  /** Absolute or relative image URL for display */
  imageUrl?: string | null;
}

export interface StockRecord extends RecordMetadata {
  id: string;
  locationId: string;
  itemId: string;
  quantity: string;
  /** Committed qty still on-hand; available ≈ quantity − reserved. */
  reserved?: string;
  available?: string;
  purchasePrice: string;
  reorderPoint?: string | null;
  item: Item;
  location: Location;
}

export type LowStockStatus = "LOW_STOCK" | "OUT_OF_STOCK";

export interface LowStockRecord extends StockRecord {
  status: LowStockStatus;
  shortage: string;
}

export interface StockAdjustment extends RecordMetadata {
  id: string;
  locationId: string;
  itemId: string;
  direction: StockAdjustmentDirection;
  quantity: string;
  quantityBefore: string;
  quantityAfter: string;
  reason: StockAdjustmentReason | string;
  notes?: string | null;
  reference?: string | null;
  purchasePrice?: string | null;
  createdById?: string;
  createdBy?: { id: string; fullName?: string; email?: string };
  item?: Item;
  location?: Location;
  createdAt?: string;
}

/** Immutable stock ledger row (every qty change). */
export interface StockMovement extends RecordMetadata {
  id: string;
  locationId: string;
  itemId: string;
  type: StockMovementType | string;
  quantityDelta: string;
  quantityBefore: string;
  quantityAfter: string;
  unitCost?: string | null;
  refType?: string | null;
  refId?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: { id: string; fullName?: string; email?: string };
  item?: Item;
  location?: Location;
  createdAt?: string;
}

export interface Supplier extends RecordMetadata {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

export interface Customer extends RecordMetadata {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

export interface BankAccount extends RecordMetadata {
  id: string;
  name: string;
  balance: string;
  accountType?: BankAccountType;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  isActive?: boolean;
}

export interface BankLiquidity {
  accounts: BankAccount[];
  totals: {
    cashTotal: string;
    bankTotal: string;
    totalLiquidity: string;
  };
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  type: BankTransactionType | string;
  /** Money into (`in`) or out of (`out`) the account. Amount is always positive. */
  direction: BankTransactionDirection;
  amount: string;
  balanceAfter?: string;
  description?: string;
  refType?: string;
  refId?: string;
  createdById?: string;
  bankAccount?: BankAccount;
  createdAt?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense extends RecordMetadata {
  id: string;
  categoryId: string;
  bankAccountId: string;
  amount: string;
  description?: string;
  expenseDate: string;
  category?: ExpenseCategory;
}

export interface CreditRecord {
  id: string;
  customerId?: string;
  supplierId?: string;
  saleId?: string;
  purchaseId?: string;
  source?: CreditSource;
  /** Prior-system invoice / document number (opening credits). */
  reference?: string | null;
  notes?: string | null;
  amount: string;
  paidAmount: string;
  balance?: string;
  status: CreditStatus;
  dueDate?: string;
  customer?: Customer;
  supplier?: Supplier;
  sale?: Pick<
    Sale,
    | "id"
    | "total"
    | "subtotal"
    | "totalAmount"
    | "createdAt"
    | "paymentMethod"
    | "status"
  >;
  purchase?: Pick<
    Purchase,
    | "id"
    | "total"
    | "subtotal"
    | "totalAmount"
    | "createdAt"
    | "paymentMethod"
    | "status"
  >;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardData {
  totalInventoryValue: string;
  stockValueByLocation: {
    locationId: string;
    locationName: string;
    value: string;
  }[];
  showroomCount: number;
  dailySales: string;
  dailyPurchases: string;
  profitAndLoss: {
    revenue: string;
    costOfGoodsSold: string;
    grossProfit: string;
    totalExpenses: string;
    netProfit: string;
  };
  financialOverview: {
    cashTotal?: string;
    bankTotal?: string;
    totalLiquidity?: string;
    totalBankBalance: string;
    bankAccounts: {
      id: string;
      name: string;
      balance: string;
      accountType?: BankAccountType;
      bankName?: string | null;
    }[];
  };
  currency?: Currency;
}

export interface ProfitLossItem {
  itemId: string;
  description: string;
  quantitySold: string;
  revenue: string;
  cost: string;
  profit: string;
  marginPercent: string;
}

export interface Permission {
  id: string;
  code: string;
  description?: string;
}

export interface PurchaseLine {
  unitSnapshot?: UnitSnapshot | null;
  id?: string;
  itemId: string;
  quantity: string;
  unitPrice: string;
  lineTotal?: string;
  amount?: string;
  item?: Item;
}

export interface Purchase extends RecordMetadata {
  id: string;
  supplierId?: string;
  locationId?: string;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  notes?: string;
  creditDueDate?: string;
  status?: DocumentStatus;
  subtotal?: string;
  total?: string;
  /** @deprecated Prefer `total` */
  totalAmount?: string;
  createdAt?: string;
  updatedAt?: string;
  supplier?: Supplier;
  location?: Location;
  bankAccount?: BankAccount;
  supplierCredit?: LinkedCredit;
  lines?: PurchaseLine[];
}

export interface SaleLine {
  unitSnapshot?: UnitSnapshot | null;
  id?: string;
  itemId: string;
  quantity: string;
  unitPrice: string;
  lineTotal?: string;
  amount?: string;
  item?: Item;
}

export interface SaleUserRef {
  id: string;
  fullName: string;
  email?: string;
}

export interface Sale extends RecordMetadata {
  id: string;
  customerId?: string;
  inquiryId?: string | null;
  productionOrderId?: string | null;
  locationId?: string;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  notes?: string;
  creditDueDate?: string;
  status?: DocumentStatus;
  subtotal?: string;
  total?: string;
  /** @deprecated Prefer `total` */
  totalAmount?: string;
  soldByUserId?: string;
  commissionPercent?: string | number;
  commissionBasis?: CommissionBasis;
  commissionAmount?: string;
  soldByUser?: SaleUserRef;
  /** @deprecated Prefer `soldByUser` */
  soldBy?: SaleUserRef;
  createdBy?: SaleUserRef;
  createdAt?: string;
  updatedAt?: string;
  customer?: Customer;
  location?: Location;
  bankAccount?: BankAccount;
  customerCredit?: LinkedCredit;
  lines?: SaleLine[];
}

export interface SalesCommissionSummaryRow {
  soldByUserId: string;
  soldByUserName?: string;
  soldByUser?: SaleUserRef;
  /** @deprecated Prefer `soldByUserName` / `totalSubtotal` */
  soldBy?: SaleUserRef;
  saleCount: number;
  totalSubtotal?: string;
  /** @deprecated Prefer `totalSubtotal` */
  totalSales?: string;
  totalCommission: string;
}

export interface ReportPeriod {
  from?: string;
  to?: string;
}

export interface ReportsSummary {
  currency?: Currency;
  totalRevenue: string;
  totalPurchases?: string;
  /** @deprecated Use totalPurchases */
  totalCost?: string;
  totalExpenses: string;
  grossProfit: string;
  netProfit: string;
  marginPercent: string;
  period?: ReportPeriod;
}

export interface ReportPaymentMethodRow {
  paymentMethod: PaymentMethod;
  count: number;
  total: string;
}

export interface ReportLocationBreakdownRow {
  locationId: string;
  locationName: string;
  count: number;
  total: string;
}

export interface ReportSales {
  currency?: Currency;
  period?: ReportPeriod;
  totals: {
    count: number;
    subtotal: string;
    total: string;
    commission: string;
  };
  byPaymentMethod: ReportPaymentMethodRow[];
  byLocation: ReportLocationBreakdownRow[];
}

export interface ReportPurchases {
  currency?: Currency;
  period?: ReportPeriod;
  totals: { count: number; total: string };
  byPaymentMethod: ReportPaymentMethodRow[];
  byLocation: ReportLocationBreakdownRow[];
}

export interface ReportExpenseCategoryRow {
  categoryId: string;
  categoryName: string;
  count: number;
  total: string;
}

export interface ReportExpenses {
  currency?: Currency;
  period?: ReportPeriod;
  totals: { count: number; total: string };
  byCategory: ReportExpenseCategoryRow[];
}

export interface ReportPurchasesByItemRow {
  itemId: string;
  sku?: string;
  description: string;
  quantityPurchased: string;
  total?: string;
  /** @deprecated Prefer `total` */
  totalSpend?: string;
}

export interface ReportPurchasesByItem {
  currency?: Currency;
  period?: { from?: string | null; to?: string | null };
  items: ReportPurchasesByItemRow[];
}

export interface ReportCommissionRow {
  soldByUserId: string;
  soldByUserName: string;
  saleCount: number;
  totalSubtotal?: string;
  totalCommission: string;
}

export interface ReportCommissions {
  currency?: Currency;
  period?: { from?: string | null; to?: string | null };
  totalCommission: string;
  reps: ReportCommissionRow[];
}

export interface ReportCreditByCustomerRow {
  customerId: string;
  customerName: string;
  creditCount: number;
  outstanding: string;
}

export interface ReportCreditBySupplierRow {
  supplierId: string;
  supplierName: string;
  creditCount: number;
  outstanding: string;
}

export interface ReportCreditPartySummary {
  totalOutstanding: string;
  creditCount: number;
  byCustomer?: ReportCreditByCustomerRow[];
  bySupplier?: ReportCreditBySupplierRow[];
}

export interface ReportCredits {
  currency?: Currency;
  customers?: ReportCreditPartySummary;
  suppliers?: ReportCreditPartySummary;
  /** @deprecated Prefer `customers` */
  customerReceivables?: {
    count: number;
    total: string;
    outstanding: string;
  };
  /** @deprecated Prefer `suppliers` */
  supplierPayables?: {
    count: number;
    total: string;
    outstanding: string;
  };
}

export interface ReportSalesByItemRow {
  itemId: string;
  sku?: string;
  description: string;
  itemDescription?: string;
  quantitySold: string;
  revenue: string;
  cost: string;
  profit: string;
  marginPercent: string;
}

export interface ReportSalesByItem {
  currency?: Currency;
  period?: { from?: string | null; to?: string | null };
  items: ReportSalesByItemRow[];
}

export interface ReportInventoryAgingRow {
  itemId: string;
  locationId?: string;
  sku?: string;
  description?: string;
  itemDescription?: string;
  locationName?: string;
  quantity: string;
  purchasePrice?: string;
  inventoryValue?: string;
  value?: string;
  lastPurchaseDate?: string;
  lastUpdated?: string;
  ageDays?: number | string;
}

export interface ReportInventoryAging {
  currency?: Currency;
  totalInventoryValue: string;
  items: ReportInventoryAgingRow[];
}

export interface ReportCustomerActivityRow {
  customerId: string;
  customerName?: string;
  name?: string;
  phone?: string;
  saleCount?: number;
  salesCount?: number;
  totalSpend?: string;
  totalSpent?: string;
  paidAmount?: string;
  creditAmount?: string;
  outstandingAmount?: string;
}

export interface ReportCustomerActivity {
  currency?: Currency;
  period?: { from?: string | null; to?: string | null };
  customers: ReportCustomerActivityRow[];
}

export interface ReportSupplierActivityRow {
  supplierId: string;
  supplierName?: string;
  name?: string;
  phone?: string;
  purchaseCount: number;
  totalPurchased: string;
  paidAmount?: string;
  creditAmount?: string;
  outstandingAmount?: string;
}

export interface ReportSupplierActivity {
  currency?: Currency;
  period?: { from?: string | null; to?: string | null };
  suppliers: ReportSupplierActivityRow[];
}

export interface ReportCashFlowRow {
  date: string;
  cashIn?: string;
  cashOut?: string;
  netMovement?: string;
  inflow?: string;
  outflow?: string;
  net?: string;
}

export interface ReportCashFlow {
  period?: ReportPeriod;
  dailyBalances: ReportCashFlowRow[];
}

export interface StockTransferLine {
  unitSnapshot?: UnitSnapshot | null;
  id?: string;
  itemId: string;
  quantity: string;
  item?: Item;
}

export interface StockTransfer extends RecordMetadata {
  id: string;
  status: TransferStatus;
  fromLocationId?: string;
  toLocationId?: string;
  notes?: string;
  createdAt?: string;
  fromLocation?: Location;
  toLocation?: Location;
  lines?: StockTransferLine[];
}

export interface BomLine {
  unitSnapshot?: UnitSnapshot | null;
  id?: string;
  componentItemId: string;
  quantity: string | number;
  scrapPercent?: string | number | null;
  /** Pass-through: explode child BOM instead of issuing this component */
  isPhantom?: boolean;
  componentItem?: Item;
}

export interface Bom extends RecordMetadata {
  id: string;
  finishedItemId: string;
  name: string;
  version?: string | null;
  notes?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  yieldPercent?: string | number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  revisedFromId?: string | null;
  finishedItem?: Item;
  lines?: BomLine[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BomExplodeResult {
  bomId: string;
  finishedItemId: string;
  quantity: number;
  yieldPercent: number;
  lines: {
    componentItemId: string;
    quantity: number;
    depth: number;
    componentItem?: Item;
  }[];
}

export interface BomCostRollup {
  bomId: string;
  quantity: number;
  yieldPercent: number;
  expectedFinishedQty: number;
  materialCost: number;
  unitFinishedCost: number;
  lines: {
    componentItemId: string;
    quantity: number;
    unitCost: number;
    extendedCost: number;
    componentItem?: Item;
  }[];
}

export interface ProductionOrderLine {
  id?: string;
  componentItemId: string;
  quantityRequired?: string;
  quantityIssued?: string;
  issuedValue?: string;
  scrapPercent?: string | null;
  componentItem?: Item;
}

/** BOM material list vs stock (GET /production-orders/:id/material-requirements). */
export interface MaterialRequirementLine {
  componentItemId: string;
  sku?: string | null;
  description?: string | null;
  quantityRequired: string;
  quantityIssued: string;
  quantityRemaining: string;
  onHand: string;
  available: string;
  reservedForOrder: string;
  shortage: string;
}

export interface MaterialRequirements {
  productionOrderId: string;
  orderNumber?: string | null;
  locationId: string;
  locationName?: string | null;
  status: ProductionOrderStatus;
  materialsReserved: boolean;
  hasShortages: boolean;
  lines: MaterialRequirementLine[];
}

export interface ProductionOrder extends RecordMetadata {
  unitSnapshot?: UnitSnapshot | null;
  id: string;
  orderNumber?: string | null;
  bomId: string;
  locationId: string;
  finishedLocationId?: string | null;
  finishedItemId?: string;
  inquiryId?: string | null;
  saleId?: string | null;
  quantityPlanned: string;
  quantityCompleted?: string;
  quantityScrapped?: string;
  materialsReserved?: boolean;
  status: ProductionOrderStatus;
  notes?: string | null;
  bom?: Bom;
  location?: Location;
  finishedLocation?: Location | null;
  finishedItem?: Item;
  inquiry?: Inquiry | null;
  sale?: Sale | null;
  lines?: ProductionOrderLine[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserAdmin extends RecordMetadata {
  id: string;
  email: string;
  fullName: string;
  roleId?: string;
  role?: Role;
  isActive?: boolean;
  /** Empty = all locations. */
  locationIds?: string[];
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export type NotificationType =
  | "LOW_STOCK"
  | "STOCK_TRANSFER"
  | "SALE"
  | "PURCHASE"
  | "CREDIT_DUE"
  | "EXPENSE"
  | "SYSTEM"
  | "INQUIRY";

export interface Notification extends RecordMetadata {
  id: string;
  userId: string;
  module: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationUnreadCount {
  count: number;
}

export interface InternalMessageUser {
  id: string;
  fullName: string;
  email: string;
}

export interface InternalMessage {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  isRead: boolean;
  readAt?: string | null;
  sender?: InternalMessageUser;
  recipient?: InternalMessageUser;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageUnreadCount {
  count: number;
}

export type InquiryStatus =
  "NEW" | "IN_PROGRESS" | "QUOTED" | "CONVERTED" | "CLOSED" | "CANCELLED";

export type InquirySource = "PUBLIC" | "INTERNAL";

export type InquiryPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

/** CRM assignment ownership — assign → PENDING → Accept/Decline */
export type InquiryAssignmentStatus =
  "UNASSIGNED" | "PENDING" | "ACCEPTED" | "DECLINED";

export interface InquiryLine {
  unitSnapshot?: UnitSnapshot | null;
  id?: string;
  itemId: string;
  quantity?: string | null;
  notes?: string | null;
  item?: Item | null;
}

export interface InquiryLineInput {
  unitId?: string;
  dimensions?: AreaDimensions;
  itemId: string;
  quantity?: number;
  notes?: string;
}

export interface InquiryAttachment {
  id: string;
  inquiryId: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
}
export interface Inquiry extends RecordMetadata {
  hasProduction?: boolean;
  productionOrders?: Pick<
    ProductionOrder,
    | "id"
    | "orderNumber"
    | "status"
    | "finishedItemId"
    | "quantityPlanned"
    | "createdAt"
  >[];
  requestedDeliveryDate?: string | null;
  attachments?: InquiryAttachment[];
  id: string;
  contactName: string;
  phone?: string | null;
  email?: string | null;
  subject: string;
  message: string;
  status: InquiryStatus;
  priority: InquiryPriority;
  source: InquirySource;
  customerId?: string | null;
  /** @deprecated Prefer `lines`; may still appear on older payloads */
  itemId?: string | null;
  assignedToUserId?: string | null;
  assignmentStatus?: InquiryAssignmentStatus;
  assignedAt?: string | null;
  acceptedAt?: string | null;
  createdById?: string | null;
  internalNotes?: string | null;
  followUpAt?: string | null;
  convertedSaleId?: string | null;
  /** Set when linked production completes — FG ready to sell. */
  readyForSaleAt?: string | null;
  customer?: Customer | null;
  /** @deprecated Prefer `lines` */
  item?: Item | null;
  lines?: InquiryLine[];
  assignedTo?: UserAdmin | null;
  createdBy?: UserAdmin | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInquiryBody {
  requestedDeliveryDate?: string;
  contactName?: string;
  subject?: string;
  message: string;
  phone?: string;
  email?: string;
  lines?: InquiryLineInput[];
  /** @deprecated Prefer `lines` */
  itemId?: string;
  priority?: InquiryPriority;
  customerId?: string;
  assignedToUserId?: string;
  internalNotes?: string;
  followUpAt?: string;
}

export interface UpdateInquiryBody {
  requestedDeliveryDate?: string | null;
  contactName?: string;
  phone?: string | null;
  email?: string | null;
  subject?: string;
  message?: string;
  status?: InquiryStatus;
  priority?: InquiryPriority;
  customerId?: string | null;
  lines?: InquiryLineInput[];
  /** @deprecated Prefer `lines` */
  itemId?: string | null;
  assignedToUserId?: string | null;
  internalNotes?: string | null;
  followUpAt?: string | null;
  convertedSaleId?: string | null;
}

/** Public + admin branding / site appearance settings */
export interface BrandingSettings {
  appName: string;
  /** Absolute URL or path to the hero image; null = use frontend default */
  heroImageUrl?: string | null;
  headline?: string | null;
  supportingText?: string | null;
  updatedAt?: string;
}

export interface UpdateBrandingBody {
  appName?: string;
  headline?: string | null;
  supportingText?: string | null;
}

export interface ItemConversion {
  stockQuantity?: string;
  unitQuantity?: string;
  unitId: string;
  factor: string;
  purchaseDefault?: boolean;
  salesDefault?: boolean;
}
export interface AreaDimensions {
  widthMetres: number;
  lengthMetres: number;
  count: number;
}
export interface UnitSnapshot {
  category?: UnitOfMeasure["category"];
  squareMetreFactor?: string;
  dimensions?: AreaDimensions;
  unitId: string;
  code: string;
  symbol: string;
  decimalPlaces?: number;
  factor: string;
  quantity: string;
  unitPrice?: string;
}
export interface ItemUnitOptions {
  unitGroup?: UnitGroup | null;
  canChangeBaseUnit?: boolean;
  baseUnitLockReason?: string | null;
  baseUnit: UnitOfMeasure;
  conversions: ItemConversion[];
  options: {
    unit: UnitOfMeasure;
    factor: string;
    purchaseDefault: boolean;
    salesDefault: boolean;
    isStandard?: boolean;
  }[];
}

export interface UnitGroup {
  id: string;
  name: string;
  category: UnitOfMeasure["category"];
  baseUnitId: string;
  baseUnit: UnitOfMeasure;
  conversions: ItemConversion[];
  isActive: boolean;
}
