/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ⚠️  DEMO / DEVELOPMENT DATA ONLY
 * ============================================================
 * This file contains sample/placeholder data used ONLY when:
 *   - VITE_DEMO_MODE=true is explicitly set in the environment
 *   - Running automated tests or local development previews
 *
 * THIS DATA IS **NEVER** LOADED AUTOMATICALLY IN PRODUCTION.
 * Production data is always read from the configured Supabase database.
 *
 * Priority: Production Supabase Data → Empty State (NOT demo data)
 * ============================================================
 */

import { User, Activity, FoodVendor, MenuItem, InventoryItem, Booking, FoodOrder, Ticket, ComboPack } from '../types';

// ── Staff Accounts (used only as login fallback when Supabase is unavailable) ──
// These are default credential definitions, NOT data to be inserted into production.
export const INITIAL_USERS: User[] = [
  { id: 'usr-admin', name: 'Executive Director Cooper', email: 'admin@deucepark.com', password: 'admin', role: 'super_admin', employeeId: 'EMP-ADM-01', streetAddress: 'No. 1, Park Administrative Block', city: 'Yelagiri Hills', state: 'Tamil Nadu', pincode: '635853', aadhaarNumber: '9876 5432 1001', monthlySalary: 55000, dailyRate: 1833 },
  { id: 'usr-staff', name: 'Activity Ranger Smith', email: 'staff@deucepark.com', password: 'staff', role: 'activity_staff', employeeId: 'EMP-OPS-02', streetAddress: '24 Mountain Breeze Colony', city: 'Yelagiri Hills', state: 'Tamil Nadu', pincode: '635853', aadhaarNumber: '8765 4321 2002', department: 'Park Activities', designation: 'Activity Ranger', monthlySalary: 22000, dailyRate: 733 },
  { id: 'usr-vendor', name: 'Sarah Jenkins', email: 'vendor@deucepark.com', password: 'vendor', role: 'food_vendor', vendorId: 'vendor-forest-cafe', employeeId: 'EMP-FNB-03', streetAddress: '15 Forest Vista Road', city: 'Yelagiri Hills', state: 'Tamil Nadu', pincode: '635853', aadhaarNumber: '7654 3210 3003', monthlySalary: 25000, dailyRate: 833 },
  { id: 'usr-cafe', name: 'Deuce Cafe Staff', email: 'cafe@deucepark.com', password: 'cafe', role: 'cafe_staff', vendorId: 'vendor-forest-cafe', employeeId: 'EMP-CAF-04', streetAddress: '8 Valley View Lane', city: 'Yelagiri Hills', state: 'Tamil Nadu', pincode: '635853', aadhaarNumber: '6543 2109 4004', department: 'Cafe & Food Street', designation: 'Barista & Cashier', monthlySalary: 18000, dailyRate: 600 },
  { id: 'usr-gkm', name: 'Karting Manager', email: 'kartingmanager@deucepark.com', password: 'manager', role: 'go_karting_manager', employeeId: 'EMP-KRT-05', streetAddress: '32 Circuit Road, Athanavur', city: 'Yelagiri Hills', state: 'Tamil Nadu', pincode: '635853', aadhaarNumber: '5432 1098 5005', department: 'Go-Karting', designation: 'Track Manager', monthlySalary: 32000, dailyRate: 1067 },
  { id: 'usr-gks', name: 'Karting Staff', email: 'kartingstaff@deucepark.com', password: 'staff', role: 'go_karting_staff', employeeId: 'EMP-KRT-06', streetAddress: '19 Racecourse Street', city: 'Yelagiri Hills', state: 'Tamil Nadu', pincode: '635853', aadhaarNumber: '4321 0987 6006', department: 'Go-Karting', designation: 'Pit Marshal', monthlySalary: 18000, dailyRate: 600 },
  { id: 'usr-hrs', name: 'Horse Riding Staff', email: 'horseriding@deucepark.com', password: 'staff', role: 'horse_riding_staff', employeeId: 'EMP-HRS-07', streetAddress: '7 Equestrian Lane, Mangalam', city: 'Yelagiri Hills', state: 'Tamil Nadu', pincode: '635853', aadhaarNumber: '3210 9876 7007', department: 'Horse Riding', designation: 'Stable In-Charge', monthlySalary: 20000, dailyRate: 667 },
  { id: 'usr-sht', name: 'Precision Shooting Range Staff', email: 'shooting@deucepark.com', password: 'staff', role: 'shooting_staff', employeeId: 'EMP-SHT-08', streetAddress: '11 Pine Grove Road', city: 'Yelagiri Hills', state: 'Tamil Nadu', pincode: '635853', aadhaarNumber: '2109 8765 8008', department: 'Air Rifle Shooting', designation: 'Range Safety Officer', monthlySalary: 20000, dailyRate: 667 },
  { id: 'usr-tcs', name: 'Ticket Counter Staff', email: 'ticketing@deucepark.com', password: 'staff', role: 'ticket_counter_staff', employeeId: 'EMP-TCK-09', streetAddress: '5 Gate Avenue, Main Entrance', city: 'Yelagiri Hills', state: 'Tamil Nadu', pincode: '635853', aadhaarNumber: '1098 7654 9009', department: 'Ticketing & Counter', designation: 'Counter Cashier', monthlySalary: 18000, dailyRate: 600 },
  { id: 'usr-gift', name: 'Deuce Gift Shop Staff', email: 'giftshop@deucepark.com', password: 'gift', role: 'gift_shop_staff', vendorId: 'vendor-gift-shop', employeeId: 'EMP-GFT-11', streetAddress: '10 Souvenir Arcade, Main Promenade', city: 'Yelagiri Hills', state: 'Tamil Nadu', pincode: '635853', aadhaarNumber: '8901 2345 6789', department: 'Gift Shop & Merchandise', designation: 'Store In-Charge', monthlySalary: 18000, dailyRate: 600 },
  { id: 'usr-fin', name: 'Finance Entry Sub-Admin', email: 'finance@deucepark.com', password: 'finance', role: 'finance_sub_admin', employeeId: 'EMP-FIN-10', streetAddress: '3 Accounts Wing, Admin House', city: 'Yelagiri Hills', state: 'Tamil Nadu', pincode: '635853', aadhaarNumber: '9012 3456 0010', department: 'Administration / Office', designation: 'Accounts Sub-Admin', monthlySalary: 28000, dailyRate: 933 },
];

