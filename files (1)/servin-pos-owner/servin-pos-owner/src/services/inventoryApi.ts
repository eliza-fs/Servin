import { supabase } from '../lib/supabase';
import type { Ingredient } from '../types/pos';

export interface RecipeRow {
  menuItemId: string;
  ingredientId: string;
  quantity: number;
}

interface DbIngredientRow {
  id: string;
  name: string;
  unit: string;
  current_stock: number | string | null;
  min_stock: number | string | null;
  cost_per_unit: number | string | null;
  last_updated: string | null;
}

interface DbRecipeRow {
  menu_item_id: string;
  ingredient_id: string;
  quantity: number | string | null;
}

const toNumber = (value: number | string | null | undefined): number => Number(value ?? 0) || 0;

function stockStatus(current: number, min: number): Ingredient['status'] {
  if (current <= 0) return 'out_of_stock';
  if (current <= min) return 'low_stock';
  return 'normal';
}

export async function fetchIngredients(): Promise<Ingredient[]> {
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

export async function fetchRecipeItems(): Promise<RecipeRow[]> {
  const { data, error } = await supabase.from('recipe_items').select('*');
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbRecipeRow[]).map((row) => ({
    menuItemId: row.menu_item_id,
    ingredientId: row.ingredient_id,
    quantity: toNumber(row.quantity),
  }));
}