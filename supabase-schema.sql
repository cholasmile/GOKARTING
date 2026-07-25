-- Supabase Schema & Seed Data for Adventure Park Dashboard

-- Drop tables if they exist (for easy re-running)
DROP TABLE IF EXISTS "payments";
DROP TABLE IF EXISTS "tickets";
DROP TABLE IF EXISTS "bookings";
DROP TABLE IF EXISTS "food_orders";
DROP TABLE IF EXISTS "inventory";
DROP TABLE IF EXISTS "menu_items";
DROP TABLE IF EXISTS "food_vendors";
DROP TABLE IF EXISTS "activities";
DROP TABLE IF EXISTS "notifications";

-- 1. Users Table (For Role Management)
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "role" TEXT NOT NULL,
  "department" TEXT
);

-- 2. Activities Table
CREATE TABLE "activities" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "adultPrice" NUMERIC,
  "childPrice" NUMERIC,
  "image" TEXT NOT NULL,
  "dailyLimit" INTEGER NOT NULL,
  "safetyInstructions" JSONB NOT NULL,
  "packages" JSONB,
  "type" TEXT NOT NULL
);

-- 2. Food Vendors Table
CREATE TABLE "food_vendors" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "stallNumber" TEXT NOT NULL
);

-- 3. Menu Items Table
CREATE TABLE "menu_items" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL REFERENCES "food_vendors"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" NUMERIC NOT NULL,
  "category" TEXT NOT NULL,
  "isAvailable" BOOLEAN NOT NULL,
  "image" TEXT NOT NULL
);

-- 4. Inventory Table
CREATE TABLE "inventory" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL REFERENCES "food_vendors"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "currentStock" NUMERIC NOT NULL,
  "minStockLevel" NUMERIC NOT NULL,
  "unit" TEXT NOT NULL
);

-- 5. Bookings Table
CREATE TABLE "bookings" (
  "id" TEXT PRIMARY KEY,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "activityName" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "timeSlot" TEXT NOT NULL,
  "ticketType" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "totalAmount" NUMERIC NOT NULL,
  "paymentStatus" TEXT NOT NULL,
  "bookingDate" TEXT NOT NULL
);

-- 6. Tickets Table
CREATE TABLE "tickets" (
  "id" TEXT PRIMARY KEY,
  "bookingId" TEXT NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "activityName" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "timeSlot" TEXT NOT NULL,
  "ticketType" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "qrCodeValue" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "scannedAt" TEXT,
  "scannedBy" TEXT
);

-- 7. Food Orders Table
CREATE TABLE "food_orders" (
  "id" TEXT PRIMARY KEY,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "totalAmount" NUMERIC NOT NULL,
  "status" TEXT NOT NULL,
  "paymentStatus" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

-- 8. Payments Table
CREATE TABLE "payments" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT,
  "bookingId" TEXT,
  "amount" NUMERIC NOT NULL,
  "method" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "timestamp" TEXT NOT NULL
);

-- 9. Notifications Table
CREATE TABLE "notifications" (
  "id" TEXT PRIMARY KEY,
  "recipient" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "sentAt" TEXT NOT NULL
);

-- Enable RLS (Row Level Security) and add policies allowing anonymous operations for this shared demo dashboard
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "food_vendors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "food_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read" ON "users" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON "users" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON "users" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON "users" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON "activities" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON "activities" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON "activities" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON "activities" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON "food_vendors" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON "food_vendors" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON "food_vendors" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON "food_vendors" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON "menu_items" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON "menu_items" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON "menu_items" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON "menu_items" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON "inventory" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON "inventory" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON "inventory" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON "inventory" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON "bookings" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON "bookings" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON "bookings" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON "bookings" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON "tickets" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON "tickets" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON "tickets" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON "tickets" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON "food_orders" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON "food_orders" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON "food_orders" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON "food_orders" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON "payments" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON "payments" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON "payments" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON "payments" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON "notifications" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON "notifications" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON "notifications" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON "notifications" FOR DELETE USING (true);