// ── Demo Activities (NEVER auto-loaded in production) ──
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
    description: 'Experience guided horseback rides through scenic nature trails under expert handler supervision.',
    adultPrice: 45,
    childPrice: 25,
    image: 'https://www.huntleyequestrian.com/cdn/shop/articles/Is-Horse-Riding-a-Sport-Huntley-Equestrian-110301396.jpg?crop=center&height=1200&v=1743859147&width=1200',
    photos: [],
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
  }
];

// ── Demo Food Vendors (NEVER auto-loaded in production) ──
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
  },
  {
    id: 'vendor-gift-shop',
    name: 'Deuce Souvenir & Gift Shop',
    type: 'gift_shop',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    ownerName: 'Deuce Retail Management',
    stallNumber: 'Shop G-01'
  }
];

// ── Curated Deuce Gift & Souvenir Shop Merchandise Items ──
export const INITIAL_GIFT_ITEMS: MenuItem[] = [
  {
    id: 'gift-item-1',
    vendorId: 'vendor-gift-shop',
    name: 'Deuce Pro Racing Cap',
    description: 'Embroidered Deuce Racing adjustable athletic cap with moisture-wicking fabric.',
    price: 399,
    purchasePrice: 180,
    category: 'Caps & Headwear',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80',
    stockQuantity: 45,
    unit: 'pcs'
  },
  {
    id: 'gift-item-2',
    vendorId: 'vendor-gift-shop',
    name: 'Deuce "Live The Rush" Cotton T-Shirt',
    description: '100% premium breathable cotton unisex graphic tee with track circuit print.',
    price: 599,
    purchasePrice: 250,
    category: 'Apparel & Clothing',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
    stockQuantity: 60,
    unit: 'pcs'
  },
  {
    id: 'gift-item-3',
    vendorId: 'vendor-gift-shop',
    name: 'Deuce Championship Fleece Hoodie',
    description: 'Heavyweight warm fleece zip-up hoodie with racing stripes and front pockets.',
    price: 1299,
    purchasePrice: 650,
    category: 'Apparel & Clothing',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=400&q=80',
    stockQuantity: 30,
    unit: 'pcs'
  },
  {
    id: 'gift-item-4',
    vendorId: 'vendor-gift-shop',
    name: 'Die-Cast 1:24 Racing Go-Kart Model',
    description: 'Detailed metal alloy miniature replica of our flagship Yelagiri track kart.',
    price: 749,
    purchasePrice: 320,
    category: 'Toys & Die-Cast Models',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=400&q=80',
    stockQuantity: 35,
    unit: 'pcs'
  },
  {
    id: 'gift-item-5',
    vendorId: 'vendor-gift-shop',
    name: 'Deuce Turbo Engraved Metal Keychain',
    description: 'Heavy-duty polished alloy keychain with laser-etched track emblem.',
    price: 149,
    purchasePrice: 45,
    category: 'Souvenirs & Keychains',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=400&q=80',
    stockQuantity: 100,
    unit: 'pcs'
  },
  {
    id: 'gift-item-6',
    vendorId: 'vendor-gift-shop',
    name: 'Stainless Steel Sports Sipper (750ml)',
    description: 'Double-walled insulated matte black thermal bottle keeping drinks cold for 24h.',
    price: 499,
    purchasePrice: 190,
    category: 'Drinkware & Flasks',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80',
    stockQuantity: 40,
    unit: 'pcs'
  },
  {
    id: 'gift-item-7',
    vendorId: 'vendor-gift-shop',
    name: 'Polarized UV400 Racing Sunglasses',
    description: 'Aerodynamic sport-wrap sunglasses with anti-glare tinted polycarbonate lenses.',
    price: 699,
    purchasePrice: 280,
    category: 'Accessories & Gear',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=400&q=80',
    stockQuantity: 25,
    unit: 'pcs'
  },
  {
    id: 'gift-item-8',
    vendorId: 'vendor-gift-shop',
    name: 'Deuce Silicone Wristbands (Set of 2)',
    description: 'Durable debossed silicone speed bands in Deuce cyan and neon gold.',
    price: 99,
    purchasePrice: 25,
    category: 'Souvenirs & Keychains',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
    stockQuantity: 120,
    unit: 'pcs'
  },
  {
    id: 'gift-item-9',
    vendorId: 'vendor-gift-shop',
    name: 'Deuce Adventure Water-Resistant Daypack',
    description: 'Lightweight ripstop backpack with padded shoulder straps and helmet clip.',
    price: 1499,
    purchasePrice: 700,
    category: 'Accessories & Gear',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
    stockQuantity: 20,
    unit: 'pcs'
  },
  {
    id: 'gift-item-10',
    vendorId: 'vendor-gift-shop',
    name: 'Trackside Matte Ceramic Coffee Mug',
    description: '350ml high-gloss ceramic mug with race finish flag and logo.',
    price: 299,
    purchasePrice: 90,
    category: 'Drinkware & Flasks',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
    stockQuantity: 60,
    unit: 'pcs'
  }
];

