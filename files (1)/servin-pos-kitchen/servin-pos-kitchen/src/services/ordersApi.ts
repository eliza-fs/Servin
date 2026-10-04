import { supabase } from '../lib/supabase';
import type {
  KitchenStatus,
  Order,
  OrderDetail,
  OrderItemCustomization,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../types/pos';

interface DbOrderItemRow {
  id: number | string;
  order_id: number | string;
  menu_item_id: string | null;
  name: string;
  price: number | string | null;
  quantity: number | string | null;
  customizations: unknown;
  notes: string | null;
}

interface DbOrderRow {
  id: number | string;
  queue_number: string | null;
  table_number: string | null;
  customer_name: string | null;
  payment_method: string | null;
  payment_status: string | null;
  kitchen_status: string | null;
  total: number | string | null;
  stock_deducted: boolean | null;
  created_at: string | null;
  order_items?: DbOrderItemRow[] | null;
}

const KITCHEN_STATUSES: KitchenStatus[] = ['WAITING', 'COOKING', 'READY', 'COMPLETED', 'CANCELLED'];

// Kitchen may only move an order one step forward.
const PREVIOUS_STATUS: Partial<Record<KitchenStatus, KitchenStatus>> = {
  COOKING: 'WAITING',
  READY: 'COOKING',
  COMPLETED: 'READY',
};

const toNumber = (value: number | string | null | undefined): number => Number(value ?? 0) || 0;

function mapKitchenStatus(value: string | null): KitchenStatus {
  return (KITCHEN_STATUSES as string[]).includes(value ?? '') ? (value as KitchenStatus) : 'WAITING';
}

function mapPaymentStatus(value: string | null): PaymentStatus {
  return value === 'PAID' || value === 'FAILED' ? value : 'UNPAID';
}

function mapPaymentMethod(value: string | null): PaymentMethod {
  return String(value ?? '').toLowerCase() === 'qris' ? 'qris' : 'cash';
}

function mapOrderItem(row: DbOrderItemRow): OrderDetail {
  const quantity = toNumber(row.quantity) || 1;
  const unitPrice = toNumber(row.price);
  const customizations =
    row.customizations && typeof row.customizations === 'object'
      ? (row.customizations as OrderItemCustomization)
      : undefined;

  return {
    id: String(row.id),
    menuItemId: row.menu_item_id ?? '',
    name: row.name,
    quantity,
    unitPrice,
    customizationTotal: 0,
    subtotal: unitPrice * quantity,
    customizations,
    notes: row.notes ?? undefined,
  };
}

function mapDbOrder(row: DbOrderRow): Order {
  const items = (row.order_items ?? []).map(mapOrderItem);
  const totalAmount = toNumber(row.total);
  const createdAt = row.created_at ?? new Date().toISOString();
  const kitchenStatus = mapKitchenStatus(row.kitchen_status);
  const paymentStatus = mapPaymentStatus(row.payment_status);

  const payment: Payment = {
    method: mapPaymentMethod(row.payment_method),
    status: paymentStatus,
    paidAt: paymentStatus === 'PAID' ? createdAt : undefined,
  };

  return {
    id: String(row.id),
    queueNumber: row.queue_number ?? '',
    orderType: row.table_number ? 'dine_in' : 'take_away',
    tableNumber: row.table_number ?? undefined,
    items,
    subtotal: items.reduce((sum, item) => sum + item.subtotal, 0) || totalAmount,
    tax: 0,
    totalAmount,
    payment,
    kitchenStatus,
    statusHistory: [
      {
        status: kitchenStatus,
        timestamp: createdAt,
        changedBy: row.customer_name || 'Customer',
      },
    ],
    createdAt,
    completedAt: kitchenStatus === 'COMPLETED' ? createdAt : undefined,
    stockDeducted: Boolean(row.stock_deducted),
    createdByRole: 'customer',
    createdByName: row.customer_name ?? undefined,
  };
}

/** All non-cancelled orders with their items, oldest first. */
export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .neq('kitchen_status', 'CANCELLED')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as DbOrderRow[]).map(mapDbOrder);
}

/**
 * Moves an order exactly one step forward (WAITING -> COOKING -> READY -> COMPLETED).
 * Returns undefined if the order was already changed, cancelled, or the step is not allowed.
 */
export async function updateOrderStatusInDb(
  orderId: string,
  newStatus: KitchenStatus
): Promise<Order | undefined> {
  const previous = PREVIOUS_STATUS[newStatus];
  if (!previous) throw new Error('Invalid status change: ' + newStatus);

  const { data, error } = await supabase
    .from('orders')
    .update({ kitchen_status: newStatus })
    .eq('id', orderId)
    .eq('kitchen_status', previous)
    .select('*, order_items(*)');

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as DbOrderRow[];
  return rows.length > 0 ? mapDbOrder(rows[0]) : undefined;
}

/** Calls the listener on any order change (realtime), plus a 5-second polling fallback. */
export function subscribeToOrders(listener: () => void): () => void {
  const pollId = window.setInterval(listener, 5000);

  const channel = supabase
    .channel('kitchen-orders-' + Date.now())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => listener())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => listener())
    .subscribe();

  return () => {
    window.clearInterval(pollId);
    supabase.removeChannel(channel);
  };
}