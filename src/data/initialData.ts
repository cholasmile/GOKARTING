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

import { User, Activity, FoodVendor, MenuItem, InventoryItem, Booking, FoodOrder, Ticket } from '../types';

// ── Staff Accounts (used only as login fallback when Supabase is unavailable) ──
// These are default credential definitions, NOT data to be inserted into production.
export const INITIAL_USERS: User[] = [
  { id: 'usr-admin', name: 'Executive Director Cooper', email: 'admin@deucepark.com', password: 'admin', role: 'super_admin' },
  { id: 'usr-staff', name: 'Activity Ranger Smith', email: 'staff@deucepark.com', password: 'staff', role: 'activity_staff' },
  { id: 'usr-vendor', name: 'Sarah Jenkins', email: 'vendor@deucepark.com', password: 'vendor', role: 'food_vendor', vendorId: 'vendor-forest-cafe' },
  { id: 'usr-cafe', name: 'Deuce Cafe Staff', email: 'cafe@deucepark.com', password: 'cafe', role: 'cafe_staff', vendorId: 'vendor-forest-cafe' },
  { id: 'usr-gkm', name: 'Karting Manager', email: 'kartingmanager@deucepark.com', password: 'manager', role: 'go_karting_manager' },
  { id: 'usr-gks', name: 'Karting Staff', email: 'kartingstaff@deucepark.com', password: 'staff', role: 'go_karting_staff' },
  { id: 'usr-hrs', name: 'Horse Riding Staff', email: 'horseriding@deucepark.com', password: 'staff', role: 'horse_riding_staff' },
  { id: 'usr-sht', name: 'Precision Shooting Range Staff', email: 'shooting@deucepark.com', password: 'staff', role: 'shooting_staff' },
  { id: 'usr-tcs', name: 'Ticket Counter Staff', email: 'ticketing@deucepark.com', password: 'staff', role: 'ticket_counter_staff' },
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
