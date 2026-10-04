/**
 * Servin Coffee & Kitchen - Data & Service Layer (Owner app)
 *
 * Role-scoped version of the original central posService.
 * - Identical in every role app: storage keys + seed data + core (init, subscribe, reset, users),
 *   so each app can boot on its own and all apps share the same data contract.
 * - Specific to this role: read-only analytics: getSalesAnalytics, exportSalesCSV and read access to orders / ingredients.
 */

import {
  User,
  Category,
  Ingredient,
  MenuItem,
  Order,
  InventoryLog,
  POSSettings,
} from '../types/pos';

// Keys for localStorage
const STORAGE_KEYS = {
  USERS: 'servin_pos_users',
  CATEGORIES: 'servin_pos_categories',
  INGREDIENTS: 'servin_pos_ingredients',
  MENU_ITEMS: 'servin_pos_menu_items',
  ORDERS: 'servin_pos_orders',
  INVENTORY_LOGS: 'servin_pos_inventory_logs',
  SETTINGS: 'servin_pos_settings',
};

// Initial Sample Ingredients
const INITIAL_INGREDIENTS: Ingredient[] = [
  {
    id: 'ing-coffee',
    name: 'Coffee Beans (Arabica Blend)',
    currentStock: 5000,
    minStock: 1000,
    unit: 'g',
    costPerUnit: 120, // Rp 120 / gram
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-milk',
    name: 'Fresh Milk',
    currentStock: 8000,
    minStock: 2000,
    unit: 'ml',
    costPerUnit: 22, // Rp 22 / ml
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-sugar',
    name: 'Liquid Sugar / Simple Syrup',
    currentStock: 3000,
    minStock: 500,
    unit: 'g',
    costPerUnit: 15, // Rp 15 / g
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-ice',
    name: 'Ice Cubes',
    currentStock: 15000,
    minStock: 3000,
    unit: 'g',
    costPerUnit: 4, // Rp 4 / g
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-matcha',
    name: 'Matcha Uji Powder',
    currentStock: 1200,
    minStock: 400,
    unit: 'g',
    costPerUnit: 290, // Rp 290 / g
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-vanilla',
    name: 'Vanilla Syrup',
    currentStock: 1800,
    minStock: 500,
    unit: 'ml',
    costPerUnit: 90, // Rp 90 / ml
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-caramel',
    name: 'Caramel Drizzle & Sauce',
    currentStock: 1400,
    minStock: 450,
    unit: 'ml',
    costPerUnit: 110, // Rp 110 / ml
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-rice',
    name: 'Fluffy Jasmine Rice',
    currentStock: 7500,
    minStock: 2000,
    unit: 'g',
    costPerUnit: 16, // Rp 16 / g
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-chicken',
    name: 'Chicken Fillet (Marinated)',
    currentStock: 4200,
    minStock: 1200,
    unit: 'g',
    costPerUnit: 48, // Rp 48 / g
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-sauce',
    name: 'Special Teriyaki Glaze Sauce',
    currentStock: 2200,
    minStock: 600,
    unit: 'ml',
    costPerUnit: 42, // Rp 42 / ml
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-potatoes',
    name: 'Crispy Shoestring Potatoes',
    currentStock: 3600,
    minStock: 1000,
    unit: 'g',
    costPerUnit: 32, // Rp 32 / g
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-seasoning',
    name: 'Sea Salt & Herb Seasoning',
    currentStock: 950,
    minStock: 250,
    unit: 'g',
    costPerUnit: 55, // Rp 55 / g
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-croissant',
    name: 'Artisan Croissant Dough',
    currentStock: 28,
    minStock: 10,
    unit: 'pcs',
    costPerUnit: 7500, // Rp 7,500 / pcs
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-butter',
    name: 'French Butter',
    currentStock: 1100,
    minStock: 300,
    unit: 'g',
    costPerUnit: 120, // Rp 120 / g
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ing-oil',
    name: 'Premium Cooking Oil',
    currentStock: 4800,
    minStock: 1200,
    unit: 'ml',
    costPerUnit: 18, // Rp 18 / ml
    status: 'normal',
    lastUpdated: new Date().toISOString(),
  },
];

