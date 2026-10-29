import React, { useMemo, useState } from 'react';
import { AlertTriangle, Clock, Lightbulb, Package, TrendingDown, TrendingUp } from 'lucide-react';
import type { Ingredient, Order } from '../../types/pos';
import type { RecipeRow } from '../../services/inventoryApi';
import {
  computeBundles,
  computeHourlyPattern,
  computeRestockForecast,
  type RestockItem,
} from '../../services/insights';
import { formatNumber, formatRupiah } from '../../utils/formatters';

interface InsightsPanelProps {
  orders: Order[];
  ingredients: Ingredient[];
  recipes: RecipeRow[];
  loading: boolean;
}

const LEVEL_STYLE: Record<RestockItem['level'], { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  soon: { label: 'Order soon', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  ok: { label: 'Safe', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  overstock: { label: 'Overstock', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  unused: { label: 'No usage', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  orders,
  ingredients,
  recipes,
  loading,
}) => {
  const [horizon, setHorizon] = useState(7);

  const bundles = useMemo(() => computeBundles(orders), [orders]);
  const pattern = useMemo(() => computeHourlyPattern(orders), [orders]);
  const restock = useMemo(
    () => computeRestockForecast(orders, recipes, ingredients, horizon),
    [orders, recipes, ingredients, horizon]
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Loading insights...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        No orders yet. Insights appear once there is sales history.
      </div>
    );
  }

  const topBundle = bundles[0];
  const urgentItems = restock.items.filter((i) => i.level === 'critical' || i.level === 'soon');
  const maxHour = Math.max(...pattern.hours.map((h) => h.avgPerDay), 0.1);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-extrabold text-xl text-slate-900">
          Market Trend & Smart Insights
        </h2>
        <p className="text-xs text-slate-500">
          Based on {orders.length} orders across {pattern.observedDays} active days. All times are WIB.
        </p>
      </div>

      {/* Headline cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Best bundle</span>
          </div>
          {topBundle ? (
            <>
              <div className="font-heading font-bold text-sm text-slate-900">
                {topBundle.nameA} + {topBundle.nameB}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Ordered together {topBundle.together} times, {topBundle.lift.toFixed(1)}x more often than chance.
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500">Not enough data yet.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <Clock className="w-4 h-4 text-rose-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Quiet hours</span>
          </div>
          <div className="font-heading font-bold text-sm text-slate-900">
            {pattern.quietRanges.length > 0 ? pattern.quietRanges.join(', ') : 'No clearly quiet hours'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {pattern.peakRanges.length > 0
              ? 'Peak: ' + pattern.peakRanges.join(', ')
              : 'No clear peak hours'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <Package className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Restock alert</span>
          </div>
          {urgentItems.length > 0 ? (
            <>
              <div className="font-heading font-bold text-sm text-slate-900">
                {urgentItems.length} ingredient(s) need ordering soon
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {urgentItems[0].ingredient.name} runs out in about{' '}
                {urgentItems[0].daysLeft !== null ? urgentItems[0].daysLeft.toFixed(1) : '-'} days.
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500">Stock levels look healthy for the next week.</p>
          )}
        </div>
      </div>

      {/* Bundling */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div>
          <h3 className="font-heading font-bold text-base text-slate-900">Bundling Recommendations</h3>
          <p className="text-xs text-slate-500">
            Menu pairs that customers order together more often than chance. Suggested bundle price
            includes a 10% discount.
          </p>
        </div>

        {bundles.length === 0 ? (
          <div className="text-xs text-slate-400 py-6 text-center">
            No strong pairs found yet. More orders are needed.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Bundle</th>
                  <th className="py-2.5 px-3">Orders together</th>
                  <th className="py-2.5 px-3">Share of orders</th>
                  <th className="py-2.5 px-3">If A, then B</th>
                  <th className="py-2.5 px-3">If B, then A</th>
                  <th className="py-2.5 px-3">Lift</th>
                  <th className="py-2.5 px-3">Normal price</th>
                  <th className="py-2.5 px-3">Suggested bundle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bundles.map((b) => (
                  <tr key={b.idA + b.idB} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {b.nameA} + {b.nameB}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{b.together}</td>
                    <td className="py-2.5 px-3 font-mono">{b.support.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-mono">{b.confidenceAB.toFixed(0)}%</td>
                    <td className="py-2.5 px-3 font-mono">{b.confidenceBA.toFixed(0)}%</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{b.lift.toFixed(2)}x</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{formatRupiah(b.normalPrice)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{formatRupiah(b.bundlePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quiet hours */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div>
          <h3 className="font-heading font-bold text-base text-slate-900">Traffic by Hour</h3>
          <p className="text-xs text-slate-500">
            Average orders per hour per day. Hours well below average are promo opportunities.
          </p>
        </div>

        <div className="h-44 flex items-end gap-2 pt-4 px-1 border-b border-slate-100">
          {pattern.hours.map((h) => {
            const pct = Math.round((h.avgPerDay / maxHour) * 100);
            const color =
              h.level === 'peak' ? 'bg-brand-strong' : h.level === 'quiet' ? 'bg-rose-300' : 'bg-brand';
            return (
              <div
                key={h.hour}
                className="flex-1 flex flex-col items-center gap-1"
                title={h.label + ': ' + h.avgPerDay.toFixed(1) + ' orders/day, ' + formatRupiah(h.revenue)}
              >
                <div className="w-full h-32 flex items-end">
                  <div style={{ height: Math.max(4, pct) + '%' }} className={'w-full rounded-t ' + color} />
                </div>
                <span className="text-[10px] font-mono text-slate-400">{String(h.hour).padStart(2, '0')}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-brand-strong" /> Peak
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-brand" /> Normal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-300" /> Quiet
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-900">
            <div className="font-bold mb-0.5">Promo opportunity</div>
            {pattern.quietRanges.length > 0
              ? 'Orders drop during ' +
                pattern.quietRanges.join(', ') +
                '. Consider a happy-hour discount or a bundle deal in this window.'
              : 'No quiet window found. Traffic is fairly even through the day.'}
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-900">
            <div className="font-bold mb-0.5">Staffing and prep</div>
            {pattern.peakRanges.length > 0
              ? 'Busiest during ' +
                pattern.peakRanges.join(', ') +
                '. Prepare ingredients and staff ahead of these hours.'
              : 'No clear peak window found.'}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-1">
          {pattern.weekdays.map((d) => (
            <div key={d.label} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">{d.label}</div>
              <div className="font-mono font-bold text-sm text-slate-900">{d.avgPerDay.toFixed(0)}</div>
              <div className="text-[10px] text-slate-400">orders/day</div>
            </div>
          ))}
        </div>
      </div>

      {/* Predictive restock */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">Predictive Restock</h3>
            <p className="text-xs text-slate-500">
              Forecast of when each ingredient runs out, based on recipe usage in recent sales.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {[7, 14].map((d) => (
              <button
                key={d}
                onClick={() => setHorizon(d)}
                className={
                  'px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-all ' +
                  (horizon === d ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900')
                }
              >
                Buy for {d} days
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-500 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Ingredient</th>
                <th className="py-2.5 px-3">Stock now</th>
                <th className="py-2.5 px-3">Forecast use/day</th>
                <th className="py-2.5 px-3">Trend (7d vs 30d)</th>
                <th className="py-2.5 px-3">Days left</th>
                <th className="py-2.5 px-3">Runs out</th>
                <th className="py-2.5 px-3">Suggested order</th>
                <th className="py-2.5 px-3">Est. cost</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {restock.items.map((r) => (
                <tr key={r.ingredient.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{r.ingredient.name}</td>
                  <td className="py-2.5 px-3 font-mono">
                    {formatNumber(Math.round(r.ingredient.currentStock))} {r.ingredient.unit}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {formatNumber(Math.round(r.forecastPerDay))} {r.ingredient.unit}
                  </td>
                  <td className="py-2.5 px-3">
                    {r.trendPct > 5 ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                        <TrendingUp className="w-3.5 h-3.5" /> +{r.trendPct.toFixed(0)}%
                      </span>
                    ) : r.trendPct < -5 ? (
                      <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                        <TrendingDown className="w-3.5 h-3.5" /> {r.trendPct.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-slate-400">stable</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {r.daysLeft === null ? '-' : r.daysLeft.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{r.runOutLabel ?? '-'}</td>
                  <td className="py-2.5 px-3 font-mono">
                    {r.suggestedOrderQty > 0
                      ? formatNumber(r.suggestedOrderQty) + ' ' + r.ingredient.unit
                      : '-'}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {r.estimatedCost > 0 ? formatRupiah(r.estimatedCost) : '-'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ' +
                        LEVEL_STYLE[r.level].className
                      }
                    >
                      {(r.level === 'critical' || r.level === 'soon') && <AlertTriangle className="w-3 h-3" />}
                      {LEVEL_STYLE[r.level].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span>Estimated shopping total for the next {horizon} days</span>
          <span className="font-mono font-extrabold text-sm text-slate-900">{formatRupiah(restock.totalCost)}</span>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-[11px] text-slate-500 space-y-1">
        <div className="font-semibold text-slate-700">How these numbers are calculated</div>
        <p>
          Bundles: for every pair of menu items, we compare how often they appear in the same order with how often
          that would happen by chance (lift). Pairs with lift above 1 and at least 5 shared orders are shown.
        </p>
        <p>
          Quiet hours: orders per hour per active day. Below 60% of the daily hourly average is quiet, above 130% is peak.
        </p>
        <p>
          Restock: daily ingredient use is orders multiplied by recipe quantities. The forecast blends the last 7 days
          (60%) with the last 30 days (40%). Days left is current stock divided by the forecast. Suggested order covers the
          chosen period plus the minimum stock buffer.
        </p>
      </div>
    </div>
  );
};