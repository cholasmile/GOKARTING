/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Activity, FoodVendor, MenuItem, InventoryItem, Booking, FoodOrder, Ticket } from '../types';

export const INITIAL_USERS: User[] = [
  { id: 'usr-admin', name: 'Executive Director Cooper', email: 'admin@deucepark.com', password: 'admin', role: 'super_admin' },
  { id: 'usr-staff', name: 'Activity Ranger Smith', email: 'staff@deucepark.com', password: 'staff', role: 'activity_staff' },
  { id: 'usr-vendor', name: 'Sarah Jenkins', email: 'vendor@deucepark.com', password: 'vendor', role: 'food_vendor', vendorId: 'vendor-forest-cafe' },
  { id: 'usr-cafe', name: 'Deuce Cafe Staff', email: 'cafe@deucepark.com', password: 'cafe', role: 'cafe_staff', vendorId: 'vendor-forest-cafe' },
  { id: 'usr-gkm', name: 'Karting Manager', email: 'kartingmanager@deucepark.com', password: 'manager', role: 'go_karting_manager' },
  { id: 'usr-gks', name: 'Karting Staff', email: 'kartingstaff@deucepark.com', password: 'staff', role: 'go_karting_staff' },
  { id: 'usr-hrs', name: 'Horse Riding Arena Staff', email: 'horseriding@deucepark.com', password: 'staff', role: 'horse_riding_staff' },
  { id: 'usr-sht', name: 'Precision Shooting Range Staff', email: 'shooting@deucepark.com', password: 'staff', role: 'shooting_staff' },
  { id: 'usr-tcs', name: 'Ticket Counter Staff', email: 'ticketing@deucepark.com', password: 'staff', role: 'ticket_counter_staff' },
  { id: 'usr-customer-watson', name: 'John Watson', email: 'watson@baker.street', role: 'customer' }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act-go-karting',
    name: 'High-Octane Go-Karting',
    description: 'Race on our winding 800-meter asphalt track with professional grade electronic lap timing and high-torque pro-karts.',
    adultPrice: 100,
    childPrice: 100,
    image: '/gokart-night.png',
    photos: [
      { id: 'photo-kart-1', url: '/gokart-night.png', caption: 'Night Track Racing', uploadedAt: '2026-01-01T00:00:00.000Z', order: 0 },
      { id: 'photo-kart-2', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80', caption: 'Daytime Sprints', uploadedAt: '2026-01-01T00:00:00.000Z', order: 1 }
    ],
    dailyLimit: 500,
    safetyInstructions: [
      'Helmets and safety harnesses must be tightly secured at all times.',
      'Never step out of the kart while on the racing track.',
      'No intentional bumping, blocking, or dangerous maneuvering.',
      'Obey the track marshal flags immediately (Red: Stop, Yellow: Slow down).'
    ],
    type: 'go_karting',
    packages: [
      { id: 'pkg-kart-single', name: 'Single Rider Experience (10 Mins)', price: 100, description: 'Classic single-seat kart session with lap analysis.' },
      { id: 'pkg-kart-double', name: 'Double Co-Pilot Ride (10 Mins)', price: 150, description: 'Twin-seater kart perfect for a parent and child pairing.' },
      { id: 'pkg-kart-race', name: 'Grand Prix Tournament (30 Mins)', price: 250, description: 'Warm-up, qualifying session, and an 8-lap medal race.' }
    ]
  },
  {
    id: 'act-air-gun',
    name: 'Precision Air Gun Shooting',
    description: 'Test your focus and aim in a professional, safety-hardened indoor air gun shooting range with electronic target retrieval.',
    adultPrice: 25,
    childPrice: 15,
    image: 'https://www.gunforglory.in/wp-content/uploads/2026/04/GFG-BLOG-FEATURE-3-1.png',
    photos: [
      { id: 'photo-shoot-1', url: 'https://www.gunforglory.in/wp-content/uploads/2026/04/GFG-BLOG-FEATURE-3-1.png', caption: 'Olympic 10m Air Rifle', uploadedAt: '2026-01-01T00:00:00.000Z', order: 0 }
    ],
    dailyLimit: 60,
    safetyInstructions: [
      'Keep the gun pointed downrange at all times.',
      'Do not place your finger on the trigger until you are ready to fire.',
      'Always wear the provided protective eye-goggles.',
      'Treat every air rifle as if it were fully loaded at all times.'
    ],
    type: 'shooting',
    packages: [
      { id: 'pkg-shoot-1', name: 'Starter Aim (15 Shots)', price: 15, description: 'Great for beginners looking to learn basic trigger control.', shots: 15 },
      { id: 'pkg-shoot-2', name: 'Sharp Shooter (30 Shots)', price: 25, description: 'Our most popular range package with professional coaching.', shots: 30 },
      { id: 'pkg-shoot-3', name: 'Marksman Elite (50 Shots)', price: 35, description: 'Advanced targets, high-grade ammo, and full score analysis.', shots: 50 }
    ]
  },
  {
    id: 'act-horse-riding',
    name: 'Royal Horse Riding',
    description: 'Experience guided horseback rides through scenic nature trails under expert handler supervision. Perfect for families, beginners, and seasoned riders alike.',
    adultPrice: 45,
    childPrice: 25,
    image: 'https://www.huntleyequestrian.com/cdn/shop/articles/Is-Horse-Riding-a-Sport-Huntley-Equestrian-110301396.jpg?crop=center&height=1200&v=1743859147&width=1200',
    photos: [
      { id: 'photo-horse-1', url: 'https://www.huntleyequestrian.com/cdn/shop/articles/Is-Horse-Riding-a-Sport-Huntley-Equestrian-110301396.jpg?crop=center&height=1200&v=1743859147&width=1200', caption: 'Royal Equestrian Trails', uploadedAt: '2026-01-01T00:00:00.000Z', order: 0 }
    ],
    dailyLimit: 40,
    safetyInstructions: [
      'Always wear the provided certified riding helmet.',
      'Approach the horse from the front-side, never from directly behind.',
      'Avoid sudden movements or loud noises while near the horses.',
      'Maintain upright posture and keep both feet securely in the stirrups.'
    ],
    type: 'horse_riding',
    packages: [
      { id: 'pkg-horse-pony', name: 'Pony Walk (15 Mins)', price: 25, description: 'Gentle pony lead walk on flat trails — perfect for young children.' },
      { id: 'pkg-horse-guided', name: 'Guided Trail Ride (30 Mins)', price: 45, description: 'Scenic guided nature trail ride with an experienced handler.' },
      { id: 'pkg-horse-advanced', name: 'Advanced Forest Trek (60 Mins)', price: 80, description: 'Full forest trail with trotting/cantering for confident riders.' }
    ]
  },
  {
    id: 'act-gaming-pc',
    name: 'DEUCE Gaming PC Arena',
    description: 'High performance standalone gaming PC stations with RTX 4080 GPUs, 240Hz monitors, and top titles (GTA V, Valorant, NFS, Cyberpunk 2077).',
    adultPrice: 50,
    childPrice: 50,
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    photos: [
      { id: 'photo-gaming-1', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80', caption: 'Gaming Station Rig', uploadedAt: '2026-01-01T00:00:00.000Z', order: 0 }
    ],
    dailyLimit: 200,
    safetyInstructions: [
      'Keep food and beverages clear of PC peripherals.',
      'Do not modify Windows system settings or hardware cables.',
      'Sessions auto-terminate when countdown timer reaches zero.',
      'Use CTRL+SHIFT+A for Admin assistance.'
    ],
    type: 'dynamic',
    packages: [
      { id: 'pkg-gaming-5m', name: '5 Minutes Test Drive', price: 10, description: 'Quick 5 minute trial session.' },
      { id: 'pkg-gaming-15m', name: '15 Minutes Speed Play', price: 50, description: '15 minute high speed gaming session.' },
      { id: 'pkg-gaming-30m', name: '30 Minutes Pro Gaming', price: 90, description: '30 minute full match session.' },
      { id: 'pkg-gaming-60m', name: '60 Minutes Ultimate Gaming', price: 150, description: '1 Hour ultimate gaming experience.' }
    ]
  }
];

export const INITIAL_FOOD_VENDORS: FoodVendor[] = [
  {
    id: 'vendor-forest-cafe',
    name: 'The Forest Cafe',
    type: 'cafe',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    ownerName: 'Sarah Jenkins',
    stallNumber: 'Stall F-01'
  },
  {
    id: 'vendor-adventure-grill',
    name: 'Adventure Grill & Fast Food',
    type: 'fast_food',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80',
    ownerName: 'Marcus Broadus',
    stallNumber: 'Stall F-02'
  },
  {
    id: 'vendor-citrus-splash',
    name: 'Citrus Splash Juice Bar',
    type: 'juice',
    image: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?auto=format&fit=crop&w=800&q=80',
    ownerName: 'Elena Rostova',
    stallNumber: 'Stall F-03'
  },
  {
    id: 'vendor-golden-scoop',
    name: 'Golden Scoop Artisanal Desserts',
    type: 'ice_cream',
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80',
    ownerName: 'Oliver Chen',
    stallNumber: 'Stall F-04'
  }
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // The Forest Cafe
  {
    id: 'menu-espresso',
    vendorId: 'vendor-forest-cafe',
    name: 'Double Shot Espresso',
    description: 'Freshly ground premium organic Arabica beans pulled to perfection.',
    price: 4.5,
    category: 'Coffee',
    isAvailable: true,
    stockQuantity: 50,
    image: 'https://images.unsplash.com/photo-1510972527409-cef1903972fa?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'menu-latte',
    vendorId: 'vendor-forest-cafe',
    name: 'Adventure Vanilla Latte',
    description: 'Rich espresso with steamed milk, creamy microfoam, and custom organic Madagascar vanilla syrup.',
    price: 5.5,
    category: 'Coffee',
    isAvailable: true,
    stockQuantity: 40,
    image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'menu-croissant',
    vendorId: 'vendor-forest-cafe',
    name: 'Butter Croissant',
    description: 'Warm, flaky, golden French pastry baked fresh every morning.',
    price: 3.5,
    category: 'Bakery',
    isAvailable: true,
    stockQuantity: 25,
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80'
  },

  // Adventure Grill & Fast Food
  {
    id: 'menu-burger',
    vendorId: 'vendor-adventure-grill',
    name: 'Double Smash Ranger Burger',
    description: 'Two grass-fed angus beef patties, melted sharp cheddar, wild caramelized onions, and house burger sauce.',
    price: 12.5,
    category: 'Burgers',
    isAvailable: true,
    stockQuantity: 65,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'menu-pizza',
    vendorId: 'vendor-adventure-grill',
    name: 'Smoked Woodfire Pepperoni Pizza',
    description: 'Tangy tomato sauce, premium mozzarella, spicy beef pepperoni, drizzled with sweet hot honey.',
    price: 15.0,
    category: 'Pizza',
    isAvailable: true,
    stockQuantity: 30,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'menu-fries',
    vendorId: 'vendor-adventure-grill',
    name: 'Loaded Truffle Fries',
    description: 'Golden-crispy double-cooked potato fries tossed in truffle oil, parmesan, and fresh parsley.',
    price: 7.0,
    category: 'Sides',
    isAvailable: true,
    stockQuantity: 50,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&q=80'
  },

  // Citrus Splash Juice Bar
  {
    id: 'menu-juice-green',
    vendorId: 'vendor-citrus-splash',
    name: 'Wild Green Energy Smoothie',
    description: 'A cold-pressed blend of crisp green apple, fresh spinach, celery, ginger root, and raw honey.',
    price: 6.5,
    category: 'Cold Juices',
    isAvailable: true,
    stockQuantity: 20,
    image: 'https://images.unsplash.com/photo-1610970881699-44a5587caaec?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'menu-shake-berry',
    vendorId: 'vendor-citrus-splash',
    name: 'Mountain Berry Blast Milkshake',
    description: 'Thick creamy milkshake loaded with fresh strawberries, blueberries, raspberries, and greek yogurt.',
    price: 7.5,
    category: 'Shakes',
    isAvailable: true,
    stockQuantity: 35,
    image: 'https://images.unsplash.com/photo-1553787499-6f9133860278?auto=format&fit=crop&w=300&q=80'
  },

  // Golden Scoop Artisanal Desserts
  {
    id: 'menu-ice-waffle',
    vendorId: 'vendor-golden-scoop',
    name: 'Campfire Waffle Sundae',
    description: 'A warm waffle topped with two scoops of chocolate ice cream, toasted marshmallows, and chocolate syrup.',
    price: 8.5,
    category: 'Sundaes',
    isAvailable: true,
    stockQuantity: 15,
    image: 'https://images.unsplash.com/photo-1504113888839-1c8003672244?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'menu-scoop-pistachio',
    vendorId: 'vendor-golden-scoop',
    name: 'Roasted Pistachio Ice Cream',
    description: 'One double-scoop waffle cone of premium home-churned Sicilian pistachio ice cream.',
    price: 5.0,
    category: 'Scoops',
    isAvailable: true,
    stockQuantity: 45,
    image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=300&q=80'
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  // The Forest Cafe
  { id: 'inv-coffee-beans', vendorId: 'vendor-forest-cafe', name: 'Arabica Coffee Beans (kg)', currentStock: 25, minStockLevel: 5, unit: 'kg' },
  { id: 'inv-whole-milk', vendorId: 'vendor-forest-cafe', name: 'Organic Whole Milk (Liters)', currentStock: 4, minStockLevel: 10, unit: 'L' }, // Low stock
  { id: 'inv-croissant-dough', vendorId: 'vendor-forest-cafe', name: 'Croissant Dough Pre-rolls', currentStock: 40, minStockLevel: 15, unit: 'pcs' },

  // Adventure Grill
  { id: 'inv-beef-patties', vendorId: 'vendor-adventure-grill', name: 'Angus Beef Patties', currentStock: 65, minStockLevel: 20, unit: 'pcs' },
  { id: 'inv-buns', vendorId: 'vendor-adventure-grill', name: 'Brioche Burger Buns', currentStock: 12, minStockLevel: 30, unit: 'pcs' }, // Low stock
  { id: 'inv-pepperoni', vendorId: 'vendor-adventure-grill', name: 'Sliced Italian Pepperoni (kg)', currentStock: 8, minStockLevel: 2, unit: 'kg' },
  { id: 'inv-fries-frozen', vendorId: 'vendor-adventure-grill', name: 'Frozen Potato Sticks (kg)', currentStock: 35, minStockLevel: 10, unit: 'kg' },

  // Citrus Splash
  { id: 'inv-spinach', vendorId: 'vendor-citrus-splash', name: 'Fresh Spinach leaves (kg)', currentStock: 1.5, minStockLevel: 3, unit: 'kg' }, // Low stock
  { id: 'inv-ginger', vendorId: 'vendor-citrus-splash', name: 'Fresh Ginger Root (kg)', currentStock: 4, minStockLevel: 1, unit: 'kg' },
  { id: 'inv-berries-frozen', vendorId: 'vendor-citrus-splash', name: 'Assorted Frozen Berries (kg)', currentStock: 12, minStockLevel: 4, unit: 'kg' },

  // Golden Scoop
  { id: 'inv-cream', vendorId: 'vendor-golden-scoop', name: 'Whipping Cream (Liters)', currentStock: 30, minStockLevel: 8, unit: 'L' },
  { id: 'inv-marshmallows', vendorId: 'vendor-golden-scoop', name: 'Marshmallows Bag (500g)', currentStock: 2, minStockLevel: 5, unit: 'bags' } // Low stock
];

// Helper to generate some historical mock data so charts look rich and real
const getPastDateStr = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};
export const INITIAL_BOOKINGS: Booking[] = [];

export const INITIAL_TICKETS: Ticket[] = [];

export const INITIAL_FOOD_ORDERS: FoodOrder[] = [];