// Initial Categories
const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-coffee', name: 'Coffee', icon: 'coffee', order: 1 },
  { id: 'cat-noncoffee', name: 'Non-Coffee', icon: 'cup-soda', order: 2 },
  { id: 'cat-main', name: 'Main Course', icon: 'utensils', order: 3 },
  { id: 'cat-snack', name: 'Snacks & Pastry', icon: 'croissant', order: 4 },
];

// Standard Customization Presets
const BEVERAGE_CUSTOMIZATIONS = {
  sizes: [
    { name: 'Regular (12oz)', priceDelta: 0 },
    { name: 'Large (16oz)', priceDelta: 5000 },
  ],
  sugarLevels: ['Normal Sugar (100%)', 'Less Sugar (70%)', 'Low Sugar (30%)', 'No Sugar (0%)'],
  iceLevels: ['Normal Ice', 'Less Ice', 'No Ice'],
  toppings: [
    { name: 'Espresso Shot', price: 6000 },
    { name: 'Coffee Jelly', price: 4000 },
    { name: 'Whipped Cream', price: 5000 },
    { name: 'Caramel Sauce', price: 4000 },
  ],
};

const FOOD_CUSTOMIZATIONS = {
  spicyLevels: ['Non-Spicy', 'Mild Spicy', 'Extra Spicy (Pedas Gila)'],
  toppings: [
    { name: 'Sunny Side Up Egg', price: 5000 },
    { name: 'Extra Sauce', price: 3000 },
    { name: 'Extra Chicken', price: 10000 },
  ],
};

// Initial Menu Items with Recipes (BOM)
const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'menu-americano',
    name: 'Iced Americano',
    categoryId: 'cat-coffee',
    price: 18000,
    costPrice: 2560,
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
    description: 'Double espresso shot pulled over pure cold water and crystal ice. Clean, bold, and invigorating.',
    isAvailable: true,
    isActive: true,
    recipe: [
      { ingredientId: 'ing-coffee', quantity: 18 }, // 18g coffee
      { ingredientId: 'ing-ice', quantity: 100 }, // 100g ice
    ],
    customizations: BEVERAGE_CUSTOMIZATIONS,
  },
  {
    id: 'menu-latte',
    name: 'Iced Latte',
    categoryId: 'cat-coffee',
    price: 25000,
    costPrice: 6010,
    image: '/src/assets/images/artisan_iced_latte_1791009498944.jpg',
    description: 'Velvety chilled fresh dairy milk layered with rich signature espresso and filtered crystal ice.',
    isAvailable: true,
    isActive: true,
    recipe: [
      { ingredientId: 'ing-coffee', quantity: 18 }, // 18g
      { ingredientId: 'ing-milk', quantity: 150 }, // 150ml
      { ingredientId: 'ing-sugar', quantity: 10 }, // 10g
      { ingredientId: 'ing-ice', quantity: 100 }, // 100g
    ],
    customizations: BEVERAGE_CUSTOMIZATIONS,
  },
  {
    id: 'menu-matcha',
    name: 'Matcha Latte',
    categoryId: 'cat-noncoffee',
    price: 27000,
    costPrice: 8840,
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
    description: 'Authentic ceremonial Kyoto Uji matcha whisked with fresh whole milk and natural sweetener.',
    isAvailable: true,
    isActive: true,
    recipe: [
      { ingredientId: 'ing-matcha', quantity: 15 }, // 15g
      { ingredientId: 'ing-milk', quantity: 180 }, // 180ml
      { ingredientId: 'ing-sugar', quantity: 12 }, // 12g
      { ingredientId: 'ing-ice', quantity: 90 }, // 90g
    ],
    customizations: BEVERAGE_CUSTOMIZATIONS,
  },
  {
    id: 'menu-caramel-macchiato',
    name: 'Caramel Macchiato',
    categoryId: 'cat-coffee',
    price: 28000,
    costPrice: 9460,
    image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80',
    description: 'Fresh milk touched with vanilla syrup, marked with espresso and decadent artisanal caramel drizzle.',
    isAvailable: true,
    isActive: true,
    recipe: [
      { ingredientId: 'ing-coffee', quantity: 18 },
      { ingredientId: 'ing-milk', quantity: 150 },
      { ingredientId: 'ing-vanilla', quantity: 15 },
      { ingredientId: 'ing-caramel', quantity: 15 },
      { ingredientId: 'ing-ice', quantity: 100 },
    ],
    customizations: BEVERAGE_CUSTOMIZATIONS,
  },
  {
    id: 'menu-chicken-rice-bowl',
    name: 'Chicken Rice Bowl',
    categoryId: 'cat-main',
    price: 32000,
    costPrice: 10490,
    image: '/src/assets/images/chicken_rice_bowl_1791009511853.jpg',
    description: 'Tender pan-seared chicken glazed in house-made teriyaki sauce over fluffy jasmine rice and nori.',
    isAvailable: true,
    isActive: true,
    recipe: [
      { ingredientId: 'ing-rice', quantity: 200 }, // 200g
      { ingredientId: 'ing-chicken', quantity: 120 }, // 120g
      { ingredientId: 'ing-sauce', quantity: 30 }, // 30ml
      { ingredientId: 'ing-oil', quantity: 15 }, // 15ml
    ],
    customizations: FOOD_CUSTOMIZATIONS,
  },
  {
    id: 'menu-french-fries',
    name: 'French Fries',
    categoryId: 'cat-snack',
    price: 20000,
    costPrice: 6575,
    image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
    description: 'Crispy golden shoestring fries dusted with sea salt and rosemary herbs.',
    isAvailable: true,
    isActive: true,
    recipe: [
      { ingredientId: 'ing-potatoes', quantity: 180 }, // 180g
      { ingredientId: 'ing-seasoning', quantity: 5 }, // 5g
      { ingredientId: 'ing-oil', quantity: 30 }, // 30ml
    ],
  },
  {
    id: 'menu-croissant',
    name: 'Butter Croissant',
    categoryId: 'cat-snack',
    price: 22000,
    costPrice: 9300,
    image: '/src/assets/images/artisan_croissant_1791009524151.jpg',
    description: 'Flaky, buttery French croissant baked fresh daily with crisp golden exterior and airy crumb.',
    isAvailable: true,
    isActive: true,
    recipe: [
      { ingredientId: 'ing-croissant', quantity: 1 }, // 1 pcs
      { ingredientId: 'ing-butter', quantity: 15 }, // 15g
    ],
  },
];

