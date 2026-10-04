/**
 * Servin Coffee & Kitchen - Core Data Models
 */

export type UserRole = 'customer' | 'cashier' | 'kitchen' | 'owner' | 'admin';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  lastLogin?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  order: number;
}

export type UnitType = 'g' | 'ml' | 'pcs' | 'slice';

export interface Ingredient {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: UnitType;
  costPerUnit: number; // in IDR (Rp)
  status: 'normal' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number; // quantity in ingredient's unit
}

export interface MenuItemCustomizationOptions {
  sizes?: { name: string; priceDelta: number }[];
  sugarLevels?: string[];
  iceLevels?: string[];
  toppings?: { name: string; price: number }[];
  spicyLevels?: string[];
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  price: number; // Selling price in IDR
  costPrice?: number; // Base cost or calculated BOM cost in IDR
  image: string;
  description: string;
  isAvailable: boolean;
  isActive: boolean;
  recipe: RecipeItem[];
  customizations?: MenuItemCustomizationOptions;
}

export interface OrderItemCustomization {
  size?: string;
  sizePriceDelta?: number;
  sugarLevel?: string;
  iceLevel?: string;
  spicyLevel?: string;
  toppings?: { name: string; price: number }[];
}

export interface OrderDetail {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  customizationTotal: number;
  subtotal: number;
  customizations?: OrderItemCustomization;
  notes?: string;
}

export type PaymentMethod = 'cash' | 'qris';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'FAILED';
export type KitchenStatus = 'WAITING' | 'COOKING' | 'READY' | 'COMPLETED';

export interface Payment {
  method: PaymentMethod;
  status: PaymentStatus;
  amountReceived?: number;
  change?: number;
  paidAt?: string;
  transactionRef?: string;
}

export interface OrderStatusHistoryItem {
  status: KitchenStatus;
  timestamp: string;
  changedBy: string;
  note?: string;
}

export type OrderType = 'dine_in' | 'take_away';

export interface Order {
  id: string; // e.g. "ORD-1024"
  queueNumber: string; // e.g. "A-024"
  orderType: OrderType;
  tableNumber?: string;
  items: OrderDetail[];
  subtotal: number;
  tax: number; // e.g. 10%
  totalAmount: number;
  payment: Payment;
  kitchenStatus: KitchenStatus;
  statusHistory: OrderStatusHistoryItem[];
  createdAt: string;
  completedAt?: string;
  stockDeducted: boolean; // CRITICAL: Only deducted on COMPLETED, never twice!
  createdByRole: UserRole;
  createdByName?: string;
  estimatedCompletionMinutes?: number;
  customerNote?: string;
}

export interface InventoryLog {
  id: string;
  timestamp: string;
  ingredientId: string;
  ingredientName: string;
  changeQuantity: number; // Negative for deductions, positive for restock
  beforeStock: number;
  afterStock: number;
  unit: UnitType;
  reason: 'Order Completion' | 'Manual Stock Adjustment' | 'Restock' | 'Initial';
  referenceId?: string; // Order ID or adjustment reference
  performedBy: string;
}

export interface POSSettings {
  restaurantName: string;
  address: string;
  phone: string;
  taxRatePercent: number; // 0 or 10%
  enableTax: boolean;
  currencyPrefix: string;
  autoPrintReceipt: boolean;
  defaultTableNumber: string;
}
