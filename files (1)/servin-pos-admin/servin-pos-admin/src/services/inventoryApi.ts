import { supabase } from '../lib/supabase';
import type { Ingredient, InventoryLog } from '../types/pos';

interface DbIngredientRow {
  id: string;
  name: string;
  unit: string;
  current_stock: number | string | null;
  min_stock: number | string | null;
  cost_per_unit: number | string | null;
  last_updated: string | null;
}

interface DbLogRow {
  id: number | string;
  ingredient_id: string;
  change_quantity: number | string | null;
  stock_before: number | string | null;
  stock_after: number | string | null;
  reason: string;
  note: string | null;
  created_at: string;
  ingredients?: { name: string; unit: string } | { name: string; unit: string }[] | null;
  profiles?: { name: string } | { name: string }[] | null;
}

const toNumber = (value: number | string | null | undefined): number => Number(value ?? 0) || 0;

function one<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export function stockStatus(current: number, min: number): Ingredient['status'] {
  if (current <= 0) return 'out_of_stock';
  if (current <= min) return 'low_stock';
  return 'normal';
}

export async function fetchIngredientsFromDb(): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbIngredientRow[]).map((row) => {
    const currentStock = toNumber(row.current_stock);
    const minStock = toNumber(row.min_stock);
    return {
      id: row.id,
      name: row.name,
      currentStock,
      minStock,
      unit: row.unit as Ingredient['unit'],
      costPerUnit: toNumber(row.cost_per_unit),
      status: stockStatus(currentStock, minStock),
      lastUpdated: row.last_updated ?? new Date().toISOString(),
    };
  });
}

export async function fetchInventoryLogsFromDb(limit = 200): Promise<InventoryLog[]> {
  const { data, error } = await supabase
    .from('inventory_logs')
    .select('*, ingredients(name, unit), profiles(name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbLogRow[]).map((row) => {
    const ing = one(row.ingredients);
    const by = one(row.profiles);
    return {
      id: 'log-' + String(row.id),
      timestamp: row.created_at,
      ingredientId: row.ingredient_id,
      ingredientName: ing?.name ?? row.ingredient_id,
      changeQuantity: toNumber(row.change_quantity),
      beforeStock: toNumber(row.stock_before),
      afterStock: toNumber(row.stock_after),
      unit: (ing?.unit ?? 'g') as InventoryLog['unit'],
      reason: row.reason as InventoryLog['reason'],
      referenceId: row.note ?? undefined,
      performedBy: by?.name ?? 'Staff',
    };
  });
}

/** Adds or removes stock through the database function (admin and owner only, logged). */
export async function adjustStockInDb(
  ingredientId: string,
  change: number,
  reason: 'Manual Stock Adjustment' | 'Restock',
  note?: string
): Promise<number> {
  const { data, error } = await supabase.rpc('adjust_ingredient_stock', {
    p_ingredient_id: ingredientId,
    p_change: change,
    p_reason: reason,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
  return toNumber(data as number | string | null);
}

/** The admin screen sets an absolute stock value; convert it to a change against the live database value. */
export async function setStockInDb(
  ingredientId: string,
  newStock: number,
  reason: 'Manual Stock Adjustment' | 'Restock',
  note?: string
): Promise<number> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('current_stock')
    .eq('id', ingredientId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('This ingredient is not in the database yet.');

  const current = toNumber((data as { current_stock: number | string | null }).current_stock);
  const diff = Math.round((newStock - current) * 100) / 100;
  if (diff === 0) return current;

  return adjustStockInDb(ingredientId, diff, reason, note);
}

export async function deleteIngredientInDb(id: string): Promise<void> {
  const { error } = await supabase.from('ingredients').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface IngredientInput {
    id?: string;
    name: string;
    unit: Ingredient['unit'];
    currentStock: number;
    minStock: number;
    costPerUnit: number;
  }
  
  /** Creates a new ingredient or updates an existing one. Stock changes on existing ingredients are logged. */
  export async function saveIngredientInDb(input: IngredientInput): Promise<string> {
    const fields = {
      name: input.name,
      unit: input.unit,
      min_stock: input.minStock,
      cost_per_unit: input.costPerUnit,
    };
  
    let existingId: string | null = null;
    if (input.id) {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id')
        .eq('id', input.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      existingId = data ? (data as { id: string }).id : null;
    }
  
    if (!existingId) {
      const newId = input.id ?? 'ing-' + Date.now().toString(36);
      const { error } = await supabase.from('ingredients').insert({
        id: newId,
        ...fields,
        current_stock: Math.max(0, input.currentStock),
      });
      if (error) throw new Error(error.message);
      return newId;
    }
  
    const { error } = await supabase
      .from('ingredients')
      .update({ ...fields, last_updated: new Date().toISOString() })
      .eq('id', existingId);
    if (error) throw new Error(error.message);
  
    await setStockInDb(existingId, input.currentStock, 'Manual Stock Adjustment', 'Edited from the ingredient form');
    return existingId;
  }