// Initial Users
const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Admin Siti',
    username: 'admin',
    role: 'admin',
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    lastLogin: 'Just now',
  },
  {
    id: 'user-cashier',
    name: 'Budi Santoso',
    username: 'cashier',
    role: 'cashier',
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    lastLogin: '10 mins ago',
  },
  {
    id: 'user-kitchen',
    name: 'Chef Joko',
    username: 'kitchen',
    role: 'kitchen',
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    lastLogin: '5 mins ago',
  },
  {
    id: 'user-owner',
    name: 'Pak Hendra (Owner)',
    username: 'owner',
    role: 'owner',
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    lastLogin: '1 hour ago',
  },
  {
    id: 'user-customer',
    name: 'Customer Table 12',
    username: 'table-12',
    role: 'customer',
    isActive: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
];

// Default Settings
const INITIAL_SETTINGS: POSSettings = {
  restaurantName: 'Servin Coffee & Kitchen',
  address: 'Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan',
  phone: '+62 812-8899-7700',
  taxRatePercent: 0,
  enableTax: false,
  currencyPrefix: 'Rp',
  autoPrintReceipt: true,
  defaultTableNumber: '12',
};

// Seed sample orders:
// 1 active order ORD-1024 as requested in prompt:
// Order ID: ORD-1024
// Queue: A-024
// Type: Dine-in, Table: 12
// Items: Iced Latte x1 (Medium, Less Sugar, Less Ice), Chicken Rice Bowl x1 (No Spicy, "No peanuts")
// Payment: QRIS, PAID
// Kitchen Status: COOKING
// stockDeducted: false
const createInitialOrders = (): Order[] => {
  const now = new Date();
  
  const sampleActiveOrder: Order = {
    id: 'ORD-1024',
    queueNumber: 'A-024',
    orderType: 'dine_in',
    tableNumber: '12',
    items: [
      {
        id: 'item-1024-1',
        menuItemId: 'menu-latte',
        name: 'Iced Latte',
        quantity: 1,
        unitPrice: 25000,
        customizationTotal: 0,
        subtotal: 25000,
        customizations: {
          size: 'Regular (12oz)',
          sugarLevel: 'Less Sugar (70%)',
          iceLevel: 'Less Ice',
        },
        notes: 'Less sweet please',
      },
      {
        id: 'item-1024-2',
        menuItemId: 'menu-chicken-rice-bowl',
        name: 'Chicken Rice Bowl',
        quantity: 1,
        unitPrice: 32000,
        customizationTotal: 0,
        subtotal: 32000,
        customizations: {
          spicyLevel: 'Non-Spicy',
        },
        notes: 'No peanuts',
      },
    ],
    subtotal: 57000,
    tax: 0,
    totalAmount: 57000,
    payment: {
      method: 'qris',
      status: 'PAID',
      paidAt: new Date(now.getTime() - 12 * 60000).toISOString(),
      transactionRef: 'QRIS-778923412',
    },
    kitchenStatus: 'COOKING',
    statusHistory: [
      {
        status: 'WAITING',
        timestamp: new Date(now.getTime() - 12 * 60000).toISOString(),
        changedBy: 'Customer (Table 12)',
        note: 'Order placed & QRIS paid',
      },
      {
        status: 'COOKING',
        timestamp: new Date(now.getTime() - 8 * 60000).toISOString(),
        changedBy: 'Chef Joko',
        note: 'Kitchen started cooking',
      },
    ],
    createdAt: new Date(now.getTime() - 12 * 60000).toISOString(),
    stockDeducted: false, // NOT completed yet, stock NOT deducted!
    createdByRole: 'customer',
    createdByName: 'Customer (Table 12)',
    estimatedCompletionMinutes: 10,
    customerNote: 'Dine-in at Table 12. Please serve beverage first.',
  };

  // Additional realistic completed orders earlier today for owner metrics
  const earlierCompletedOrders: Order[] = [
    {
      id: 'ORD-1020',
      queueNumber: 'A-020',
      orderType: 'dine_in',
      tableNumber: '4',
      items: [
        {
          id: 'item-1020-1',
          menuItemId: 'menu-americano',
          name: 'Iced Americano',
          quantity: 2,
          unitPrice: 18000,
          customizationTotal: 0,
          subtotal: 36000,
          customizations: { size: 'Regular (12oz)', iceLevel: 'Normal Ice' },
        },
        {
          id: 'item-1020-2',
          menuItemId: 'menu-croissant',
          name: 'Butter Croissant',
          quantity: 2,
          unitPrice: 22000,
          customizationTotal: 0,
          subtotal: 44000,
        },
      ],
      subtotal: 80000,
      tax: 0,
      totalAmount: 80000,
      payment: {
        method: 'cash',
        status: 'PAID',
        amountReceived: 100000,
        change: 20000,
        paidAt: new Date(now.getTime() - 180 * 60000).toISOString(),
        transactionRef: 'CASH-1020',
      },
      kitchenStatus: 'COMPLETED',
      statusHistory: [
        { status: 'WAITING', timestamp: new Date(now.getTime() - 180 * 60000).toISOString(), changedBy: 'Cashier' },
        { status: 'COOKING', timestamp: new Date(now.getTime() - 175 * 60000).toISOString(), changedBy: 'Kitchen' },
        { status: 'READY', timestamp: new Date(now.getTime() - 165 * 60000).toISOString(), changedBy: 'Kitchen' },
        { status: 'COMPLETED', timestamp: new Date(now.getTime() - 160 * 60000).toISOString(), changedBy: 'Kitchen' },
      ],
      createdAt: new Date(now.getTime() - 180 * 60000).toISOString(),
      completedAt: new Date(now.getTime() - 160 * 60000).toISOString(),
      stockDeducted: true,
      createdByRole: 'cashier',
      createdByName: 'Budi Santoso',
    },
    {
      id: 'ORD-1021',
      queueNumber: 'A-021',
      orderType: 'take_away',
      items: [
        {
          id: 'item-1021-1',
          menuItemId: 'menu-caramel-macchiato',
          name: 'Caramel Macchiato',
          quantity: 1,
          unitPrice: 28000,
          customizationTotal: 5000,
          subtotal: 33000,
          customizations: { size: 'Large (16oz)', sugarLevel: 'Normal Sugar (100%)' },
        },
        {
          id: 'item-1021-2',
          menuItemId: 'menu-french-fries',
          name: 'French Fries',
          quantity: 1,
          unitPrice: 20000,
          customizationTotal: 0,
          subtotal: 20000,
        },
      ],
      subtotal: 53000,
      tax: 0,
      totalAmount: 53000,
      payment: {
        method: 'qris',
        status: 'PAID',
        paidAt: new Date(now.getTime() - 120 * 60000).toISOString(),
        transactionRef: 'QRIS-552431',
      },
      kitchenStatus: 'COMPLETED',
      statusHistory: [
        { status: 'WAITING', timestamp: new Date(now.getTime() - 120 * 60000).toISOString(), changedBy: 'Customer' },
        { status: 'COOKING', timestamp: new Date(now.getTime() - 115 * 60000).toISOString(), changedBy: 'Kitchen' },
        { status: 'READY', timestamp: new Date(now.getTime() - 105 * 60000).toISOString(), changedBy: 'Kitchen' },
        { status: 'COMPLETED', timestamp: new Date(now.getTime() - 100 * 60000).toISOString(), changedBy: 'Kitchen' },
      ],
      createdAt: new Date(now.getTime() - 120 * 60000).toISOString(),
      completedAt: new Date(now.getTime() - 100 * 60000).toISOString(),
      stockDeducted: true,
      createdByRole: 'customer',
      createdByName: 'Customer Takeaway',
    },
    {
      id: 'ORD-1022',
      queueNumber: 'A-022',
      orderType: 'dine_in',
      tableNumber: '8',
      items: [
        {
          id: 'item-1022-1',
          menuItemId: 'menu-matcha',
          name: 'Matcha Latte',
          quantity: 2,
          unitPrice: 27000,
          customizationTotal: 0,
          subtotal: 54000,
          customizations: { sugarLevel: 'Less Sugar (70%)' },
        },
        {
          id: 'item-1022-2',
          menuItemId: 'menu-chicken-rice-bowl',
          name: 'Chicken Rice Bowl',
          quantity: 2,
          unitPrice: 32000,
          customizationTotal: 5000,
          subtotal: 69000,
          customizations: { spicyLevel: 'Mild Spicy', toppings: [{ name: 'Sunny Side Up Egg', price: 5000 }] },
        },
      ],
      subtotal: 123000,
      tax: 0,
      totalAmount: 123000,
      payment: {
        method: 'qris',
        status: 'PAID',
        paidAt: new Date(now.getTime() - 75 * 60000).toISOString(),
        transactionRef: 'QRIS-882941',
      },
      kitchenStatus: 'COMPLETED',
      statusHistory: [
        { status: 'WAITING', timestamp: new Date(now.getTime() - 75 * 60000).toISOString(), changedBy: 'Customer' },
        { status: 'COOKING', timestamp: new Date(now.getTime() - 70 * 60000).toISOString(), changedBy: 'Kitchen' },
        { status: 'READY', timestamp: new Date(now.getTime() - 55 * 60000).toISOString(), changedBy: 'Kitchen' },
        { status: 'COMPLETED', timestamp: new Date(now.getTime() - 50 * 60000).toISOString(), changedBy: 'Kitchen' },
      ],
      createdAt: new Date(now.getTime() - 75 * 60000).toISOString(),
      completedAt: new Date(now.getTime() - 50 * 60000).toISOString(),
      stockDeducted: true,
      createdByRole: 'customer',
      createdByName: 'Customer (Table 8)',
    },
    {
      id: 'ORD-1023',
      queueNumber: 'A-023',
      orderType: 'take_away',
      items: [
        {
          id: 'item-1023-1',
          menuItemId: 'menu-latte',
          name: 'Iced Latte',
          quantity: 1,
          unitPrice: 25000,
          customizationTotal: 0,
          subtotal: 25000,
          customizations: { size: 'Regular (12oz)', iceLevel: 'Normal Ice' },
        },
      ],
      subtotal: 25000,
      tax: 0,
      totalAmount: 25000,
      payment: {
        method: 'cash',
        status: 'PAID',
        amountReceived: 50000,
        change: 25000,
        paidAt: new Date(now.getTime() - 40 * 60000).toISOString(),
        transactionRef: 'CASH-1023',
      },
      kitchenStatus: 'COMPLETED',
      statusHistory: [
        { status: 'WAITING', timestamp: new Date(now.getTime() - 40 * 60000).toISOString(), changedBy: 'Cashier' },
        { status: 'COOKING', timestamp: new Date(now.getTime() - 36 * 60000).toISOString(), changedBy: 'Kitchen' },
        { status: 'READY', timestamp: new Date(now.getTime() - 30 * 60000).toISOString(), changedBy: 'Kitchen' },
        { status: 'COMPLETED', timestamp: new Date(now.getTime() - 25 * 60000).toISOString(), changedBy: 'Kitchen' },
      ],
      createdAt: new Date(now.getTime() - 40 * 60000).toISOString(),
      completedAt: new Date(now.getTime() - 25 * 60000).toISOString(),
      stockDeducted: true,
      createdByRole: 'cashier',
      createdByName: 'Budi Santoso',
    },
  ];

  return [...earlierCompletedOrders, sampleActiveOrder];
};

