import React, { useState, useEffect } from 'react';
import { posService } from '../../services/posService';
import { formatRupiah, formatNumber, formatDateFull } from '../../utils/formatters';
import { StockStatusBadge, PaymentStatusBadge, KitchenStatusBadge } from '../common/StatusBadge';
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Download,
  Calendar,
  Filter,
  PieChart,
  Layers,
  Search,
  CheckCircle,
  Clock,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';

export const OwnerView: React.FC = () => {
  const [analytics, setAnalytics] = useState(posService.getSalesAnalytics());
  const [ingredients, setIngredients] = useState(posService.getIngredients());
  const [orders, setOrders] = useState(posService.getOrders());

  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'qris'>('all');
  const [searchOrder, setSearchOrder] = useState('');

  const reloadData = () => {
    setAnalytics(posService.getSalesAnalytics());
    setIngredients(posService.getIngredients());
    setOrders(posService.getOrders());
  };

  useEffect(() => {
    reloadData();
    const unsub = posService.subscribe(reloadData);
    return () => unsub();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (paymentFilter !== 'all' && o.payment.method !== paymentFilter) return false;
    if (searchOrder.trim()) {
      const q = searchOrder.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.queueNumber.toLowerCase().includes(q) ||
        (o.tableNumber && o.tableNumber.includes(q))
      );
    }
    return true;
  });

  const lowStockCount = ingredients.filter(
    (i) => i.status === 'low_stock' || i.status === 'out_of_stock'
  ).length;

  const handleExportCSV = () => {
    const csvContent = posService.exportSalesCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `servin_sales_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const maxHourlyRev = Math.max(...analytics.hourlyData.map((h) => h.revenue), 100000);

  return (
    <div className="max-w-[1520px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      {/* Header & Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-slate-900">
            Executive Owner Dashboard
          </h2>
          <p className="text-xs text-slate-500">
            Real-time financial performance, bill-of-materials gross margin, and stock health
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Sales CSV</span>
          </button>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono tabular-nums font-black text-xl text-slate-900 truncate">
            {formatRupiah(analytics.totalRevenue)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>Settled volume</span>
          </span>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Bills</span>
            <ShoppingBag className="w-4 h-4 text-slate-600" />
          </div>
          <div className="font-mono tabular-nums font-black text-xl text-slate-900">
            {analytics.totalOrders}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Tickets fulfilled</span>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg. Ticket</span>
            <Layers className="w-4 h-4 text-slate-600" />
          </div>
          <div className="font-mono tabular-nums font-black text-xl text-slate-900 truncate">
            {formatRupiah(analytics.averageOrderValue)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Per transaction</span>
        </div>

        {/* Best-Selling Item */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Top Product</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-heading font-bold text-sm text-slate-900 truncate" title={analytics.bestSellingItem}>
            {analytics.bestSellingItem}
          </div>
          <span className="text-[11px] text-amber-600 font-semibold mt-1 block">
            Leader by volume
          </span>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className="font-mono tabular-nums font-black text-xl text-slate-900">
            {lowStockCount} <span className="text-xs font-normal text-slate-400">items</span>
          </div>
          <span className={`text-[11px] font-semibold mt-1 block ${lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {lowStockCount > 0 ? 'Reorder needed' : 'All optimal'}
          </span>
        </div>

        {/* Gross Margin % */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Gross Margin</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono tabular-nums font-black text-2xl text-emerald-700">
            {analytics.grossMarginPercent}%
          </div>
          <span className="text-[11px] text-slate-600 font-medium mt-1 truncate block font-mono">
            {formatRupiah(analytics.grossProfit)} profit
          </span>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Revenue by Hour (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900">Revenue by Operating Hour</h3>
              <p className="text-xs text-slate-500">Hourly revenue distribution for today's service</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
              Today's Flow
            </span>
          </div>

          <div className="h-60 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-100">
            {analytics.hourlyData.map((h) => {
              const heightPercent = maxHourlyRev > 0 ? Math.round((h.revenue / maxHourlyRev) * 100) : 0;
              const hasSales = h.revenue > 0;

              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-11 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap z-20 transition-opacity font-mono shadow-md">
                    <div className="font-bold">{h.hour} · {formatRupiah(h.revenue)}</div>
                    <div>{h.orderCount} order(s)</div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-t h-44 flex items-end justify-center">
                    <div
                      style={{ height: `${Math.max(hasSales ? 8 : 0, heightPercent)}%` }}
                      className={`w-full rounded-t transition-all duration-500 ${
                        hasSales ? 'bg-slate-900 group-hover:bg-amber-500' : 'bg-transparent'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-800">
                    {h.hour.slice(0, 2)}h
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Peak Hour Maximum</span>
            <span className="font-mono font-bold text-slate-900">{formatRupiah(maxHourlyRev)}</span>
          </div>
        </div>

        {/* Chart 2: Category Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-heading font-bold text-base text-slate-900">Sales by Category</h3>
              <PieChart className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500">Revenue split across catalog departments</p>
          </div>

          <div className="space-y-3 my-2">
            {analytics.categorySales.map((cat, idx) => {
              const colors = ['bg-slate-900', 'bg-amber-500', 'bg-blue-600', 'bg-emerald-600'];
              const pct = analytics.totalRevenue > 0 ? Math.round((cat.revenue / analytics.totalRevenue) * 100) : 0;
              return (
                <div key={cat.name} className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-800 font-semibold">{cat.name} ({cat.count} sold)</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {formatRupiah(cat.revenue)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${colors[idx % colors.length]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Catalog Distribution</span>
            <span className="font-semibold text-slate-800">{analytics.categorySales.length} Active Categories</span>
          </div>
        </div>

        {/* Chart 3: Best Sellers */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">Best-Selling Menu Rankings</h3>
            <p className="text-xs text-slate-500">Volume and revenue performance by dish</p>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {analytics.bestSellers.length === 0 ? (
              <div className="text-xs text-slate-400 py-8 text-center">No sales recorded yet.</div>
            ) : (
              analytics.bestSellers.map((item, index) => (
                <div
                  key={item.name}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                        index === 0
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : index === 1
                          ? 'bg-slate-300 text-slate-800'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500">{item.count} orders prepared</div>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {formatRupiah(item.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chart 4: Margin Economics */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">Bill of Materials (BOM) Economics</h3>
            <p className="text-xs text-slate-500">
              Accurate gross profit computed from raw ingredient deductions per order
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Total Net Sales Revenue:</span>
              <span className="font-mono font-bold text-slate-900">{formatRupiah(analytics.totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-center text-rose-600">
              <span>Raw Material Cost of Goods Sold (BOM):</span>
              <span className="font-mono font-bold">-{formatRupiah(analytics.totalEstimatedCOGS)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-heading font-extrabold text-sm text-emerald-700">
              <span>Gross Profit Margin:</span>
              <span className="font-mono text-base">{formatRupiah(analytics.grossProfit)} ({analytics.grossMarginPercent}%)</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            * Direct COGS calculation is automatically tied to recipe quantities assigned in the Admin console.
          </p>
        </div>
      </div>

      {/* Inventory Stock Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">Ingredient Stock Levels</h3>
            <p className="text-xs text-slate-500">
              Live supplies automatically reduced when kitchen completes orders
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono">
            {ingredients.length} Tracked Ingredients
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-500 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Ingredient Name</th>
                <th className="py-2.5 px-3">Current Balance</th>
                <th className="py-2.5 px-3">Min. Stock Alert</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Unit Cost</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ingredients.map((ing) => (
                <tr key={ing.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{ing.name}</td>
                  <td className="py-2.5 px-3 font-mono font-extrabold text-slate-900">
                    {formatNumber(ing.currentStock)} {ing.unit}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {formatNumber(ing.minStock)} {ing.unit}
                  </td>
                  <td className="py-2.5 px-3 uppercase text-slate-500">{ing.unit}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{formatRupiah(ing.costPerUnit)}</td>
                  <td className="py-2.5 px-3">
                    <StockStatusBadge status={ing.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">Recent Transactions</h3>
            <p className="text-xs text-slate-500">Filterable transaction ledger with payment details</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by ID or table..."
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
                className="px-3 py-1.5 pl-8 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              {(['all', 'cash', 'qris'] as const).map((pm) => (
                <button
                  key={pm}
                  onClick={() => setPaymentFilter(pm)}
                  className={`px-2.5 py-1 rounded-lg font-semibold uppercase transition-all cursor-pointer ${
                    paymentFilter === pm
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-500 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Queue</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Items Summary</th>
                <th className="py-2.5 px-3">Total Amount</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3">Kitchen Status</th>
                <th className="py-2.5 px-3">Stock Deducted?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{o.id}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{o.queueNumber}</td>
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
                    {o.stockDeducted ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Deducted ✓</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Pending Completion</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
