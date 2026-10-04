import React, { useState, useEffect } from 'react';
import { MenuItem, Order, OrderDetail, PaymentMethod } from '../../types/pos';
import { posService } from '../../services/posService';
import { formatRupiah, formatDateTime, playNotificationChime } from '../../utils/formatters';
import { KitchenStatusBadge, PaymentStatusBadge } from '../common/StatusBadge';
import {
  CreditCard,
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle2,
  Printer,
  Banknote,
  QrCode,
  Clock,
  Receipt,
  User,
  AlertCircle,
  FileSpreadsheet,
  Utensils,
  Layers,
} from 'lucide-react';

export const CashierView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new_order' | 'active_orders' | 'transactions' | 'order_status'>('new_order');
  const [categories, setCategories] = useState(posService.getCategories());
  const [menuItems, setMenuItems] = useState(posService.getMenuItems());
  const [orders, setOrders] = useState(posService.getOrders());

  // New Order State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away'>('dine_in');
  const [tableNumber, setTableNumber] = useState('1');
  const [customerName, setCustomerName] = useState('');
  const [cashierCart, setCashierCart] = useState<OrderDetail[]>([]);

  // Item customization
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customSize, setCustomSize] = useState('');
  const [customSugar, setCustomSugar] = useState('');
  const [customIce, setCustomIce] = useState('');
  const [customSpicy, setCustomSpicy] = useState('');
  const [customToppings, setCustomToppings] = useState<{ name: string; price: number }[]>([]);
  const [customNotes, setCustomNotes] = useState('');

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [justCompletedOrder, setJustCompletedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Pay at Cashier collection for unpaid orders
  const [collectingOrder, setCollectingOrder] = useState<Order | null>(null);
  const [collectCashReceived, setCollectCashReceived] = useState<number>(0);

  const reloadData = () => {
    setCategories(posService.getCategories());
    setMenuItems(posService.getMenuItems());
    setOrders(posService.getOrders());
  };

  useEffect(() => {
    reloadData();
    const unsub = posService.subscribe(reloadData);
    return () => unsub();
  }, []);

  const filteredMenuItems = menuItems.filter((m) => {
    if (!m.isActive) return false;
    if (selectedCategory !== 'all' && m.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
    }
    return true;
  });

  const openCustomizer = (product: MenuItem) => {
    setCustomizingItem(product);
    setCustomSize(product.customizations?.sizes?.[0]?.name || '');
    setCustomSugar(product.customizations?.sugarLevels?.[0] || '');
    setCustomIce(product.customizations?.iceLevels?.[0] || '');
    setCustomSpicy(product.customizations?.spicyLevels?.[0] || '');
    setCustomToppings([]);
    setCustomNotes('');
  };

  const handleAddCustomizedToCart = () => {
    if (!customizingItem) return;

    let unitPrice = customizingItem.price;
    if (customizingItem.customizations?.sizes && customSize) {
      const sz = customizingItem.customizations.sizes.find((s) => s.name === customSize);
      if (sz) unitPrice += sz.priceDelta;
    }
    customToppings.forEach((t) => (unitPrice += t.price));

    const newItem: OrderDetail = {
      id: `cashier-cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      menuItemId: customizingItem.id,
      name: customizingItem.name,
      quantity: 1,
      unitPrice: customizingItem.price,
      customizationTotal: unitPrice - customizingItem.price,
      subtotal: unitPrice,
      customizations: {
        size: customSize || undefined,
        sugarLevel: customSugar || undefined,
        iceLevel: customIce || undefined,
        spicyLevel: customSpicy || undefined,
        toppings: customToppings.length > 0 ? customToppings : undefined,
      },
      notes: customNotes.trim() || undefined,
    };

    setCashierCart((prev) => [...prev, newItem]);
    setCustomizingItem(null);
    playNotificationChime('click');
  };

  const updateCartQty = (id: string, delta: number) => {
    setCashierCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const singleUnitPrice = item.unitPrice + item.customizationTotal;
            return {
              ...item,
              quantity: newQty,
              subtotal: singleUnitPrice * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as OrderDetail[]
    );
  };

  const removeFromCart = (id: string) => {
    setCashierCart((prev) => prev.filter((item) => item.id !== id));
  };

  const cartSubtotal = cashierCart.reduce((acc, item) => acc + item.subtotal, 0);

  const handleOpenPayment = () => {
    if (cashierCart.length === 0) return;
    setCashReceived(cartSubtotal);
    setPaymentMethod('cash');
    setShowPaymentModal(true);
  };

  const handleFinalizePayment = () => {
    const change = Math.max(0, cashReceived - cartSubtotal);

    const createdOrder = posService.createOrder({
      orderType,
      tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
      items: cashierCart,
      paymentMethod,
      paymentStatus: 'PAID',
      amountReceived: paymentMethod === 'cash' ? cashReceived : cartSubtotal,
      change: paymentMethod === 'cash' ? change : 0,
      createdByRole: 'cashier',
      createdByName: 'Cashier Budi',
      customerNote: customerName ? `Guest: ${customerName}` : undefined,
    });

    setCashierCart([]);
    setShowPaymentModal(false);
    setJustCompletedOrder(createdOrder);
    setShowReceiptModal(true);
    playNotificationChime('order');
  };

  const handleCollectCashPayment = () => {
    if (!collectingOrder) return;
    const change = Math.max(0, collectCashReceived - collectingOrder.totalAmount);
    posService.processPayment(collectingOrder.id, {
      status: 'PAID',
      method: 'cash',
      amountReceived: collectCashReceived,
      change,
    });
    setCollectingOrder(null);
    playNotificationChime('order');
  };

  const activeOrdersList = orders.filter((o) => o.kitchenStatus !== 'COMPLETED');

  return (
    <div className="max-w-[1520px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* Cashier Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-slate-900">
            Cashier POS Register
          </h2>
          <p className="text-xs text-slate-500">
            Rapid touch ordering, billing, and live kitchen synchronization
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          {[
            { id: 'new_order', label: '➕ New Ticket' },
            { id: 'active_orders', label: `Active Dockets (${activeOrdersList.length})` },
            { id: 'transactions', label: `Transactions (${orders.length})` },
            { id: 'order_status', label: 'Status Monitor' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: NEW ORDER WORKSPACE */}
      {activeTab === 'new_order' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Menu Catalog (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search products by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      selectedCategory === c.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {filteredMenuItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openCustomizer(item)}
                  className={`bg-white rounded-2xl border border-slate-200/90 p-3 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
                    !item.isAvailable ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <div className="relative aspect-[4/3] mb-2.5 rounded-xl overflow-hidden bg-slate-100">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {!item.isAvailable && (
                      <span className="absolute inset-0 bg-slate-950/70 text-white text-[10px] font-bold flex items-center justify-center">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-xs text-slate-900 line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="font-mono tabular-nums text-xs text-slate-900 font-extrabold mt-1">
                      {formatRupiah(item.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* POS Register Slip (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[580px]">
            {/* Header Ticket */}
            <div className="p-4 bg-slate-900 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="font-heading font-extrabold text-sm tracking-tight text-white">
                  Active Register Ticket
                </span>
                <span className="text-[11px] text-amber-400 font-mono">
                  {cashierCart.length} item(s)
                </span>
              </div>

              {/* Dine-in vs Take Away Switch */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800 rounded-xl text-xs">
                <button
                  onClick={() => setOrderType('dine_in')}
                  className={`py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    orderType === 'dine_in'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🍽️ Dine-in
                </button>
                <button
                  onClick={() => setOrderType('take_away')}
                  className={`py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    orderType === 'take_away'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🛍️ Take Away
                </button>
              </div>

              {/* Table No & Customer Name */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                {orderType === 'dine_in' && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Table No.</label>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-bold text-xs focus:outline-none"
                    />
                  </div>
                )}
                <div className={orderType === 'dine_in' ? '' : 'col-span-2'}>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Guest Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="Guest name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2 max-h-[300px]">
              {cashierCart.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs text-center border-2 border-dashed border-slate-100 rounded-xl">
                  <Utensils className="w-6 h-6 mb-1 text-slate-300" />
                  <span>No items added yet</span>
                  <span className="text-[11px] text-slate-400">Tap items on the left to add</span>
                </div>
              ) : (
                cashierCart.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{item.name}</span>
                        {item.customizations && (
                          <div className="text-[10px] text-slate-500">
                            {[
                              item.customizations.size,
                              item.customizations.sugarLevel,
                              item.customizations.iceLevel,
                              item.customizations.toppings?.map((t) => t.name).join(', '),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-[10px] text-amber-800 italic">"{item.notes}"</div>
                        )}
                      </div>
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatRupiah(item.unitPrice + item.customizationTotal)} ea
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateCartQty(item.id, -1)}
                          className="w-5 h-5 rounded bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(item.id, 1)}
                          className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-5 h-5 ml-1 text-slate-400 hover:text-rose-600 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Billing Summary & Action */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatRupiah(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax (0%)</span>
                <span>Rp 0</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Due</span>
                <span className="font-mono tabular-nums text-lg text-slate-900 font-extrabold">
                  {formatRupiah(cartSubtotal)}
                </span>
              </div>

              <button
                disabled={cashierCart.length === 0}
                onClick={handleOpenPayment}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Process Payment ({formatRupiah(cartSubtotal)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE KITCHEN ORDERS */}
      {activeTab === 'active_orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-base text-slate-900">
              Active Kitchen Orders ({activeOrdersList.length})
            </h3>
            <span className="text-xs text-slate-500">
              Cashier cannot modify cooking status (controlled strictly by Kitchen KDS).
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrdersList.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                All customer orders are completed!
              </div>
            ) : (
              activeOrdersList.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-heading font-black text-2xl text-slate-900">
                            {order.queueNumber}
                          </span>
                          <span className="text-xs text-slate-500 font-mono font-semibold">
                            {order.id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {order.orderType === 'dine_in' ? `Table ${order.tableNumber}` : '🛍️ Take Away'} · {formatDateTime(order.createdAt)}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <KitchenStatusBadge status={order.kitchenStatus} size="sm" />
                        <PaymentStatusBadge status={order.payment.status} method={order.payment.method} size="sm" />
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1 text-xs">
                      {order.items.map((it) => (
                        <div key={it.id} className="flex justify-between text-slate-700">
                          <span>
                            {it.quantity}x {it.name}
                            {it.customizations?.size && (
                              <span className="text-slate-400 text-[10px]"> ({it.customizations.size})</span>
                            )}
                          </span>
                          <span className="font-mono tabular-nums">{formatRupiah(it.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    {order.customerNote && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                        {order.customerNote}
                      </div>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Total</span>
                      <span className="font-mono tabular-nums font-bold text-sm text-slate-900">
                        {formatRupiah(order.totalAmount)}
                      </span>
                    </div>

                    {order.payment.status === 'UNPAID' ? (
                      <button
                        onClick={() => {
                          setCollectingOrder(order);
                          setCollectCashReceived(order.totalAmount);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Collect Cash</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setJustCompletedOrder(order);
                          setShowReceiptModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTIONS & RECEIPTS */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-base text-slate-900">Register Transactions</h3>
            <span className="text-xs text-slate-500 font-mono">{orders.length} total orders recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Queue</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Items Summary</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Kitchen</th>
                  <th className="py-2.5 px-3">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{o.id}</td>
                    <td className="py-2.5 px-3 font-heading font-bold text-slate-900">{o.queueNumber}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">{formatDateTime(o.createdAt)}</td>
                    <td className="py-2.5 px-3">
                      {o.orderType === 'dine_in' ? `Table ${o.tableNumber}` : 'Take Away'}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate">
                      {o.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{formatRupiah(o.totalAmount)}</td>
                    <td className="py-2.5 px-3">
                      <PaymentStatusBadge status={o.payment.status} method={o.payment.method} size="sm" />
                    </td>
                    <td className="py-2.5 px-3">
                      <KitchenStatusBadge status={o.kitchenStatus} size="sm" />
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => {
                          setJustCompletedOrder(o);
                          setShowReceiptModal(true);
                        }}
                        className="p-1 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="View Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ORDER STATUS MONITOR */}
      {activeTab === 'order_status' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">Real-Time Order Monitor</h3>
            <p className="text-xs text-slate-500">Live operational sync across kitchen display and cashier desk</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['WAITING', 'COOKING', 'READY', 'COMPLETED'] as const).map((status) => {
              const matching = orders.filter((o) => o.kitchenStatus === status);
              return (
                <div key={status} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <KitchenStatusBadge status={status} size="sm" />
                    <span className="text-xs font-mono font-bold text-slate-700">{matching.length}</span>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {matching.map((o) => (
                      <div key={o.id} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{o.queueNumber} ({o.id})</span>
                          <span className="font-mono">{formatRupiah(o.totalAmount)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {o.orderType === 'dine_in' ? `Table ${o.tableNumber}` : 'Take Away'} · {formatDateTime(o.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Item Customizer Modal */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900">
                  {customizingItem.name}
                </h3>
                <span className="font-mono tabular-nums text-sm font-bold text-slate-900">
                  {formatRupiah(customizingItem.price)}
                </span>
              </div>
              <button
                onClick={() => setCustomizingItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="py-3 space-y-3 text-xs text-slate-700">
              {customizingItem.customizations?.sizes && (
                <div>
                  <label className="font-bold block mb-1">Cup Size</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {customizingItem.customizations.sizes.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => setCustomSize(s.name)}
                        className={`p-2 rounded-lg border text-left cursor-pointer ${
                          customSize === s.name
                            ? 'border-slate-900 bg-slate-900 text-white font-bold'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>{s.name}</div>
                        {s.priceDelta > 0 && <span className="text-[10px] text-slate-400">+{formatRupiah(s.priceDelta)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {customizingItem.customizations?.sugarLevels && (
                <div>
                  <label className="font-bold block mb-1">Sugar Level</label>
                  <div className="grid grid-cols-2 gap-1">
                    {customizingItem.customizations.sugarLevels.map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setCustomSugar(lvl)}
                        className={`p-1.5 rounded border text-center text-xs cursor-pointer ${
                          customSugar === lvl ? 'bg-slate-900 text-white font-bold' : 'border-slate-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {customizingItem.customizations?.iceLevels && (
                <div>
                  <label className="font-bold block mb-1">Ice Level</label>
                  <div className="grid grid-cols-3 gap-1">
                    {customizingItem.customizations.iceLevels.map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setCustomIce(lvl)}
                        className={`p-1.5 rounded border text-center text-xs cursor-pointer ${
                          customIce === lvl ? 'bg-slate-900 text-white font-bold' : 'border-slate-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold block mb-1">Kitchen Instructions</label>
                <input
                  type="text"
                  placeholder="Special requests or allergies..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setCustomizingItem(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomizedToCart}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Add to Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Cashier Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-slate-900" />
                <h3 className="font-heading font-bold text-base text-slate-900">Cashier Settlement</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-400" />
                  <span>Cash Payment</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('qris')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    paymentMethod === 'qris'
                      ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <span>QRIS Dynamic</span>
                </button>
              </div>

              {/* Total Due Display */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Due</span>
                  <span className="font-mono tabular-nums font-black text-2xl text-amber-400">
                    {formatRupiah(cartSubtotal)}
                  </span>
                </div>
                <div className="text-right text-[11px] text-slate-300">
                  <span>{cashierCart.length} item(s)</span>
                  <br />
                  <span>{orderType === 'dine_in' ? `Table ${tableNumber}` : 'Take Away'}</span>
                </div>
              </div>

              {paymentMethod === 'cash' ? (
                <div className="space-y-3">
                  <div>
                    <label className="font-bold block mb-1">Amount Received (Rp):</label>
                    <input
                      type="number"
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  {/* Cash Quick Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Exact', val: cartSubtotal },
                      { label: 'Rp 20.000', val: 20000 },
                      { label: 'Rp 50.000', val: 50000 },
                      { label: 'Rp 100.000', val: 100000 },
                      { label: 'Rp 200.000', val: 200000 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setCashReceived(btn.val)}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer font-mono"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Change Calculation */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      cashReceived >= cartSubtotal
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-semibold uppercase block">Kembalian (Change)</span>
                      <span className="font-mono tabular-nums font-black text-xl">
                        {cashReceived >= cartSubtotal
                          ? formatRupiah(cashReceived - cartSubtotal)
                          : `Underpaid by ${formatRupiah(cartSubtotal - cashReceived)}`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                  <div className="w-24 h-24 mx-auto bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-slate-800" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">Scan QRIS to Complete</div>
                  <div className="text-[11px] text-slate-500">
                    Settlement will confirm instantly.
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Back
              </button>
              <button
                disabled={paymentMethod === 'cash' && cashReceived < cartSubtotal}
                onClick={handleFinalizePayment}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-heading font-bold hover:bg-slate-800 shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Confirm & Send to Kitchen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Cash Modal */}
      {collectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-1">
              Collect Cash at Counter
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Order {collectingOrder.id} ({collectingOrder.queueNumber}) · Table {collectingOrder.tableNumber || '-'}
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-100 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-slate-600">Total Due:</span>
                <span className="font-mono tabular-nums font-extrabold text-lg text-slate-900">
                  {formatRupiah(collectingOrder.totalAmount)}
                </span>
              </div>

              <div>
                <label className="font-bold block mb-1">Cash Received:</label>
                <input
                  type="number"
                  value={collectCashReceived || ''}
                  onChange={(e) => setCollectCashReceived(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-base font-bold text-slate-900"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex justify-between items-center">
                <span className="font-semibold">Change (Kembalian):</span>
                <span className="font-mono tabular-nums font-bold text-base">
                  {formatRupiah(Math.max(0, collectCashReceived - collectingOrder.totalAmount))}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setCollectingOrder(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={collectCashReceived < collectingOrder.totalAmount}
                onClick={handleCollectCashPayment}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
              >
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {showReceiptModal && justCompletedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in zoom-in-95 duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-xs font-mono text-slate-800">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h3 className="font-heading font-black text-base tracking-tight text-slate-900">
                SERVIN COFFEE & KITCHEN
              </h3>
              <p className="text-[10px] text-slate-500">Jl. Senopati No. 42, Jakarta</p>
              <p className="text-[10px] text-slate-500">Tel: +62 812-8899-7700</p>
            </div>

            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span className="font-bold">{justCompletedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Queue No:</span>
                <span className="font-bold text-base text-slate-900">{justCompletedOrder.queueNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span>{justCompletedOrder.orderType === 'dine_in' ? `Table ${justCompletedOrder.tableNumber}` : 'Take Away'}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(justCompletedOrder.createdAt).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{justCompletedOrder.createdByName || 'Cashier'}</span>
              </div>
            </div>

            {/* Items */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5">
              {justCompletedOrder.items.map((it) => (
                <div key={it.id} className="flex justify-between items-start text-[11px]">
                  <div>
                    <div>{it.quantity}x {it.name}</div>
                    {it.customizations?.size && (
                      <div className="text-[9px] text-slate-500">({it.customizations.size})</div>
                    )}
                  </div>
                  <span>{formatRupiah(it.subtotal)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatRupiah(justCompletedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{formatRupiah(justCompletedOrder.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment:</span>
                <span>{justCompletedOrder.payment.method.toUpperCase()} ({justCompletedOrder.payment.status})</span>
              </div>
              {justCompletedOrder.payment.amountReceived && (
                <div className="flex justify-between text-slate-600">
                  <span>Paid:</span>
                  <span>{formatRupiah(justCompletedOrder.payment.amountReceived)}</span>
                </div>
              )}
              {justCompletedOrder.payment.change !== undefined && (
                <div className="flex justify-between text-slate-600">
                  <span>Change:</span>
                  <span>{formatRupiah(justCompletedOrder.payment.change)}</span>
                </div>
              )}
            </div>

            <div className="text-center pt-3 text-[10px] text-slate-500">
              <p>Thank you for visiting Servin Coffee & Kitchen!</p>
            </div>

            <div className="mt-4 pt-3 flex gap-2 font-sans">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setJustCompletedOrder(null);
                }}
                className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
