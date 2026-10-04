import React, { useState, useEffect } from 'react';
import { Order, KitchenStatus } from '../../types/pos';
import { posService } from '../../services/posService';
import { formatDateTime, playNotificationChime } from '../../utils/formatters';
import {
  ChefHat,
  Clock,
  Bell,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Flame,
  Check,
  PackageCheck,
  Utensils,
  ArrowRight,
} from 'lucide-react';

export const KitchenView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(posService.getOrders());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reloadData = () => {
    setOrders(posService.getOrders());
  };

  useEffect(() => {
    reloadData();
    const unsub = posService.subscribe(reloadData);
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUpdateStatus = (orderId: string, nextStatus: KitchenStatus) => {
    const updated = posService.updateOrderStatus(orderId, nextStatus, 'Chef Joko');
    if (!updated) return;

    if (soundEnabled) {
      if (nextStatus === 'COOKING') playNotificationChime('click');
      else if (nextStatus === 'READY') playNotificationChime('ready');
      else if (nextStatus === 'COMPLETED') playNotificationChime('complete');
    }

    if (nextStatus === 'COMPLETED') {
      showToast(
        `Order ${updated.queueNumber} Completed: Recipe BOM stock deducted automatically.`
      );
    } else if (nextStatus === 'READY') {
      showToast(`Order ${updated.queueNumber} is marked READY for pickup.`);
    } else if (nextStatus === 'COOKING') {
      showToast(`Started preparation for Order ${updated.queueNumber}.`);
    }
  };

  const getElapsedMinutes = (createdAt: string): number => {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.floor((now - created) / 60000);
  };

  const columns: {
    status: KitchenStatus;
    title: string;
    icon: React.ReactNode;
    badgeClass: string;
  }[] = [
    {
      status: 'WAITING',
      title: 'Incoming / Waiting',
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      status: 'COOKING',
      title: 'Preparation & Cooking',
      icon: <Flame className="w-4 h-4 text-blue-500" />,
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      status: 'READY',
      title: 'Ready to Serve',
      icon: <Bell className="w-4 h-4 text-emerald-500" />,
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      status: 'COMPLETED',
      title: 'Fulfilled / Done',
      icon: <CheckCircle2 className="w-4 h-4 text-slate-500" />,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* KDS Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-extrabold text-xl text-slate-900">
              Kitchen Display System (KDS)
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>LIVE KITCHEN FEED</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time ticket expediter · Automatic inventory deduction triggers on Completed status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Chime {soundEnabled ? 'ON' : 'MUTED'}</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-xl flex items-center justify-between text-xs animate-in slide-in-from-top duration-200 border border-slate-700">
          <div className="flex items-center gap-2.5">
            <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white p-1 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* 4-Column Responsive KDS Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colOrders = orders
            .filter((o) => o.kitchenStatus === col.status)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          const displayOrders = col.status === 'COMPLETED' ? colOrders.slice(-8).reverse() : colOrders;

          return (
            <div
              key={col.status}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col min-h-[660px]"
            >
              {/* Column Header */}
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 font-heading font-bold text-xs text-slate-900">
                  {col.icon}
                  <span>{col.title}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white border border-slate-200 text-slate-800">
                  {colOrders.length}
                </span>
              </div>

              {/* Column Tickets List */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-230px)] bg-slate-50/50">
                {displayOrders.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs text-center border-2 border-dashed border-slate-200 rounded-xl m-1">
                    <Utensils className="w-6 h-6 mb-1 text-slate-300" />
                    <span>No dockets {col.title.toLowerCase()}</span>
                  </div>
                ) : (
                  displayOrders.map((order) => {
                    const elapsed = getElapsedMinutes(order.createdAt);
                    const isUrgent = elapsed >= 15 && order.kitchenStatus !== 'COMPLETED';

                    return (
                      <div
                        key={order.id}
                        className={`rounded-xl border shadow-2xs transition-all flex flex-col justify-between overflow-hidden bg-white ${
                          isUrgent
                            ? 'border-rose-300 ring-2 ring-rose-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Ticket Top Bar */}
                        <div className="p-3 bg-slate-900 text-white flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-heading font-black text-2xl text-amber-400">
                                {order.queueNumber}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400 font-medium">
                                {order.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-300">
                              <span className="font-semibold">
                                {order.orderType === 'dine_in' ? `Table ${order.tableNumber || '-'}` : '🛍️ Take Away'}
                              </span>
                              <span>·</span>
                              <span
                                className={`flex items-center gap-0.5 font-mono ${
                                  isUrgent ? 'text-rose-400 font-bold' : 'text-slate-300'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                <span>{elapsed}m ago</span>
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {order.payment.status}
                          </span>
                        </div>

                        {/* Ticket Items */}
                        <div className="p-3.5 space-y-2 text-xs">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="pb-2 border-b border-slate-100 last:border-b-0 last:pb-0 space-y-0.5"
                            >
                              <div className="font-bold text-slate-900 text-sm flex items-baseline justify-between">
                                <span>
                                  <span className="text-amber-600 font-extrabold mr-1.5 font-mono">
                                    {item.quantity}x
                                  </span>
                                  {item.name}
                                </span>
                              </div>

                              {item.customizations && (
                                <div className="text-[11px] text-slate-600 space-y-0.5 pl-3 border-l-2 border-amber-400">
                                  {item.customizations.size && (
                                    <div>Size: <span className="font-semibold">{item.customizations.size}</span></div>
                                  )}
                                  {item.customizations.sugarLevel && (
                                    <div>Sugar: <span className="font-semibold">{item.customizations.sugarLevel}</span></div>
                                  )}
                                  {item.customizations.iceLevel && (
                                    <div>Ice: <span className="font-semibold">{item.customizations.iceLevel}</span></div>
                                  )}
                                  {item.customizations.spicyLevel && (
                                    <div>Spicy: <span className="font-semibold">{item.customizations.spicyLevel}</span></div>
                                  )}
                                  {item.customizations.toppings && item.customizations.toppings.length > 0 && (
                                    <div>
                                      Toppings: <span className="font-semibold">{item.customizations.toppings.map((t) => t.name).join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {item.notes && (
                                <div className="p-1 rounded bg-amber-50 text-amber-900 font-medium text-[11px] mt-1 border border-amber-200">
                                  ⚠️ "{item.notes}"
                                </div>
                              )}
                            </div>
                          ))}

                          {order.customerNote && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-900 flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{order.customerNote}</span>
                            </div>
                          )}
                        </div>

                        {/* Stage Progression Action */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200">
                          {order.kitchenStatus === 'WAITING' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'COOKING')}
                              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Flame className="w-4 h-4 text-amber-400" />
                              <span>Start Cooking 🍳</span>
                            </button>
                          )}

                          {order.kitchenStatus === 'COOKING' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'READY')}
                              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Bell className="w-4 h-4" />
                              <span>Mark Ready 🔔</span>
                            </button>
                          )}

                          {order.kitchenStatus === 'READY' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Complete & Deduct Stock ✅</span>
                            </button>
                          )}

                          {order.kitchenStatus === 'COMPLETED' && (
                            <div className="p-2 bg-white rounded-lg border border-slate-200 text-center space-y-0.5">
                              <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Ingredient Stock Deducted ✓</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Completed at {formatDateTime(order.completedAt)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
