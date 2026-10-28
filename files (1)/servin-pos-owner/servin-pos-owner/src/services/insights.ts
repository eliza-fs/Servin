import type { Ingredient, Order } from '../types/pos';
import type { RecipeRow } from './inventoryApi';

const TIME_ZONE = 'Asia/Jakarta';
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

interface JakartaParts {
  hour: number;
  weekday: number; // 0 = Mon ... 6 = Sun
  dateKey: string; // YYYY-MM-DD
}

function toJakartaParts(date: Date): JakartaParts {
  const parts = dateFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return {
    hour: Number(get('hour')) % 24,
    weekday: WEEKDAY_LABELS.indexOf(get('weekday')),
    dateKey: get('year') + '-' + get('month') + '-' + get('day'),
  };
}

function shiftDateKey(dateKey: string, days: number): string {
  const d = new Date(dateKey + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(laterKey: string, earlierKey: string): number {
  return Math.round(
    (Date.parse(laterKey + 'T00:00:00Z') - Date.parse(earlierKey + 'T00:00:00Z')) / 86400000
  );
}

const activeOrders = (orders: Order[]): Order[] =>
  orders.filter((o) => o.kitchenStatus !== 'CANCELLED');

/* ------------------------------------------------------------------ */
/* 1. Bundling recommendations (market-basket analysis)                */
/* ------------------------------------------------------------------ */

export interface BundleSuggestion {
  idA: string;
  idB: string;
  nameA: string;
  nameB: string;
  together: number; // orders that contain both items
  support: number; // % of all orders containing both
  confidenceAB: number; // % of orders with A that also contain B
  confidenceBA: number; // % of orders with B that also contain A
  lift: number; // > 1 means they are ordered together more than by chance
  normalPrice: number;
  bundlePrice: number;
}

export function computeBundles(
  orders: Order[],
  minTogether = 5,
  limit = 6,
  discountPct = 10
): BundleSuggestion[] {
  const valid = activeOrders(orders);
  const totalOrders = valid.length;
  if (totalOrders === 0) return [];

  const itemOrderCount = new Map<string, number>();
  const pairCount = new Map<string, number>();
  const names = new Map<string, string>();
  const priceTotals = new Map<string, { sum: number; n: number }>();

  valid.forEach((o) => {
    o.items.forEach((item) => {
      if (!item.menuItemId) return;
      names.set(item.menuItemId, item.name);
      const entry = priceTotals.get(item.menuItemId) ?? { sum: 0, n: 0 };
      entry.sum += item.unitPrice + item.customizationTotal;
      entry.n += 1;
      priceTotals.set(item.menuItemId, entry);
    });

    const ids = Array.from(new Set(o.items.map((i) => i.menuItemId).filter(Boolean))).sort();
    ids.forEach((id) => itemOrderCount.set(id, (itemOrderCount.get(id) ?? 0) + 1));
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        const key = ids[a] + '||' + ids[b];
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  });

  const avgPrice = (id: string): number => {
    const entry = priceTotals.get(id);
    return entry && entry.n > 0 ? entry.sum / entry.n : 0;
  };

  const suggestions: BundleSuggestion[] = [];
  pairCount.forEach((together, key) => {
    if (together < minTogether) return;
    const [idA, idB] = key.split('||');
    const countA = itemOrderCount.get(idA) ?? 0;
    const countB = itemOrderCount.get(idB) ?? 0;
    if (countA === 0 || countB === 0) return;

    const lift = (together * totalOrders) / (countA * countB);
    if (lift <= 1) return;

    const normalPrice = avgPrice(idA) + avgPrice(idB);
    const bundlePrice = Math.round((normalPrice * (1 - discountPct / 100)) / 500) * 500;

    suggestions.push({
      idA,
      idB,
      nameA: names.get(idA) ?? idA,
      nameB: names.get(idB) ?? idB,
      together,
      support: (together / totalOrders) * 100,
      confidenceAB: (together / countA) * 100,
      confidenceBA: (together / countB) * 100,
      lift,
      normalPrice,
      bundlePrice,
    });
  });

  return suggestions.sort((x, y) => y.lift - x.lift || y.together - x.together).slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* 2. Quiet / peak hours                                               */
/* ------------------------------------------------------------------ */

export interface HourStat {
  hour: number;
  label: string;
  orders: number;
  avgPerDay: number;
  revenue: number;
  level: 'peak' | 'normal' | 'quiet';
}

export interface WeekdayStat {
  label: string;
  orders: number;
  avgPerDay: number;
}

export interface HourlyPattern {
  hours: HourStat[];
  weekdays: WeekdayStat[];
  quietRanges: string[];
  peakRanges: string[];
  observedDays: number;
  avgPerHour: number;
}

function toRanges(hours: number[]): string[] {
  const sorted = [...hours].sort((a, b) => a - b);
  const fmt = (h: number) => String(h).padStart(2, '0') + ':00';
  const ranges: string[] = [];
  let start = -1;
  let prev = -1;
  sorted.forEach((h) => {
    if (start === -1) {
      start = h;
      prev = h;
    } else if (h === prev + 1) {
      prev = h;
    } else {
      ranges.push(fmt(start) + '–' + fmt(prev + 1));
      start = h;
      prev = h;
    }
  });
  if (start !== -1) ranges.push(fmt(start) + '–' + fmt(prev + 1));
  return ranges;
}

export function computeHourlyPattern(orders: Order[], openHour = 8, closeHour = 21): HourlyPattern {
  const valid = activeOrders(orders);
  const dayKeys = new Set<string>();
  const weekdayDayKeys = WEEKDAY_LABELS.map(() => new Set<string>());
  const weekdayOrders = WEEKDAY_LABELS.map(() => 0);
  const hourOrders = new Map<number, number>();
  const hourRevenue = new Map<number, number>();

  valid.forEach((o) => {
    const p = toJakartaParts(new Date(o.createdAt));
    dayKeys.add(p.dateKey);
    if (p.weekday >= 0) {
      weekdayDayKeys[p.weekday].add(p.dateKey);
      weekdayOrders[p.weekday] += 1;
    }
    hourOrders.set(p.hour, (hourOrders.get(p.hour) ?? 0) + 1);
    hourRevenue.set(p.hour, (hourRevenue.get(p.hour) ?? 0) + o.totalAmount);
  });

  const observedDays = Math.max(1, dayKeys.size);

  const base: HourStat[] = [];
  for (let h = openHour; h <= closeHour; h++) {
    const count = hourOrders.get(h) ?? 0;
    base.push({
      hour: h,
      label: String(h).padStart(2, '0') + ':00',
      orders: count,
      avgPerDay: count / observedDays,
      revenue: hourRevenue.get(h) ?? 0,
      level: 'normal',
    });
  }

  const avgPerHour = base.reduce((sum, h) => sum + h.avgPerDay, 0) / Math.max(1, base.length);
  const levelOf = (value: number): HourStat['level'] =>
    value < avgPerHour * 0.6 ? 'quiet' : value > avgPerHour * 1.3 ? 'peak' : 'normal';

  const hours = base.map((h) => ({ ...h, level: levelOf(h.avgPerDay) }));

  const weekdays: WeekdayStat[] = WEEKDAY_LABELS.map((label, i) => ({
    label,
    orders: weekdayOrders[i],
    avgPerDay: weekdayOrders[i] / Math.max(1, weekdayDayKeys[i].size),
  }));

  return {
    hours,
    weekdays,
    quietRanges: toRanges(hours.filter((h) => h.level === 'quiet').map((h) => h.hour)),
    peakRanges: toRanges(hours.filter((h) => h.level === 'peak').map((h) => h.hour)),
    observedDays,
    avgPerHour,
  };
}

/* ------------------------------------------------------------------ */
/* 3. Predictive restock                                               */
/* ------------------------------------------------------------------ */

export interface RestockItem {
  ingredient: Ingredient;
  usage7: number; // average use per day, last 7 days
  usage30: number; // average use per day, last 30 days
  forecastPerDay: number; // blended forecast (60% recent, 40% monthly)
  trendPct: number; // last 7 days vs 30-day average
  daysLeft: number | null;
  runOutLabel: string | null;
  suggestedOrderQty: number;
  estimatedCost: number;
  level: 'critical' | 'soon' | 'ok' | 'overstock' | 'unused';
}

export interface RestockForecast {
  items: RestockItem[];
  totalCost: number;
  observedDays: number;
}

export function computeRestockForecast(
  orders: Order[],
  recipes: RecipeRow[],
  ingredients: Ingredient[],
  horizonDays = 7
): RestockForecast {
  const valid = activeOrders(orders);
  const today = toJakartaParts(new Date()).dateKey;
  const windowStart = shiftDateKey(today, -29);
  const sevenStart = shiftDateKey(today, -6);

  const recipesByMenu = new Map<string, RecipeRow[]>();
  recipes.forEach((r) => {
    const list = recipesByMenu.get(r.menuItemId) ?? [];
    list.push(r);
    recipesByMenu.set(r.menuItemId, list);
  });

  const total30 = new Map<string, number>();
  const total7 = new Map<string, number>();
  let earliest = today;

  valid.forEach((o) => {
    const key = toJakartaParts(new Date(o.createdAt)).dateKey;
    if (key < windowStart || key > today) return;
    if (key < earliest) earliest = key;

    o.items.forEach((item) => {
      (recipesByMenu.get(item.menuItemId) ?? []).forEach((r) => {
        const used = r.quantity * item.quantity;
        total30.set(r.ingredientId, (total30.get(r.ingredientId) ?? 0) + used);
        if (key >= sevenStart) {
          total7.set(r.ingredientId, (total7.get(r.ingredientId) ?? 0) + used);
        }
      });
    });
  });

  const observed30 = Math.min(30, Math.max(1, daysBetween(today, earliest) + 1));
  const observed7 = Math.min(7, observed30);

  let totalCost = 0;

  const items: RestockItem[] = ingredients.map((ingredient) => {
    const usage7 = (total7.get(ingredient.id) ?? 0) / observed7;
    const usage30 = (total30.get(ingredient.id) ?? 0) / observed30;
    const forecastPerDay = 0.6 * usage7 + 0.4 * usage30;
    const trendPct = usage30 > 0 ? (usage7 / usage30 - 1) * 100 : 0;
    const daysLeft = forecastPerDay > 0 ? ingredient.currentStock / forecastPerDay : null;

    let runOutLabel: string | null = null;
    if (daysLeft !== null) {
      const runOutKey = shiftDateKey(today, Math.floor(daysLeft));
      runOutLabel = new Date(runOutKey + 'T00:00:00Z').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
    }

    let suggestedOrderQty = 0;
    if (forecastPerDay > 0) {
      const needed = forecastPerDay * horizonDays + ingredient.minStock - ingredient.currentStock;
      if (needed > 0) {
        suggestedOrderQty =
          ingredient.unit === 'pcs' ? Math.ceil(needed) : Math.ceil(needed / 50) * 50;
      }
    }
    const estimatedCost = suggestedOrderQty * ingredient.costPerUnit;
    totalCost += estimatedCost;

    let level: RestockItem['level'];
    if (daysLeft === null) level = 'unused';
    else if (daysLeft < 3) level = 'critical';
    else if (daysLeft < 7) level = 'soon';
    else if (daysLeft > 21) level = 'overstock';
    else level = 'ok';

    return {
      ingredient,
      usage7,
      usage30,
      forecastPerDay,
      trendPct,
      daysLeft,
      runOutLabel,
      suggestedOrderQty,
      estimatedCost,
      level,
    };
  });

  const rank = (i: RestockItem): number =>
    i.daysLeft === null ? Number.MAX_SAFE_INTEGER : i.daysLeft;
  items.sort((a, b) => rank(a) - rank(b));

  return { items, totalCost, observedDays: observed30 };
}