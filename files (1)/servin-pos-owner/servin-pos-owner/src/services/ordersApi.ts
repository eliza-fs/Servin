import { supabase } from '../lib/supabase';
import type {
  KitchenStatus,
  Order,
  OrderDetail,
  OrderItemCustomization,
  Payment,
  PaymentMethod,
  PaymentStatus,
  UserRole,
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

export interface CreateOrderParams {
  orderType: 'dine_in' | 'take_away';
  tableNumber?: string;
  items: Order['items'];
  paymentMethod: 'cash' | 'qris';
  paymentStatus?: 'UNPAID' | 'PAID';
  amountReceived?: number;
  change?: number;
  createdByRole: UserRole;
  createdByName?: string;
  customerNote?: string;
}

const KITCHEN_STATUSES: KitchenStatus[] = ['WAITING', 'COOKING', 'READY', 'COMPLETED', 'CANCELLED'];

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
    createdByRole: 'cashier',
    customerNote: row.customer_name ?? undefined,
  };
}

async function fetchOrderById(orderId: string): Promise<Order | undefined> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapDbOrder(data as unknown as DbOrderRow) : undefined;
}

/** All orders (including cancelled), newest first. */
export async function fetchAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as DbOrderRow[]).map(mapDbOrder);
}

/** Creates an order and its items. The database generates the id and queue number. */
export async function createOrderInDb(params: CreateOrderParams): Promise<Order> {
  const total = params.items.reduce((sum, item) => sum + item.subtotal, 0);
  const guestName = params.customerNote?.startsWith('Guest: ') ? params.customerNote.slice(7) : null;
  const paymentStatus = params.paymentStatus ?? (params.paymentMethod === 'qris' ? 'PAID' : 'UNPAID');

  const { data: inserted, error: orderError } = await supabase
    .from('orders')
    .insert({
      table_number: params.orderType === 'dine_in' ? params.tableNumber || null : null,
      customer_name: guestName,
      payment_method: params.paymentMethod,
      payment_status: paymentStatus,
      total,
    })
    .select('id')
    .single();

  if (orderError || !inserted) throw new Error(orderError?.message ?? 'Failed to create order');
  const orderId = (inserted as { id: number | string }).id;

  const itemRows = params.items.map((item) => ({
    order_id: orderId,
    menu_item_id: item.menuItemId,
    name: item.name,
    price: item.unitPrice + item.customizationTotal,
    quantity: item.quantity,
    customizations: item.customizations ?? null,
    notes: item.notes ?? null,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(itemRows);
  if (itemsError) {
    // Do not leave an empty order in the kitchen queue.
    await supabase.rpc('cancel_order', { p_order_id: orderId, p_reason: 'Failed to save order items' });
    throw new Error(itemsError.message);
  }

  const saved = await fetchOrderById(String(orderId));
  if (!saved) throw new Error('Order was saved but could not be loaded');

  return {
    ...saved,
    payment: { ...saved.payment, amountReceived: params.amountReceived, change: params.change },
    createdByRole: params.createdByRole,
    createdByName: params.createdByName,
  };
}

/** Marks an order as paid (or failed). Cancelled orders cannot be changed. */
export async function updatePaymentInDb(
  orderId: string,
  update: {
    status: 'PAID' | 'FAILED';
    method?: 'cash' | 'qris';
    amountReceived?: number;
    change?: number;
  }
): Promise<Order | undefined> {
  const changes: Record<string, string> = { payment_status: update.status };
  if (update.method) changes.payment_method = update.method;

  const { data, error } = await supabase
    .from('orders')
    .update(changes)
    .eq('id', orderId)
    .neq('kitchen_status', 'CANCELLED')
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return undefined;

  const saved = await fetchOrderById(orderId);
  if (!saved) return undefined;

  return {
    ...saved,
    payment: { ...saved.payment, amountReceived: update.amountReceived, change: update.change },
  };
}

/** Cancels an order through the database function (admin and cashier only, not after COMPLETED). */
export async function cancelOrderInDb(orderId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_order', {
    p_order_id: Number(orderId),
    p_reason: reason?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

/** Calls the listener on any order change (realtime), plus a 5-second polling fallback. */
export function subscribeToOrders(listener: () => void): () => void {
  const pollId = window.setInterval(listener, 5000);

  const channel = supabase
    .channel('cashier-orders-' + Date.now())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => listener())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => listener())
    .subscribe();

  return () => {
    window.clearInterval(pollId);
    supabase.removeChannel(channel);
  };
}