-- ==========================================
-- SEED DATA
-- ==========================================

-- Seed Users
INSERT INTO "users" ("id", "name", "email", "role", "department") VALUES
('user-1', 'System Super Admin', 'admin@adventurepark.com', 'super_admin', 'management'),
('user-2', 'Activity Ranger Smith', 'staff@adventurepark.com', 'activity_staff', 'act-horse-riding'),
('user-3', 'Forest Cafe Manager', 'vendor@adventurepark.com', 'food_vendor', 'vendor-forest-cafe');

-- Seed Activities
INSERT INTO "activities" ("id", "name", "description", "adultPrice", "childPrice", "image", "dailyLimit", "safetyInstructions", "packages", "type") VALUES
('act-horse-riding', 'Royal Horse Riding', 'Experience guided horseback rides through scenic nature trails under expert handler supervision. Perfect for families, beginners, and seasoned riders alike.', 45, 25, 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=800&q=80', 40, '["Always wear the provided certified riding helmet.", "Approach the horse from the front-side, never from directly behind.", "Avoid sudden movements or loud noises while near the horses.", "Maintain upright posture and keep both feet securely in the stirrups."]'::jsonb, NULL, 'horse_riding'),
('act-air-gun', 'Precision Air Gun Shooting', 'Test your focus and aim in a professional, safety-hardened indoor air gun shooting range with electronic target retrieval.', NULL, NULL, 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=800&q=80', 60, '["Keep the gun pointed downrange at all times.", "Do not place your finger on the trigger until you are ready to fire.", "Always wear the provided protective eye-goggles.", "Treat every air rifle as if it were fully loaded at all times."]'::jsonb, '[{"id": "pkg-shoot-1", "name": "Starter Aim (15 Shots)", "price": 15, "description": "Great for beginners looking to learn basic trigger control.", "shots": 15}, {"id": "pkg-shoot-2", "name": "Sharp Shooter (30 Shots)", "price": 25, "description": "Our most popular range package with professional coaching.", "shots": 30}, {"id": "pkg-shoot-3", "name": "Marksman Elite (50 Shots)", "price": 35, "description": "Advanced targets, high-grade ammo, and full score analysis.", "shots": 50}]'::jsonb, 'shooting'),
('act-go-karting', 'High-Octane Go-Karting', 'Race on our winding 800-meter asphalt track with professional grade electronic lap timing and high-torque pro-karts.', NULL, NULL, 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80', 80, '["Helmets and safety harnesses must be tightly secured at all times.", "Never step out of the kart while on the racing track.", "No intentional bumping, blocking, or dangerous maneuvering.", "Obey the track marshal flags immediately (Red: Stop, Yellow: Slow down)."]'::jsonb, '[{"id": "pkg-kart-single", "name": "Single Rider Experience (10 Mins)", "price": 20, "description": "Classic single-seat kart session with lap analysis."}, {"id": "pkg-kart-double", "name": "Double Co-Pilot Ride (10 Mins)", "price": 30, "description": "Twin-seater kart perfect for a parent and child pairing."}, {"id": "pkg-kart-race", "name": "Grand Prix Tournament (30 Mins)", "price": 65, "description": "Warm-up, qualifying session, and an 8-lap medal race."}]'::jsonb, 'go_karting');

-- Seed Food Vendors
INSERT INTO "food_vendors" ("id", "name", "type", "image", "ownerName", "stallNumber") VALUES
('vendor-forest-cafe', 'The Forest Cafe', 'cafe', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80', 'Sarah Jenkins', 'Stall F-01'),
('vendor-adventure-grill', 'Adventure Grill & Fast Food', 'fast_food', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80', 'Marcus Broadus', 'Stall F-02'),
('vendor-citrus-splash', 'Citrus Splash Juice Bar', 'juice', 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?auto=format&fit=crop&w=800&q=80', 'Elena Rostova', 'Stall F-03'),
('vendor-golden-scoop', 'Golden Scoop Artisanal Desserts', 'ice_cream', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80', 'Oliver Chen', 'Stall F-04');

-- Seed Menu Items
INSERT INTO "menu_items" ("id", "vendorId", "name", "description", "price", "category", "isAvailable", "image") VALUES
('menu-espresso', 'vendor-forest-cafe', 'Double Shot Espresso', 'Freshly ground premium organic Arabica beans pulled to perfection.', 4.5, 'Coffee', true, 'https://images.unsplash.com/photo-1510972527409-cef1903972fa?auto=format&fit=crop&w=300&q=80'),
('menu-latte', 'vendor-forest-cafe', 'Adventure Vanilla Latte', 'Rich espresso with steamed milk, creamy microfoam, and custom organic Madagascar vanilla syrup.', 5.5, 'Coffee', true, 'https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?auto=format&fit=crop&w=300&q=80'),
('menu-croissant', 'vendor-forest-cafe', 'Butter Croissant', 'Warm, flaky, golden French pastry baked fresh every morning.', 3.5, 'Bakery', true, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80'),
('menu-burger', 'vendor-adventure-grill', 'Double Smash Ranger Burger', 'Two grass-fed angus beef patties, melted sharp cheddar, wild caramelized onions, and house burger sauce.', 12.5, 'Burgers', true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80'),
('menu-pizza', 'vendor-adventure-grill', 'Smoked Woodfire Pepperoni Pizza', 'Tangy tomato sauce, premium mozzarella, spicy beef pepperoni, drizzled with sweet hot honey.', 15.0, 'Pizza', true, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80'),
('menu-fries', 'vendor-adventure-grill', 'Loaded Truffle Fries', 'Golden-crispy double-cooked potato fries tossed in truffle oil, parmesan, and fresh parsley.', 7.0, 'Sides', true, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&q=80'),
('menu-juice-green', 'vendor-citrus-splash', 'Wild Green Energy Smoothie', 'A cold-pressed blend of crisp green apple, fresh spinach, celery, ginger root, and raw honey.', 6.5, 'Cold Juices', true, 'https://images.unsplash.com/photo-1610970881699-44a5587caaec?auto=format&fit=crop&w=300&q=80'),
('menu-shake-berry', 'vendor-citrus-splash', 'Mountain Berry Blast Milkshake', 'Thick creamy milkshake loaded with fresh strawberries, blueberries, raspberries, and greek yogurt.', 7.5, 'Shakes', true, 'https://images.unsplash.com/photo-1553787499-6f9133860278?auto=format&fit=crop&w=300&q=80'),
('menu-ice-waffle', 'vendor-golden-scoop', 'Campfire Waffle Sundae', 'A warm waffle topped with two scoops of chocolate ice cream, toasted marshmallows, and chocolate syrup.', 8.5, 'Sundaes', true, 'https://images.unsplash.com/photo-1504113888839-1c8003672244?auto=format&fit=crop&w=300&q=80'),
('menu-scoop-pistachio', 'vendor-golden-scoop', 'Roasted Pistachio Ice Cream', 'One double-scoop waffle cone of premium home-churned Sicilian pistachio ice cream.', 5.0, 'Scoops', true, 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=300&q=80');

-- Seed Inventory
INSERT INTO "inventory" ("id", "vendorId", "name", "currentStock", "minStockLevel", "unit") VALUES
('inv-coffee-beans', 'vendor-forest-cafe', 'Arabica Coffee Beans (kg)', 25, 5, 'kg'),
('inv-whole-milk', 'vendor-forest-cafe', 'Organic Whole Milk (Liters)', 4, 10, 'L'),
('inv-croissant-dough', 'vendor-forest-cafe', 'Croissant Dough Pre-rolls', 40, 15, 'pcs'),
('inv-beef-patties', 'vendor-adventure-grill', 'Angus Beef Patties', 65, 20, 'pcs'),
('inv-buns', 'vendor-adventure-grill', 'Brioche Burger Buns', 12, 30, 'pcs'),
('inv-pepperoni', 'vendor-adventure-grill', 'Sliced Italian Pepperoni (kg)', 8, 2, 'kg'),
('inv-fries-frozen', 'vendor-adventure-grill', 'Frozen Potato Sticks (kg)', 35, 10, 'kg'),
('inv-spinach', 'vendor-citrus-splash', 'Fresh Spinach leaves (kg)', 1.5, 3, 'kg'),
('inv-ginger', 'vendor-citrus-splash', 'Fresh Ginger Root (kg)', 4, 1, 'kg'),
('inv-berries-frozen', 'vendor-citrus-splash', 'Assorted Frozen Berries (kg)', 12, 4, 'kg'),
('inv-cream', 'vendor-golden-scoop', 'Whipping Cream (Liters)', 30, 8, 'L'),
('inv-marshmallows', 'vendor-golden-scoop', 'Marshmallows Bag (500g)', 2, 5, 'bags');

-- Seed Bookings & Tickets (Past days computed dynamically)
INSERT INTO "bookings" ("id", "customerName", "customerEmail", "activityId", "activityName", "date", "timeSlot", "ticketType", "details", "quantity", "totalAmount", "paymentStatus", "bookingDate") VALUES
('bk-1001', 'Alex Mercer', 'alex@example.com', 'act-horse-riding', 'Royal Horse Riding', to_char(CURRENT_DATE - INTERVAL '5 days', 'YYYY-MM-DD'), '10:00 AM - 11:00 AM', 'standard', '2x Adult, 1x Child', 3, 115, 'paid', to_char(CURRENT_DATE - INTERVAL '5 days', 'YYYY-MM-DD') || 'T09:15:00Z'),
('bk-1002', 'Julia Roberts', 'julia@example.com', 'act-go-karting', 'High-Octane Go-Karting', to_char(CURRENT_DATE - INTERVAL '4 days', 'YYYY-MM-DD'), '02:00 PM - 03:00 PM', 'package', '2x Grand Prix Tournament', 2, 130, 'paid', to_char(CURRENT_DATE - INTERVAL '4 days', 'YYYY-MM-DD') || 'T11:40:00Z'),
('bk-1003', 'Thomas Shelby', 'shelby@example.com', 'act-air-gun', 'Precision Air Gun Shooting', to_char(CURRENT_DATE - INTERVAL '3 days', 'YYYY-MM-DD'), '11:00 AM - 12:00 PM', 'package', '4x Marksman Elite (50 Shots)', 4, 140, 'paid', to_char(CURRENT_DATE - INTERVAL '3 days', 'YYYY-MM-DD') || 'T10:05:00Z'),
('bk-1004', 'David Beckham', 'david@example.com', 'act-horse-riding', 'Royal Horse Riding', to_char(CURRENT_DATE - INTERVAL '2 days', 'YYYY-MM-DD'), '03:00 PM - 04:00 PM', 'standard', '1x Adult', 1, 45, 'paid', to_char(CURRENT_DATE - INTERVAL '2 days', 'YYYY-MM-DD') || 'T14:30:00Z'),
('bk-1005', 'Clara Oswald', 'clara@example.com', 'act-go-karting', 'High-Octane Go-Karting', to_char(CURRENT_DATE - INTERVAL '2 days', 'YYYY-MM-DD'), '04:00 PM - 05:00 PM', 'package', '1x Single Rider Experience', 1, 20, 'paid', to_char(CURRENT_DATE - INTERVAL '2 days', 'YYYY-MM-DD') || 'T15:00:00Z'),
('bk-1006', 'Bruce Wayne', 'bruce@gotham.com', 'act-air-gun', 'Precision Air Gun Shooting', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD'), '01:00 PM - 02:00 PM', 'package', '3x Sharp Shooter (30 Shots)', 3, 75, 'paid', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD') || 'T12:00:00Z'),
('bk-1007', 'Diana Prince', 'diana@themyscira.gov', 'act-horse-riding', 'Royal Horse Riding', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD'), '09:00 AM - 10:00 AM', 'standard', '2x Adult', 2, 90, 'paid', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD') || 'T08:30:00Z'),
('bk-1008', 'Peter Parker', 'peter@dailybugle.com', 'act-go-karting', 'High-Octane Go-Karting', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD'), '05:00 PM - 06:00 PM', 'package', '2x Double Co-Pilot Ride', 2, 60, 'paid', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD') || 'T16:15:00Z'),
('bk-1009', 'John Watson', 'watson@baker.street', 'act-horse-riding', 'Royal Horse Riding', to_char(CURRENT_DATE, 'YYYY-MM-DD'), '02:00 PM - 03:00 PM', 'standard', '2x Adult, 2x Child', 4, 140, 'paid', to_char(CURRENT_DATE, 'YYYY-MM-DD') || 'T09:45:00Z'),
('bk-1010', 'Barry Allen', 'barry@ccpd.gov', 'act-go-karting', 'High-Octane Go-Karting', to_char(CURRENT_DATE, 'YYYY-MM-DD'), '03:00 PM - 04:00 PM', 'package', '1x Grand Prix Tournament', 1, 65, 'paid', to_char(CURRENT_DATE, 'YYYY-MM-DD') || 'T10:15:00Z');

-- Seed Tickets (corresponds to bookings above)
INSERT INTO "tickets" ("id", "bookingId", "customerName", "customerEmail", "activityId", "activityName", "date", "timeSlot", "ticketType", "quantity", "qrCodeValue", "status", "scannedAt", "scannedBy") VALUES
('tkt-bk-1001', 'bk-1001', 'Alex Mercer', 'alex@example.com', 'act-horse-riding', 'Royal Horse Riding', to_char(CURRENT_DATE - INTERVAL '5 days', 'YYYY-MM-DD'), '10:00 AM - 11:00 AM', '2x Adult, 1x Child', 3, 'adventure-park-ticket-bk-1001', 'used', to_char(CURRENT_DATE - INTERVAL '5 days', 'YYYY-MM-DD') || 'T10:30:00Z', 'Activity Ranger Smith'),
('tkt-bk-1002', 'bk-1002', 'Julia Roberts', 'julia@example.com', 'act-go-karting', 'High-Octane Go-Karting', to_char(CURRENT_DATE - INTERVAL '4 days', 'YYYY-MM-DD'), '02:00 PM - 03:00 PM', '2x Grand Prix Tournament', 2, 'adventure-park-ticket-bk-1002', 'used', to_char(CURRENT_DATE - INTERVAL '4 days', 'YYYY-MM-DD') || 'T10:30:00Z', 'Activity Ranger Smith'),
('tkt-bk-1003', 'bk-1003', 'Thomas Shelby', 'shelby@example.com', 'act-air-gun', 'Precision Air Gun Shooting', to_char(CURRENT_DATE - INTERVAL '3 days', 'YYYY-MM-DD'), '11:00 AM - 12:00 PM', '4x Marksman Elite (50 Shots)', 4, 'adventure-park-ticket-bk-1003', 'used', to_char(CURRENT_DATE - INTERVAL '3 days', 'YYYY-MM-DD') || 'T10:30:00Z', 'Activity Ranger Smith'),
('tkt-bk-1004', 'bk-1004', 'David Beckham', 'david@example.com', 'act-horse-riding', 'Royal Horse Riding', to_char(CURRENT_DATE - INTERVAL '2 days', 'YYYY-MM-DD'), '03:00 PM - 04:00 PM', '1x Adult', 1, 'adventure-park-ticket-bk-1004', 'used', to_char(CURRENT_DATE - INTERVAL '2 days', 'YYYY-MM-DD') || 'T10:30:00Z', 'Activity Ranger Smith'),
('tkt-bk-1005', 'bk-1005', 'Clara Oswald', 'clara@example.com', 'act-go-karting', 'High-Octane Go-Karting', to_char(CURRENT_DATE - INTERVAL '2 days', 'YYYY-MM-DD'), '04:00 PM - 05:00 PM', '1x Single Rider Experience', 1, 'adventure-park-ticket-bk-1005', 'used', to_char(CURRENT_DATE - INTERVAL '2 days', 'YYYY-MM-DD') || 'T10:30:00Z', 'Activity Ranger Smith'),
('tkt-bk-1006', 'bk-1006', 'Bruce Wayne', 'bruce@gotham.com', 'act-air-gun', 'Precision Air Gun Shooting', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD'), '01:00 PM - 02:00 PM', '3x Sharp Shooter (30 Shots)', 3, 'adventure-park-ticket-bk-1006', 'used', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD') || 'T10:30:00Z', 'Activity Ranger Smith'),
('tkt-bk-1007', 'bk-1007', 'Diana Prince', 'diana@themyscira.gov', 'act-horse-riding', 'Royal Horse Riding', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD'), '09:00 AM - 10:00 AM', '2x Adult', 2, 'adventure-park-ticket-bk-1007', 'used', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD') || 'T10:30:00Z', 'Activity Ranger Smith'),
('tkt-bk-1008', 'bk-1008', 'Peter Parker', 'peter@dailybugle.com', 'act-go-karting', 'High-Octane Go-Karting', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD'), '05:00 PM - 06:00 PM', '2x Double Co-Pilot Ride', 2, 'adventure-park-ticket-bk-1008', 'used', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD') || 'T10:30:00Z', 'Activity Ranger Smith'),
('tkt-bk-1009', 'bk-1009', 'John Watson', 'watson@baker.street', 'act-horse-riding', 'Royal Horse Riding', to_char(CURRENT_DATE, 'YYYY-MM-DD'), '02:00 PM - 03:00 PM', '2x Adult, 2x Child', 4, 'adventure-park-ticket-bk-1009', 'valid', NULL, NULL),
('tkt-bk-1010', 'bk-1010', 'Barry Allen', 'barry@ccpd.gov', 'act-go-karting', 'High-Octane Go-Karting', to_char(CURRENT_DATE, 'YYYY-MM-DD'), '03:00 PM - 04:00 PM', '1x Grand Prix Tournament', 1, 'adventure-park-ticket-bk-1010', 'valid', NULL, NULL);

-- Seed Food Orders
INSERT INTO "food_orders" ("id", "customerName", "customerEmail", "items", "totalAmount", "status", "paymentStatus", "createdAt") VALUES
('ord-5001', 'Alex Mercer', 'alex@example.com', '[{"id": "oi-1", "menuItemId": "menu-espresso", "name": "Double Shot Espresso", "price": 4.5, "quantity": 2, "vendorId": "vendor-forest-cafe", "vendorName": "The Forest Cafe"}, {"id": "oi-2", "menuItemId": "menu-croissant", "name": "Butter Croissant", "price": 3.5, "quantity": 2, "vendorId": "vendor-forest-cafe", "vendorName": "The Forest Cafe"}]'::jsonb, 16.0, 'delivered', 'paid', to_char(CURRENT_DATE - INTERVAL '5 days', 'YYYY-MM-DD') || 'T10:45:00Z'),
('ord-5002', 'Julia Roberts', 'julia@example.com', '[{"id": "oi-3", "menuItemId": "menu-burger", "name": "Double Smash Ranger Burger", "price": 12.5, "quantity": 2, "vendorId": "vendor-adventure-grill", "vendorName": "Adventure Grill"}, {"id": "oi-4", "menuItemId": "menu-fries", "name": "Loaded Truffle Fries", "price": 7.0, "quantity": 1, "vendorId": "vendor-adventure-grill", "vendorName": "Adventure Grill"}]'::jsonb, 32.0, 'delivered', 'paid', to_char(CURRENT_DATE - INTERVAL '4 days', 'YYYY-MM-DD') || 'T14:50:00Z'),
('ord-5003', 'Thomas Shelby', 'shelby@example.com', '[{"id": "oi-5", "menuItemId": "menu-pizza", "name": "Smoked Woodfire Pepperoni Pizza", "price": 15.0, "quantity": 1, "vendorId": "vendor-adventure-grill", "vendorName": "Adventure Grill"}, {"id": "oi-6", "menuItemId": "menu-juice-green", "name": "Wild Green Energy Smoothie", "price": 6.5, "quantity": 2, "vendorId": "vendor-citrus-splash", "vendorName": "Citrus Splash"}]'::jsonb, 28.0, 'delivered', 'paid', to_char(CURRENT_DATE - INTERVAL '3 days', 'YYYY-MM-DD') || 'T12:10:00Z'),
('ord-5004', 'Clara Oswald', 'clara@example.com', '[{"id": "oi-7", "menuItemId": "menu-ice-waffle", "name": "Campfire Waffle Sundae", "price": 8.5, "quantity": 2, "vendorId": "vendor-golden-scoop", "vendorName": "Golden Scoop"}]'::jsonb, 17.0, 'delivered', 'paid', to_char(CURRENT_DATE - INTERVAL '2 days', 'YYYY-MM-DD') || 'T16:15:00Z'),
('ord-5005', 'Bruce Wayne', 'bruce@gotham.com', '[{"id": "oi-8", "menuItemId": "menu-latte", "name": "Adventure Vanilla Latte", "price": 5.5, "quantity": 3, "vendorId": "vendor-forest-cafe", "vendorName": "The Forest Cafe"}, {"id": "oi-9", "menuItemId": "menu-croissant", "name": "Butter Croissant", "price": 3.5, "quantity": 3, "vendorId": "vendor-forest-cafe", "vendorName": "The Forest Cafe"}]'::jsonb, 27.0, 'delivered', 'paid', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD') || 'T13:20:00Z'),
('ord-5006', 'Diana Prince', 'diana@themyscira.gov', '[{"id": "oi-10", "menuItemId": "menu-burger", "name": "Double Smash Ranger Burger", "price": 12.5, "quantity": 1, "vendorId": "vendor-adventure-grill", "vendorName": "Adventure Grill"}, {"id": "oi-11", "menuItemId": "menu-shake-berry", "name": "Mountain Berry Blast Milkshake", "price": 7.5, "quantity": 1, "vendorId": "vendor-citrus-splash", "vendorName": "Citrus Splash"}]'::jsonb, 20.0, 'delivered', 'paid', to_char(CURRENT_DATE - INTERVAL '1 days', 'YYYY-MM-DD') || 'T10:15:00Z'),
('ord-5007', 'John Watson', 'watson@baker.street', '[{"id": "oi-12", "menuItemId": "menu-pizza", "name": "Smoked Woodfire Pepperoni Pizza", "price": 15.0, "quantity": 2, "vendorId": "vendor-adventure-grill", "vendorName": "Adventure Grill & Fast Food"}, {"id": "oi-13", "menuItemId": "menu-fries", "name": "Loaded Truffle Fries", "price": 7.0, "quantity": 2, "vendorId": "vendor-adventure-grill", "vendorName": "Adventure Grill & Fast Food"}]'::jsonb, 44.0, 'preparing', 'paid', to_char(CURRENT_DATE, 'YYYY-MM-DD') || 'T11:20:00Z'),
('ord-5008', 'Barry Allen', 'barry@ccpd.gov', '[{"id": "oi-14", "menuItemId": "menu-shake-berry", "name": "Mountain Berry Blast Milkshake", "price": 7.5, "quantity": 4, "vendorId": "vendor-citrus-splash", "vendorName": "Citrus Splash Juice Bar"}]'::jsonb, 30.0, 'pending', 'paid', to_char(CURRENT_DATE, 'YYYY-MM-DD') || 'T12:05:00Z');