// Seed sample initial inventory logs
const createInitialLogs = (): InventoryLog[] => {
  const now = new Date();
  return [
    {
      id: 'log-seed-1',
      timestamp: new Date(now.getTime() - 160 * 60000).toISOString(),
      ingredientId: 'ing-coffee',
      ingredientName: 'Coffee Beans (Arabica Blend)',
      changeQuantity: -36,
      beforeStock: 5036,
      afterStock: 5000,
      unit: 'g',
      reason: 'Order Completion',
      referenceId: 'ORD-1020',
      performedBy: 'System (Kitchen Complete)',
    },
    {
      id: 'log-seed-2',
      timestamp: new Date(now.getTime() - 160 * 60000).toISOString(),
      ingredientId: 'ing-croissant',
      ingredientName: 'Artisan Croissant Dough',
      changeQuantity: -2,
      beforeStock: 30,
      afterStock: 28,
      unit: 'pcs',
      reason: 'Order Completion',
      referenceId: 'ORD-1020',
      performedBy: 'System (Kitchen Complete)',
    },
    {
      id: 'log-seed-3',
      timestamp: new Date(now.getTime() - 100 * 60000).toISOString(),
      ingredientId: 'ing-potatoes',
      ingredientName: 'Crispy Shoestring Potatoes',
      changeQuantity: -180,
      beforeStock: 3780,
      afterStock: 3600,
      unit: 'g',
      reason: 'Order Completion',
      referenceId: 'ORD-1021',
      performedBy: 'System (Kitchen Complete)',
    },
    {
      id: 'log-seed-4',
      timestamp: new Date(now.getTime() - 50 * 60000).toISOString(),
      ingredientId: 'ing-chicken',
      ingredientName: 'Chicken Fillet (Marinated)',
      changeQuantity: -240,
      beforeStock: 4440,
      afterStock: 4200,
      unit: 'g',
      reason: 'Order Completion',
      referenceId: 'ORD-1022',
      performedBy: 'System (Kitchen Complete)',
    },
  ];
};