// ── Demo Menu Items (NEVER auto-loaded in production) ──
export const INITIAL_MENU_ITEMS: MenuItem[] = [];

// ── Demo Inventory (NEVER auto-loaded in production) ──
export const INITIAL_INVENTORY: InventoryItem[] = [];

// ── Always empty — production data comes from Supabase ──
export const INITIAL_BOOKINGS: Booking[] = [];
export const INITIAL_TICKETS: Ticket[] = [];
export const INITIAL_FOOD_ORDERS: FoodOrder[] = [];

// ── Default Curated Combo Packs ──
export const INITIAL_COMBO_PACKS: ComboPack[] = [
  {
    id: 'combo-adventure-pack-1',
    name: 'DEUCE Ultimate Adventure Pack',
    description: 'The ultimate thrill experience: Go-Karting (5 Laps), Precision Air Gun Shooting (10 Shots), and Royal Horse Riding (15 Mins) bundled into a single pass with maximum savings!',
    badge: 'POPULAR COMBO',
    items: [
      {
        activityId: 'act-go-karting',
        activityName: 'High-Octane Go-Karting',
        packageId: 'pkg-kart-single',
        packageName: 'Single Rider Experience',
        unitOrDuration: '5 laps',
        quantity: 1,
        originalPrice: 350
      },
      {
        activityId: 'act-air-gun',
        activityName: 'Precision Air Gun Shooting',
        packageId: 'pkg-shoot-1',
        packageName: 'Starter Aim',
        unitOrDuration: '10 shots',
        quantity: 1,
        originalPrice: 250
      },
      {
        activityId: 'act-horse-riding',
        activityName: 'Royal Horse Riding',
        packageId: 'pkg-horse-pony',
        packageName: 'Pony Walk',
        unitOrDuration: '1 ride (15 Mins)',
        quantity: 1,
        originalPrice: 300
      }
    ],
    originalPrice: 900,
    comboPrice: 699,
    validityDays: 30,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'combo-speed-target-2',
    name: 'Speed & Target Duo',
    description: 'Fast laps on the race track combined with precision air rifle target shooting! High energy and extreme focus.',
    badge: 'BESTSELLER',
    items: [
      {
        activityId: 'act-go-karting',
        activityName: 'High-Octane Go-Karting',
        packageId: 'pkg-kart-single',
        packageName: 'Single Rider Experience',
        unitOrDuration: '5 laps',
        quantity: 1,
        originalPrice: 350
      },
      {
        activityId: 'act-air-gun',
        activityName: 'Precision Air Gun Shooting',
        packageId: 'pkg-shoot-1',
        packageName: 'Starter Aim',
        unitOrDuration: '10 shots',
        quantity: 1,
        originalPrice: 250
      }
    ],
    originalPrice: 600,
    comboPrice: 499,
    validityDays: 30,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'combo-royal-speed-3',
    name: 'Royal Speed Combo',
    description: 'Unleash your inner racer on the go-kart circuit, then take a graceful Royal Horse Riding experience through the trails.',
    badge: 'WEEKEND SPECIAL',
    items: [
      {
        activityId: 'act-go-karting',
        activityName: 'High-Octane Go-Karting',
        packageId: 'pkg-kart-single',
        packageName: 'Single Rider Experience',
        unitOrDuration: '5 laps',
        quantity: 1,
        originalPrice: 350
      },
      {
        activityId: 'act-horse-riding',
        activityName: 'Royal Horse Riding',
        packageId: 'pkg-horse-pony',
        packageName: 'Pony Walk',
        unitOrDuration: '1 ride (15 Mins)',
        quantity: 1,
        originalPrice: 300
      }
    ],
    originalPrice: 650,
    comboPrice: 549,
    validityDays: 30,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'combo-target-trail-4',
    name: 'Target & Trail Explorer',
    description: 'Calm precision with air rifle shooting coupled with a scenic guided horse trail ride across Yelagiri hills.',
    badge: 'GREAT VALUE',
    items: [
      {
        activityId: 'act-air-gun',
        activityName: 'Precision Air Gun Shooting',
        packageId: 'pkg-shoot-1',
        packageName: 'Starter Aim',
        unitOrDuration: '10 shots',
        quantity: 1,
        originalPrice: 250
      },
      {
        activityId: 'act-horse-riding',
        activityName: 'Royal Horse Riding',
        packageId: 'pkg-horse-pony',
        packageName: 'Pony Walk',
        unitOrDuration: '1 ride (15 Mins)',
        quantity: 1,
        originalPrice: 300
      }
    ],
    originalPrice: 550,
    comboPrice: 449,
    validityDays: 30,
    isActive: true,
    createdAt: new Date().toISOString()
  }
];
