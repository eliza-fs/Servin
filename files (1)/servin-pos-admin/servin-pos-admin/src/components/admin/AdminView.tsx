import React, { useState, useEffect } from 'react';
import {
  User,
  Category,
  MenuItem,
  Ingredient,
  InventoryLog,
  UserRole,
  RecipeItem,
  UnitType,
} from '../../types/pos';
import { posService } from '../../services/posService';
import { formatRupiah, formatNumber, formatDateFull } from '../../utils/formatters';
import { StockStatusBadge } from '../common/StatusBadge';
import {
  ShieldCheck,
  Users,
  Grid,
  Coffee,
  Boxes,
  History,
  Settings as SettingsIcon,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sliders,
  DollarSign,
  Layers,
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'menu' | 'ingredients' | 'history' | 'users' | 'categories' | 'settings'
  >('menu');

  const [users, setUsers] = useState<User[]>(posService.getUsers());
  const [categories, setCategories] = useState<Category[]>(posService.getCategories());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(posService.getMenuItems());
  const [ingredients, setIngredients] = useState<Ingredient[]>(posService.getIngredients());
  const [logs, setLogs] = useState<InventoryLog[]>(posService.getInventoryLogs());
  const [settings, setSettings] = useState(posService.getSettings());

  // Modals
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<Partial<MenuItem> | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<Partial<Ingredient> | null>(null);
  const [stockAdjustModal, setStockAdjustModal] = useState<{
    ingredient: Ingredient;
    newStock: number;
    reason: 'Manual Stock Adjustment' | 'Restock';
    notes: string;
  } | null>(null);

  const [tempRecipe, setTempRecipe] = useState<RecipeItem[]>([]);

  const reloadData = () => {
    setUsers(posService.getUsers());
    setCategories(posService.getCategories());
    setMenuItems(posService.getMenuItems());
    setIngredients(posService.getIngredients());
    setLogs(posService.getInventoryLogs());
    setSettings(posService.getSettings());
  };

  useEffect(() => {
    reloadData();
    const unsub = posService.subscribe(reloadData);
    return () => unsub();
  }, []);

  const handleSaveUser = () => {
    if (!editingUser?.name || !editingUser?.username || !editingUser?.role) return;
    posService.saveUser({
      id: editingUser.id,
      name: editingUser.name,
      username: editingUser.username,
      role: editingUser.role,
      isActive: editingUser.isActive ?? true,
    });
    setEditingUser(null);
  };

  const handleSaveCategory = () => {
    if (!editingCategory?.name) return;
    posService.saveCategory({
      id: editingCategory.id,
      name: editingCategory.name,
      icon: editingCategory.icon || 'utensils',
    });
    setEditingCategory(null);
  };

  const handleSaveIngredient = () => {
    if (!editingIngredient?.name || !editingIngredient?.unit) return;
    posService.saveIngredient({
      id: editingIngredient.id,
      name: editingIngredient.name,
      currentStock: Number(editingIngredient.currentStock) || 0,
      minStock: Number(editingIngredient.minStock) || 0,
      unit: editingIngredient.unit as UnitType,
      costPerUnit: Number(editingIngredient.costPerUnit) || 0,
    });
    setEditingIngredient(null);
  };

  const handleApplyStockAdjustment = () => {
    if (!stockAdjustModal) return;
    posService.adjustIngredientStock(
      stockAdjustModal.ingredient.id,
      stockAdjustModal.newStock,
      stockAdjustModal.reason,
      'Admin Siti',
      stockAdjustModal.notes || 'Manual stock reconciliation'
    );
    setStockAdjustModal(null);
  };

  const openEditMenuItem = (item?: MenuItem) => {
    if (item) {
      setEditingMenuItem({ ...item });
      setTempRecipe(item.recipe ? [...item.recipe] : []);
    } else {
      setEditingMenuItem({
        name: '',
        categoryId: categories[0]?.id || '',
        price: 25000,
        description: '',
        image: '/src/assets/images/artisan_iced_latte_1791009498944.jpg',
        isAvailable: true,
        isActive: true,
      });
      setTempRecipe([]);
    }
  };

  const addIngredientToRecipe = (ingredientId: string, quantity: number) => {
    setTempRecipe((prev) => {
      const idx = prev.findIndex((r) => r.ingredientId === ingredientId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx].quantity = quantity;
        return copy;
      }
      return [...prev, { ingredientId, quantity }];
    });
  };

  const removeIngredientFromRecipe = (ingredientId: string) => {
    setTempRecipe((prev) => prev.filter((r) => r.ingredientId !== ingredientId));
  };

  const handleSaveMenuItem = () => {
    if (!editingMenuItem?.name || !editingMenuItem?.categoryId || !editingMenuItem?.price) return;
    posService.saveMenuItem({
      ...editingMenuItem,
      name: editingMenuItem.name,
      categoryId: editingMenuItem.categoryId,
      price: Number(editingMenuItem.price),
      recipe: tempRecipe,
    });
    setEditingMenuItem(null);
  };

  return (
    <div className="max-w-[1520px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      {/* Header & Subnav */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-slate-900">
            System Administration & BOM Master
          </h2>
          <p className="text-xs text-slate-500">
            Configure catalog recipes, raw inventory thresholds, staff privileges, and audit records
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {[
            { id: 'menu', label: 'Menu & Recipes (BOM)', icon: <Coffee className="w-3.5 h-3.5" /> },
            { id: 'ingredients', label: 'Raw Ingredients', icon: <Boxes className="w-3.5 h-3.5" /> },
            { id: 'history', label: 'Audit Trail', icon: <History className="w-3.5 h-3.5" /> },
            { id: 'users', label: 'Staff Roles', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'categories', label: 'Categories', icon: <Grid className="w-3.5 h-3.5" /> },
            { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB: MENU & RECIPES (BOM) */}
      {/* ========================================================= */}
      {activeTab === 'menu' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900">
                Menu Catalog & Bill of Materials (BOM)
              </h3>
              <p className="text-xs text-slate-500">
                Assign ingredient recipes deducted automatically when tickets reach COMPLETED
              </p>
            </div>
            <button
              onClick={() => openEditMenuItem()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-heading font-bold hover:bg-slate-800 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Menu Item</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => {
              const category = categories.find((c) => c.id === item.categoryId);
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-heading font-bold text-sm text-slate-900 truncate">
                            {item.name}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold shrink-0">
                            {category?.name || 'Drink'}
                          </span>
                        </div>
                        <div className="font-mono tabular-nums font-bold text-sm text-slate-900 mt-0.5">
                          {formatRupiah(item.price)}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* BOM Recipe Table */}
                    <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200 text-xs">
                      <div className="font-bold text-slate-900 text-[11px] mb-1.5 flex items-center justify-between">
                        <span>Recipe Bill of Materials:</span>
                        <span className="text-amber-600 font-mono">
                          {item.recipe?.length || 0} ingredients
                        </span>
                      </div>
                      {item.recipe && item.recipe.length > 0 ? (
                        <div className="space-y-1">
                          {item.recipe.map((r) => {
                            const ing = ingredients.find((i) => i.id === r.ingredientId);
                            return (
                              <div key={r.ingredientId} className="flex justify-between text-[11px] text-slate-600">
                                <span>• {ing?.name || r.ingredientId}</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {r.quantity} {ing?.unit}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No recipe ingredients assigned.</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => posService.toggleMenuItemAvailability(item.id)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          item.isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.isAvailable ? 'Available' : 'Sold Out'}
                      </button>
                      <button
                        onClick={() => posService.toggleMenuItemActive(item.id)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          item.isActive
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditMenuItem(item)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 cursor-pointer"
                        title="Edit Item & Recipe"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete menu item "${item.name}"?`)) {
                            posService.deleteMenuItem(item.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: RAW INGREDIENTS */}
      {/* ========================================================= */}
      {activeTab === 'ingredients' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900">
                Raw Ingredients & Inventory Master
              </h3>
              <p className="text-xs text-slate-500">
                Inventory stocks deducted per order recipe with low-stock alerts
              </p>
            </div>
            <button
              onClick={() =>
                setEditingIngredient({
                  name: '',
                  unit: 'g',
                  currentStock: 1000,
                  minStock: 200,
                  costPerUnit: 50,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-heading font-bold hover:bg-slate-800 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Raw Ingredient</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Ingredient</th>
                  <th className="py-2.5 px-3">Current Balance</th>
                  <th className="py-2.5 px-3">Min. Stock Alert</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3">Unit Cost (Rp)</th>
                  <th className="py-2.5 px-3">Health Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ingredients.map((ing) => (
                  <tr key={ing.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{ing.name}</td>
                    <td className="py-2.5 px-3 font-mono font-black text-sm text-slate-900">
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
                    <td className="py-2.5 px-3 text-right space-x-1.5">
                      <button
                        onClick={() =>
                          setStockAdjustModal({
                            ingredient: ing,
                            newStock: ing.currentStock,
                            reason: 'Manual Stock Adjustment',
                            notes: '',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-semibold text-[11px] hover:bg-slate-800 cursor-pointer"
                      >
                        Adjust Stock
                      </button>
                      <button
                        onClick={() => setEditingIngredient(ing)}
                        className="p-1 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                        title="Edit Ingredient"
                      >
                        <Edit2 className="w-3.5 h-3.5 inline" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ingredient "${ing.name}"?`)) {
                            posService.deleteIngredient(ing.id);
                          }
                        }}
                        className="p-1 rounded text-rose-600 hover:text-rose-800 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: AUDIT LOG */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">
              Inventory Transaction Audit Trail
            </h3>
            <p className="text-xs text-slate-500">
              Automatic deduction history per kitchen ticket completion and manual corrections
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Ingredient</th>
                  <th className="py-2.5 px-3">Quantity Delta</th>
                  <th className="py-2.5 px-3">Before Stock</th>
                  <th className="py-2.5 px-3">After Stock</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Reference / Order ID</th>
                  <th className="py-2.5 px-3">Performer Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No logs recorded yet. Complete an order in Kitchen to test automatic deduction!
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500 font-mono whitespace-nowrap">
                        {formatDateFull(log.timestamp)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{log.ingredientName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                        {log.changeQuantity < 0 ? (
                          <span className="text-rose-600">
                            {formatNumber(log.changeQuantity)} {log.unit}
                          </span>
                        ) : (
                          <span className="text-emerald-600">
                            +{formatNumber(log.changeQuantity)} {log.unit}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {formatNumber(log.beforeStock)} {log.unit}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {formatNumber(log.afterStock)} {log.unit}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.reason === 'Order Completion'
                              ? 'bg-blue-100 text-blue-800'
                              : log.reason === 'Manual Stock Adjustment'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {log.reason}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {log.referenceId || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{log.performedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: STAFF USERS */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900">Staff Credentials & Roles</h3>
              <p className="text-xs text-slate-500">Manage cashier, chef, owner, and administrator accounts</p>
            </div>
            <button
              onClick={() =>
                setEditingUser({
                  name: '',
                  username: '',
                  role: 'cashier',
                  isActive: true,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-heading font-bold hover:bg-slate-800 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base overflow-hidden">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      u.name[0]
                    )}
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-slate-900">{u.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">@{u.username}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-800">
                      {u.role}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <button
                    onClick={() => posService.toggleUserActive(u.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Suspended'}
                  </button>

                  <button
                    onClick={() => setEditingUser(u)}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                    title="Edit user"
                  >
                    <Edit2 className="w-3.5 h-3.5 inline" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: CATEGORIES */}
      {/* ========================================================= */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900">Menu Categories</h3>
              <p className="text-xs text-slate-500">Group drinks, meals, and snacks for quick filtering</p>
            </div>
            <button
              onClick={() => setEditingCategory({ name: '', icon: 'utensils', order: categories.length + 1 })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-heading font-bold hover:bg-slate-800 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-heading font-bold text-sm text-slate-900">{cat.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">Order Index: #{cat.order}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingCategory(cat)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete category "${cat.name}"?`)) {
                        posService.deleteCategory(cat.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: SETTINGS */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 max-w-xl">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">Branch Configuration</h3>
            <p className="text-xs text-slate-500">Outlet profile, tax rules, and receipt headers</p>
          </div>

          <div className="space-y-4 text-xs text-slate-700">
            <div>
              <label className="font-bold block mb-1">Outlet Brand Name</label>
              <input
                type="text"
                value={settings.restaurantName}
                onChange={(e) => posService.updateSettings({ restaurantName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="font-bold block mb-1">Location Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => posService.updateSettings({ address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="font-bold block mb-1">Phone Hotline</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => posService.updateSettings({ phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Apply 10% Restaurant Tax (PB1)</span>
                <span className="text-slate-400 text-[11px]">Calculate tax at order settlement</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableTax}
                onChange={(e) =>
                  posService.updateSettings({
                    enableTax: e.target.checked,
                    taxRatePercent: e.target.checked ? 10 : 0,
                  })
                }
                className="w-4 h-4 accent-slate-900 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT / ADD MENU & BOM RECIPE */}
      {/* ========================================================= */}
      {editingMenuItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-3">
              {editingMenuItem.id ? 'Edit Product & Recipe BOM' : 'Create Product & Recipe'}
            </h3>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Item Title</label>
                  <input
                    type="text"
                    value={editingMenuItem.name || ''}
                    onChange={(e) => setEditingMenuItem({ ...editingMenuItem, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900"
                    placeholder="e.g. Iced Latte"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Category</label>
                  <select
                    value={editingMenuItem.categoryId || ''}
                    onChange={(e) =>
                      setEditingMenuItem({ ...editingMenuItem, categoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Selling Price (Rp)</label>
                  <input
                    type="number"
                    value={editingMenuItem.price || 0}
                    onChange={(e) =>
                      setEditingMenuItem({ ...editingMenuItem, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Photo Image URL</label>
                  <input
                    type="text"
                    value={editingMenuItem.image || ''}
                    onChange={(e) => setEditingMenuItem({ ...editingMenuItem, image: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Menu Description</label>
                <textarea
                  rows={2}
                  value={editingMenuItem.description || ''}
                  onChange={(e) =>
                    setEditingMenuItem({ ...editingMenuItem, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Recipe BOM Builder */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-heading font-bold text-xs text-slate-900 block">
                  Bill of Materials (BOM) — Ingredients deducted when COMPLETED
                </span>

                <div className="space-y-2">
                  {tempRecipe.map((rec) => {
                    const ing = ingredients.find((i) => i.id === rec.ingredientId);
                    return (
                      <div
                        key={rec.ingredientId}
                        className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs"
                      >
                        <span className="font-semibold text-slate-800 flex-1">
                          {ing?.name || rec.ingredientId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={rec.quantity}
                            onChange={(e) =>
                              addIngredientToRecipe(rec.ingredientId, Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 rounded border border-slate-200 text-xs font-mono font-bold text-right"
                          />
                          <span className="text-slate-500 w-8">{ing?.unit}</span>
                          <button
                            type="button"
                            onClick={() => removeIngredientFromRecipe(rec.ingredientId)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-200 flex gap-2">
                  <select
                    id="add-recipe-select-box"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    {ingredients
                      .filter((i) => !tempRecipe.some((r) => r.ingredientId === i.id))
                      .map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const select = document.getElementById(
                        'add-recipe-select-box'
                      ) as HTMLSelectElement;
                      if (select?.value) {
                        addIngredientToRecipe(select.value, 15);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
                  >
                    + Add Ingredient
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingMenuItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMenuItem}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-heading font-bold hover:bg-slate-800 cursor-pointer"
              >
                Save Product & Recipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MANUAL STOCK ADJUSTMENT WITH AUDIT REASON */}
      {/* ========================================================= */}
      {stockAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-1">
              Manual Stock Adjustment
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              {stockAdjustModal.ingredient.name} (Current: {stockAdjustModal.ingredient.currentStock}{' '}
              {stockAdjustModal.ingredient.unit})
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">New Balance:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={stockAdjustModal.newStock}
                    onChange={(e) =>
                      setStockAdjustModal({
                        ...stockAdjustModal,
                        newStock: Number(e.target.value),
                      })
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold"
                  />
                  <span className="font-bold text-slate-500 uppercase">
                    {stockAdjustModal.ingredient.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Reason for Adjustment:</label>
                <select
                  value={stockAdjustModal.reason}
                  onChange={(e) =>
                    setStockAdjustModal({
                      ...stockAdjustModal,
                      reason: e.target.value as 'Manual Stock Adjustment' | 'Restock',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Manual Stock Adjustment">Manual Reconciliation (Discrepancy)</option>
                  <option value="Restock">Supplier Restock (Arrival)</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Audit Reference / Note:</label>
                <input
                  type="text"
                  placeholder="e.g. Physical inventory check / Invoice #9281"
                  value={stockAdjustModal.notes}
                  onChange={(e) =>
                    setStockAdjustModal({
                      ...stockAdjustModal,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setStockAdjustModal(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyStockAdjustment}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-heading font-bold hover:bg-slate-800 cursor-pointer"
              >
                Apply & Record Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT / ADD INGREDIENT */}
      {/* ========================================================= */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-3">
              {editingIngredient.id ? 'Edit Ingredient' : 'Add Raw Ingredient'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Ingredient Name</label>
                <input
                  type="text"
                  value={editingIngredient.name || ''}
                  onChange={(e) =>
                    setEditingIngredient({ ...editingIngredient, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Unit</label>
                  <select
                    value={editingIngredient.unit || 'g'}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        unit: e.target.value as UnitType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="slice">Slices</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Cost / Unit (Rp)</label>
                  <input
                    type="number"
                    value={editingIngredient.costPerUnit || 0}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        costPerUnit: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Current Balance</label>
                  <input
                    type="number"
                    value={editingIngredient.currentStock || 0}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        currentStock: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Min. Stock Alert</label>
                  <input
                    type="number"
                    value={editingIngredient.minStock || 0}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        minStock: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingIngredient(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveIngredient}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-heading font-bold cursor-pointer"
              >
                Save Ingredient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT / ADD USER */}
      {/* ========================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-3">
              {editingUser.id ? 'Edit Staff User' : 'Add Staff Member'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="e.g. Budi Santoso"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Username</label>
                <input
                  type="text"
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="e.g. budi_cashier"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Assigned Role</label>
                <select
                  value={editingUser.role || 'cashier'}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value as UserRole })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white capitalize"
                >
                  <option value="cashier">Cashier</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-heading font-bold cursor-pointer"
              >
                Save Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT / ADD CATEGORY */}
      {/* ========================================================= */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-3">
              {editingCategory.id ? 'Edit Category' : 'Add Category'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Category Title</label>
                <input
                  type="text"
                  value={editingCategory.name || ''}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="e.g. Pastry & Bakery"
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-heading font-bold cursor-pointer"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
