import React, { useState, useEffect } from 'react';
import { MenuItem, Order, OrderDetail, PaymentMethod } from '../../types/pos';
import { posService } from '../../services/posService';
import { formatRupiah, playNotificationChime } from '../../utils/formatters';
import { KitchenStatusBadge, PaymentStatusBadge } from '../common/StatusBadge';
import {
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  QrCode,
  Banknote,
  CheckCircle2,
  Clock,
  ChevronRight,
  Utensils,
  MapPin,
  Check,
  Search,
  Coffee,
  CupSoda,
  Flame,
  Croissant,
  SlidersHorizontal,
} from 'lucide-react';

interface CustomerViewProps {
  initialTableNumber?: string;
  onNavigateToOrder?: (orderId: string) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  initialTableNumber = '12',
}) => {
  const [tableNumber, setTableNumber] = useState(initialTableNumber);
  const [categories, setCategories] = useState(posService.getCategories());
  const [menuItems, setMenuItems] = useState(posService.getMenuItems());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Customization modal
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedSugar, setSelectedSugar] = useState<string>('');
  const [selectedIce, setSelectedIce] = useState<string>('');
  const [selectedSpicy, setSelectedSpicy] = useState<string>('');
  const [selectedToppings, setSelectedToppings] = useState<{ name: string; price: number }[]>([]);
  const [customNotes, setCustomNotes] = useState('');

  // Cart
  const [cart, setCart] = useState<OrderDetail[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away'>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Active tracked order
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);

  const reloadData = () => {
    setCategories(posService.getCategories());
    setMenuItems(posService.getMenuItems());

    if (activeOrder) {
      const refreshed = posService.getOrderById(activeOrder.id);
      if (refreshed) {
        if (refreshed.kitchenStatus !== activeOrder.kitchenStatus) {
          if (refreshed.kitchenStatus === 'READY') {
            playNotificationChime('ready');
          } else if (refreshed.kitchenStatus === 'COMPLETED') {
            playNotificationChime('complete');
          }
        }
        setActiveOrder(refreshed);
      }
    } else {
      const allOrders = posService.getOrders();
      const existing = allOrders.find(
        (o) => o.tableNumber === tableNumber && o.kitchenStatus !== 'COMPLETED'
      );
      if (existing) {
        setActiveOrder(existing);
      }
    }
  };

  useEffect(() => {
    reloadData();
    const unsub = posService.subscribe(reloadData);
    return () => unsub();
  }, [activeOrder?.id, tableNumber]);

  const openCustomizer = (product: MenuItem) => {
    setSelectedProduct(product);
    setModalQuantity(1);
    setSelectedSize(product.customizations?.sizes?.[0]?.name || '');
    setSelectedSugar(product.customizations?.sugarLevels?.[0] || '');
    setSelectedIce(product.customizations?.iceLevels?.[0] || '');
    setSelectedSpicy(product.customizations?.spicyLevels?.[0] || '');
    setSelectedToppings([]);
    setCustomNotes('');
  };

  const calculateItemUnitPrice = (product: MenuItem): number => {
    let price = product.price;
    if (product.customizations?.sizes && selectedSize) {
      const sizeObj = product.customizations.sizes.find((s) => s.name === selectedSize);
      if (sizeObj) price += sizeObj.priceDelta;
    }
    selectedToppings.forEach((t) => {
      price += t.price;
    });
    return price;
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const unitPrice = calculateItemUnitPrice(selectedProduct);
    const subtotal = unitPrice * modalQuantity;

    const newCartItem: OrderDetail = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      menuItemId: selectedProduct.id,
      name: selectedProduct.name,
      quantity: modalQuantity,
      unitPrice: selectedProduct.price,
      customizationTotal: unitPrice - selectedProduct.price,
      subtotal,
      customizations: {
        size: selectedSize || undefined,
        sugarLevel: selectedSugar || undefined,
        iceLevel: selectedIce || undefined,
        spicyLevel: selectedSpicy || undefined,
        toppings: selectedToppings.length > 0 ? selectedToppings : undefined,
      },
      notes: customNotes.trim() || undefined,
    };

    setCart((prev) => [...prev, newCartItem]);
    setSelectedProduct(null);
    playNotificationChime('click');
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const updateCartItemQuantity = (id: string, delta: number) => {
    setCart((prev) =>
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

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    setTimeout(() => {
      const order = posService.createOrder({
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        items: cart,
        paymentMethod,
        paymentStatus: paymentMethod === 'qris' ? 'PAID' : 'UNPAID',
        createdByRole: 'customer',
        createdByName: `Customer (Table ${tableNumber})`,
        customerNote: orderType === 'dine_in' ? `Table ${tableNumber}` : 'Take Away',
      });

      setCart([]);
      setIsCartOpen(false);
      setIsCheckingOut(false);
      setActiveOrder(order);
      setShowOrderSuccessModal(true);
      playNotificationChime('order');
    }, 500);
  };

  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.isActive) return false;
    if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'cat-coffee':
        return <Coffee className="w-3.5 h-3.5" />;
      case 'cat-noncoffee':
        return <CupSoda className="w-3.5 h-3.5" />;
      case 'cat-main':
        return <Flame className="w-3.5 h-3.5" />;
      case 'cat-snack':
        return <Croissant className="w-3.5 h-3.5" />;
      default:
        return <Utensils className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-28">
      {/* Hero Welcome Banner */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        <img
          src="/src/assets/images/servin_hero_cafe_1791009484438.jpg"
          alt="Servin Coffee & Kitchen"
          className="absolute inset-0 w-full h-full object-cover opacity-35 filter brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/60 to-transparent" />

        <div className="relative max-w-5xl mx-auto px-4 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold backdrop-blur-md border border-amber-500/30">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>Table {tableNumber}</span>
              </span>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs text-slate-300">Dine-in Guest Portal</span>
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-white">
              Servin Coffee & Kitchen
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-md">
              Handcrafted specialty espresso, artisan pour-overs, and chef-curated kitchen bowls.
            </p>
          </div>

          {activeOrder && (
            <button
              onClick={() => {
                document.getElementById('live-order-docket')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg cursor-pointer self-start sm:self-auto"
            >
              <Clock className="w-4 h-4 text-slate-950 animate-spin" />
              <span>Track Active Queue {activeOrder.queueNumber}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* Active Order Live Docket (If customer has order in kitchen) */}
        {activeOrder && (
          <div
            id="live-order-docket"
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Kitchen Display Status · Table {tableNumber}
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-heading font-black text-2xl text-amber-400">
                    QUEUE {activeOrder.queueNumber}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">({activeOrder.id})</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <KitchenStatusBadge status={activeOrder.kitchenStatus} size="lg" />
                <PaymentStatusBadge
                  status={activeOrder.payment.status}
                  method={activeOrder.payment.method}
                />
              </div>
            </div>

            {/* Stepper Progress */}
            <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200/80">
              <div className="grid grid-cols-4 gap-2 relative">
                {[
                  { key: 'WAITING', label: 'Waiting', sub: 'Docket received' },
                  { key: 'COOKING', label: 'Cooking', sub: 'In preparation' },
                  { key: 'READY', label: 'Ready', sub: 'Ready to serve' },
                  { key: 'COMPLETED', label: 'Done', sub: 'Stock deducted' },
                ].map((step, idx) => {
                  const stepIndex = ['WAITING', 'COOKING', 'READY', 'COMPLETED'].indexOf(step.key);
                  const currentIndex = ['WAITING', 'COOKING', 'READY', 'COMPLETED'].indexOf(
                    activeOrder.kitchenStatus
                  );
                  const isCurrent = step.key === activeOrder.kitchenStatus;
                  const isPassed = stepIndex <= currentIndex;

                  return (
                    <div key={step.key} className="text-center">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isCurrent
                            ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-200 shadow-sm'
                            : isPassed
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-400 border border-slate-300'
                        }`}
                      >
                        {isPassed && !isCurrent ? <Check className="w-4 h-4 text-emerald-400" /> : idx + 1}
                      </div>
                      <div className="mt-2 text-xs font-bold text-slate-900">{step.label}</div>
                      <div className="text-[10px] text-slate-500 hidden sm:block">{step.sub}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Items summary */}
            <div className="p-4 text-xs space-y-2">
              <div className="flex justify-between font-semibold text-slate-700 pb-2 border-b border-slate-100">
                <span>Ordered Items ({activeOrder.items.length})</span>
                <span className="font-mono tabular-nums text-slate-900 font-bold">
                  {formatRupiah(activeOrder.totalAmount)}
                </span>
              </div>
              {activeOrder.items.map((it) => (
                <div key={it.id} className="flex justify-between text-slate-700 py-1">
                  <div>
                    <span className="font-bold text-slate-900">{it.quantity}x {it.name}</span>
                    {it.customizations && (
                      <span className="text-slate-500 text-[11px] block">
                        {[
                          it.customizations.size,
                          it.customizations.sugarLevel,
                          it.customizations.iceLevel,
                          it.customizations.toppings?.map((t) => t.name).join(', '),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                    {it.notes && (
                      <span className="text-amber-800 text-[11px] italic block">
                        "{it.notes}"
                      </span>
                    )}
                  </div>
                  <span className="font-mono tabular-nums font-semibold">
                    {formatRupiah(it.subtotal)}
                  </span>
                </div>
              ))}

              {activeOrder.kitchenStatus === 'COMPLETED' && (
                <div className="mt-3 p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="font-medium">
                    Order fulfilled! Inventory stocks updated automatically.
                  </span>
                  <button
                    onClick={() => setActiveOrder(null)}
                    className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
                  >
                    Start New Order
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Bar & Category Filters */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search handcrafted coffee, bowls, sides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 rounded-2xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>All Menu</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu Catalog Grid - Clean, Modern Editorial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMenuItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md card-hover-elevate flex flex-col justify-between group ${
                !item.isAvailable ? 'opacity-50 grayscale' : ''
              }`}
            >
              {/* Product Visual */}
              <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center">
                    <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg tracking-wide">
                      Sold Out
                    </span>
                  </div>
                )}
                {/* Category Pill Tag */}
                <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                  {categories.find((c) => c.id === item.categoryId)?.name || 'Specialty'}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 mb-1">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-mono tabular-nums font-extrabold text-base text-slate-900">
                    {formatRupiah(item.price)}
                  </span>

                  <button
                    disabled={!item.isAvailable}
                    onClick={() => openCustomizer(item)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Persistent Floating Cart Action Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl flex items-center justify-between cursor-pointer transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm">
                {cartItemCount}
              </div>
              <div className="text-left">
                <div className="font-heading font-bold text-sm text-white">View Order Cart</div>
                <div className="text-[11px] text-slate-400">Table {tableNumber} · Tap to Review</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums font-extrabold text-base text-amber-400">
                {formatRupiah(cartSubtotal)}
              </span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </button>
        </div>
      )}

      {/* Product Customization Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 max-h-[88vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900">
                  {selectedProduct.name}
                </h3>
                <span className="font-mono tabular-nums font-extrabold text-amber-600 text-sm">
                  {formatRupiah(selectedProduct.price)}
                </span>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-slate-700">
              {/* Size Option */}
              {selectedProduct.customizations?.sizes && selectedProduct.customizations.sizes.length > 0 && (
                <div>
                  <label className="font-bold text-slate-900 block mb-2">Cup Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProduct.customizations.sizes.map((sz) => (
                      <button
                        key={sz.name}
                        onClick={() => setSelectedSize(sz.name)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          selectedSize === sz.name
                            ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="font-bold">{sz.name}</div>
                        <div className={`text-[11px] ${selectedSize === sz.name ? 'text-amber-300' : 'text-slate-500'}`}>
                          {sz.priceDelta > 0 ? `+${formatRupiah(sz.priceDelta)}` : 'Standard'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sugar Level */}
              {selectedProduct.customizations?.sugarLevels && (
                <div>
                  <label className="font-bold text-slate-900 block mb-2">Sweetness Level</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {selectedProduct.customizations.sugarLevels.map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setSelectedSugar(lvl)}
                        className={`p-2 rounded-lg border text-center text-xs cursor-pointer transition-all ${
                          selectedSugar === lvl
                            ? 'border-slate-900 bg-slate-100 font-bold text-slate-900'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ice Level */}
              {selectedProduct.customizations?.iceLevels && (
                <div>
                  <label className="font-bold text-slate-900 block mb-2">Ice Proportion</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {selectedProduct.customizations.iceLevels.map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setSelectedIce(lvl)}
                        className={`p-2 rounded-lg border text-center text-xs cursor-pointer transition-all ${
                          selectedIce === lvl
                            ? 'border-slate-900 bg-slate-100 font-bold text-slate-900'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Spicy Level */}
              {selectedProduct.customizations?.spicyLevels && (
                <div>
                  <label className="font-bold text-slate-900 block mb-2">Spiciness Level</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {selectedProduct.customizations.spicyLevels.map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setSelectedSpicy(lvl)}
                        className={`p-2 rounded-lg border text-center text-xs cursor-pointer transition-all ${
                          selectedSpicy === lvl
                            ? 'border-slate-900 bg-slate-100 font-bold text-slate-900'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Toppings */}
              {selectedProduct.customizations?.toppings && selectedProduct.customizations.toppings.length > 0 && (
                <div>
                  <label className="font-bold text-slate-900 block mb-2">Add-on Toppings</label>
                  <div className="space-y-1.5">
                    {selectedProduct.customizations.toppings.map((top) => {
                      const isSelected = selectedToppings.some((t) => t.name === top.name);
                      return (
                        <div
                          key={top.name}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedToppings((prev) => prev.filter((t) => t.name !== top.name));
                            } else {
                              setSelectedToppings((prev) => [...prev, top]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="accent-slate-900"
                            />
                            <span>{top.name}</span>
                          </div>
                          <span className="font-mono tabular-nums text-slate-500">
                            +{formatRupiah(top.price)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div>
                <label className="font-bold text-slate-900 block mb-1">
                  Kitchen Note (Allergies / Requests)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Less sweet, extra ice, no peanuts..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-900">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-200 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-sm w-5 text-center font-mono">{modalQuantity}</span>
                  <button
                    onClick={() => setModalQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={handleAddToCart}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Add to Cart</span>
                <span>·</span>
                <span className="font-mono tabular-nums text-amber-400">
                  {formatRupiah(calculateItemUnitPrice(selectedProduct) * modalQuantity)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-slate-900" />
                <h3 className="font-heading font-bold text-base text-slate-900">Order Cart Summary</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Dine-in vs Take Away */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setOrderType('dine_in')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  orderType === 'dine_in'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🍽️ Dine-in (Table {tableNumber})
              </button>
              <button
                onClick={() => setOrderType('take_away')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  orderType === 'take_away'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🛍️ Take Away
              </button>
            </div>

            {/* Cart Items */}
            <div className="space-y-2.5 mb-4 max-h-56 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    {item.customizations && (
                      <div className="text-[11px] text-slate-500">
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
                      <div className="text-[11px] text-amber-800 italic mt-0.5">
                        "{item.notes}"
                      </div>
                    )}
                    <div className="font-mono tabular-nums font-bold text-slate-900 mt-1">
                      {formatRupiah(item.subtotal)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartItemQuantity(item.id, -1)}
                      className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="font-bold w-4 text-center font-mono">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItemQuantity(item.id, 1)}
                      className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="font-bold text-xs text-slate-900 block mb-2">
                Select Settlement Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod('qris')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    paymentMethod === 'qris'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold">QRIS Instant</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold">Pay at Cashier</span>
                </button>
              </div>
            </div>

            {/* Total Billing */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-4 space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatRupiah(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Service & Tax</span>
                <span>Rp 0</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Payment</span>
                <span className="font-mono tabular-nums text-base">{formatRupiah(cartSubtotal)}</span>
              </div>
            </div>

            <button
              disabled={isCheckingOut || cart.length === 0}
              onClick={handlePlaceOrder}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isCheckingOut ? (
                <span>Transmitting Order to Kitchen...</span>
              ) : (
                <>
                  <span>Place Order · {formatRupiah(cartSubtotal)}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Order Success Popover */}
      {showOrderSuccessModal && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in zoom-in-95 duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="font-heading font-bold text-lg text-slate-900">Order Placed!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Your ticket has been sent directly to the Kitchen Display System.
            </p>

            <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase block">
                Queue Number
              </span>
              <span className="font-heading font-black text-3xl text-slate-900 block my-1">
                {activeOrder.queueNumber}
              </span>
              <span className="text-xs font-mono text-slate-600">
                ID: {activeOrder.id} · Table {tableNumber}
              </span>
            </div>

            <button
              onClick={() => setShowOrderSuccessModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-heading font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Track Order Live
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