type Listener = () => void;

class POSService {
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.initStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && Object.values(STORAGE_KEYS).includes(e.key)) {
          this.notify();
        }
      });
    }
  }

  private initStorage() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.INGREDIENTS)) {
      localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(INITIAL_INGREDIENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MENU_ITEMS)) {
      localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(createInitialOrders()));
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVENTORY_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(createInitialLogs()));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
  }

  // Reactive subscription
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('POSService listener error:', err);
      }
    });
  }

  // Reset to initial clean state
  resetToDefaults() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(INITIAL_INGREDIENTS));
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(createInitialOrders()));
    localStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(createInitialLogs()));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    this.notify();
  }

  // Generic Getters
  getUsers(): User[] {
    if (typeof window === 'undefined') return INITIAL_USERS;
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : INITIAL_USERS;
  }

  getCategories(): Category[] {
    if (typeof window === 'undefined') return INITIAL_CATEGORIES;
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return data ? JSON.parse(data) : INITIAL_CATEGORIES;
  }

  getIngredients(): Ingredient[] {
    if (typeof window === 'undefined') return INITIAL_INGREDIENTS;
    const data = localStorage.getItem(STORAGE_KEYS.INGREDIENTS);
    return data ? JSON.parse(data) : INITIAL_INGREDIENTS;
  }

  getMenuItems(): MenuItem[] {
    if (typeof window === 'undefined') return INITIAL_MENU_ITEMS;
    const data = localStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
    return data ? JSON.parse(data) : INITIAL_MENU_ITEMS;
  }

  getOrders(): Order[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return data ? JSON.parse(data) : [];
  }

  // Analytics Helpers for Owner Dashboard
  getSalesAnalytics() {
    const orders = this.getOrders();
    const menuItems = this.getMenuItems();
    const paidCompletedOrders = orders.filter((o) => o.payment.status === 'PAID');

    const totalRevenue = paidCompletedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = paidCompletedOrders.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Best-selling menu
    const menuSaleCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    let totalEstimatedCOGS = 0; // Cost of goods sold for gross margin calculation

    paidCompletedOrders.forEach((o) => {
      o.items.forEach((item) => {
        const foundMenu = menuItems.find((m) => m.id === item.menuItemId);
        const costPerItem = foundMenu?.costPrice || Math.round(item.unitPrice * 0.35);
        totalEstimatedCOGS += costPerItem * item.quantity;

        if (!menuSaleCounts[item.menuItemId]) {
          menuSaleCounts[item.menuItemId] = {
            name: item.name,
            count: 0,
            revenue: 0,
          };
        }
        menuSaleCounts[item.menuItemId].count += item.quantity;
        menuSaleCounts[item.menuItemId].revenue += item.subtotal;
      });
    });

    const bestSellers = Object.values(menuSaleCounts).sort((a, b) => b.count - a.count);
    const bestSellingItem = bestSellers.length > 0 ? bestSellers[0].name : 'None';

    // Simple Gross Margin
    const grossProfit = totalRevenue - totalEstimatedCOGS;
    const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

    // Hourly Revenue Distribution (08:00 - 22:00)
    const hourlyData: { hour: string; revenue: number; orderCount: number }[] = [];
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
    
    hours.forEach((h) => {
      hourlyData.push({ hour: h, revenue: 0, orderCount: 0 });
    });

    paidCompletedOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const hourNum = d.getHours();
      const hourKey = `${String(hourNum).padStart(2, '0')}:00`;
      const target = hourlyData.find((hd) => hd.hour === hourKey);
      if (target) {
        target.revenue += o.totalAmount;
        target.orderCount += 1;
      }
    });

    // Category Sales Distribution
    const categories = this.getCategories();
    const categorySales: { name: string; revenue: number; count: number }[] = categories.map((c) => ({
      name: c.name,
      revenue: 0,
      count: 0,
    }));

    paidCompletedOrders.forEach((o) => {
      o.items.forEach((item) => {
        const menu = menuItems.find((m) => m.id === item.menuItemId);
        if (menu) {
          const cat = categories.find((c) => c.id === menu.categoryId);
          if (cat) {
            const catStat = categorySales.find((cs) => cs.name === cat.name);
            if (catStat) {
              catStat.revenue += item.subtotal;
              catStat.count += item.quantity;
            }
          }
        }
      });
    });

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      bestSellingItem,
      bestSellers,
      grossProfit,
      grossMarginPercent,
      totalEstimatedCOGS,
      hourlyData,
      categorySales,
    };
  }

  // Export Sales to CSV
  exportSalesCSV(): string {
    const orders = this.getOrders();
    const headers = ['Order ID', 'Queue', 'Type', 'Table', 'Created At', 'Items Summary', 'Subtotal', 'Tax', 'Total Amount', 'Payment Method', 'Payment Status', 'Kitchen Status', 'Stock Deducted'];
    
    const rows = orders.map((o) => {
      const itemsSummary = o.items.map((i) => `${i.name} (x${i.quantity})`).join('; ');
      return [
        o.id,
        o.queueNumber,
        o.orderType,
        o.tableNumber || '-',
        new Date(o.createdAt).toLocaleString('id-ID'),
        `"${itemsSummary.replace(/"/g, '""')}"`,
        o.subtotal,
        o.tax,
        o.totalAmount,
        o.payment.method.toUpperCase(),
        o.payment.status,
        o.kitchenStatus,
        o.stockDeducted ? 'YES' : 'NO',
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const posService = new POSService();
