const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/context/AppContext.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(
  "import { supabase, isSupabaseConfigured } from '../lib/supabase';",
  "import { supabase, isSupabaseConfigured } from '../lib/supabase';\nimport { db } from '../db/db';\nimport { syncEngine, SyncStatus } from '../lib/syncEngine';\nimport { generateOfflineId } from '../lib/deviceSetup';"
);

// 2. Add AppContextProps sync state
content = content.replace(
  "  // Mutators - Activities",
  "  // Sync State\n  isOnline: boolean;\n  syncStatus: SyncStatus;\n  pendingSyncCount: number;\n\n  // Mutators - Activities"
);

// 3. Replace writeToSupabase definition
content = content.replace(
  /\/\/ Helper for fire-and-forget Supabase writes[\s\S]*?};\n/,
  `// Helper for offline-first Dexie writes & Sync Engine
const writeToLocalAndSync = (table: string, action: 'insert' | 'update' | 'delete', payload: any) => {
  try {
    if (action === 'insert' || action === 'update') {
      (db as any)[table].put(payload);
    } else if (action === 'delete') {
      (db as any)[table].delete(payload.id);
    }
    syncEngine.queueOperation(table, action, payload);
  } catch (err) {
    console.error(\`Failed to queue \${action} on \${table}\`, err);
  }
};\n`
);

// 4. Add Sync State to AppProvider
content = content.replace(
  "  const [currentUser, setCurrentUser] = useState<User | null>(null);",
  `  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Sync Status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const unsubscribe = syncEngine.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingSyncCount(count);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);`
);

// 5. Provide sync state in context
content = content.replace(
  "    <AppContext.Provider value={{",
  "    <AppContext.Provider value={{\n      isOnline,\n      syncStatus,\n      pendingSyncCount,"
);

// 6. Update loadDataFromSupabase
content = content.replace(
  "if (dbActivities && dbActivities.length > 0) setActivities(dbActivities);",
  "if (dbActivities && dbActivities.length > 0) { setActivities(dbActivities); db.activities.bulkPut(dbActivities); }"
).replace(
  "if (dbVendors && dbVendors.length > 0) setVendors(dbVendors);",
  "if (dbVendors && dbVendors.length > 0) { setVendors(dbVendors); db.vendors.bulkPut(dbVendors); }"
).replace(
  "if (dbMenuItems && dbMenuItems.length > 0) setMenuItems(dbMenuItems);",
  "if (dbMenuItems && dbMenuItems.length > 0) { setMenuItems(dbMenuItems); db.menuItems.bulkPut(dbMenuItems); }"
).replace(
  "if (dbInventory && dbInventory.length > 0) setInventory(dbInventory);",
  "if (dbInventory && dbInventory.length > 0) { setInventory(dbInventory); db.inventory.bulkPut(dbInventory); }"
).replace(
  "if (dbBookings && dbBookings.length > 0) setBookings(dbBookings);",
  "if (dbBookings && dbBookings.length > 0) { setBookings(dbBookings); db.bookings.bulkPut(dbBookings); }"
).replace(
  "if (dbTickets && dbTickets.length > 0) setTickets(dbTickets);",
  "if (dbTickets && dbTickets.length > 0) { setTickets(dbTickets); db.tickets.bulkPut(dbTickets); }"
).replace(
  "if (dbOrders && dbOrders.length > 0) setOrders(dbOrders);",
  "if (dbOrders && dbOrders.length > 0) { setOrders(dbOrders); db.orders.bulkPut(dbOrders); }"
).replace(
  "if (dbNotifications && dbNotifications.length > 0) setNotifications(dbNotifications);",
  "if (dbNotifications && dbNotifications.length > 0) { setNotifications(dbNotifications); db.notifications.bulkPut(dbNotifications); }"
).replace(
  "if (dbPayments && dbPayments.length > 0) setPayments(dbPayments);",
  "if (dbPayments && dbPayments.length > 0) { setPayments(dbPayments); db.payments.bulkPut(dbPayments); }"
).replace(
  "if (dbUsers && dbUsers.length > 0) setUsers(dbUsers);",
  "if (dbUsers && dbUsers.length > 0) { setUsers(dbUsers); db.users.bulkPut(dbUsers); }"
);

// 7. Regex replacements for writeToSupabase
const replacePatterns = [
  // insert([newLog])
  { pattern: /writeToSupabase\(\s*supabase!\.from\('notifications'\)\.insert\(\[newLog\]\),\s*'sendMockNotification'\s*\);/g, replace: "writeToLocalAndSync('notifications', 'insert', newLog);" },
  // insert([newAct])
  { pattern: /writeToSupabase\(\s*supabase!\.from\('activities'\)\.insert\(\[newAct\]\),\s*'addActivity'\s*\);/g, replace: "writeToLocalAndSync('activities', 'insert', newAct);" },
  // update(act)
  { pattern: /writeToSupabase\(\s*supabase!\.from\('activities'\)\.update\(act\)\.eq\('id',\s*act\.id\),\s*'updateActivity'\s*\);/g, replace: "writeToLocalAndSync('activities', 'update', act);" },
  // delete activity
  { pattern: /writeToSupabase\(\s*supabase!\.from\('activities'\)\.delete\(\)\.eq\('id',\s*id\),\s*'deleteActivity'\s*\);/g, replace: "writeToLocalAndSync('activities', 'delete', { id });" },
  
  // users
  { pattern: /writeToSupabase\(\s*supabase!\.from\('users'\)\.update\(\{\s*role\s*\}\)\.eq\('id',\s*userId\),\s*'updateUserRole'\s*\);/g, replace: "writeToLocalAndSync('users', 'update', { id: userId, role });" },
  { pattern: /writeToSupabase\(\s*supabase!\.from\('users'\)\.insert\(\[newUser\]\),\s*'addUser'\s*\);/g, replace: "writeToLocalAndSync('users', 'insert', newUser);" },

  // createBooking (Promise.all)
  { pattern: /writeToSupabase\(\s*Promise\.all\(\[\s*supabase!\.from\('bookings'\)\.insert\(\[newBooking\]\),\s*supabase!\.from\('tickets'\)\.insert\(\[newTicket\]\),\s*supabase!\.from\('payments'\)\.insert\(\[newPayment\]\)\s*\]\),\s*'createBooking'\s*\);/g, 
    replace: "writeToLocalAndSync('bookings', 'insert', newBooking);\n    writeToLocalAndSync('tickets', 'insert', newTicket);\n    writeToLocalAndSync('payments', 'insert', newPayment);" },
    
  // markBookingAsPaid
  { pattern: /writeToSupabase\(\s*supabase!\.from\('payments'\)\.update\(\{\s*status:\s*'success',\s*timestamp:\s*updatedPayment\.timestamp\s*\}\)\.eq\('id',\s*payment\.id\),\s*'updatePaymentStatus'\s*\);/g, replace: "writeToLocalAndSync('payments', 'update', updatedPayment);" },
  { pattern: /writeToSupabase\(\s*supabase!\.from\('bookings'\)\.update\(\{\s*paymentStatus:\s*'paid',\s*status:\s*'confirmed'\s*\}\)\.eq\('id',\s*bookingId\),\s*'updateBookingStatus'\s*\);/g, replace: "writeToLocalAndSync('bookings', 'update', updatedBooking);" },

  // scanTicket
  { pattern: /writeToSupabase\(\s*supabase!\.from\('tickets'\)\.update\(\{\s*status:\s*'used',\s*scannedAt:\s*updatedTicket\.scannedAt,\s*scannedBy:\s*staffName\s*\}\)\.eq\('id',\s*foundTicket\.id\),\s*'scanTicket'\s*\);/g, replace: "writeToLocalAndSync('tickets', 'update', updatedTicket);" },

  // vendors
  { pattern: /writeToSupabase\(\s*supabase!\.from\('food_vendors'\)\.insert\(\[newVendor\]\),\s*'addVendor'\s*\);/g, replace: "writeToLocalAndSync('vendors', 'insert', newVendor);" },
  { pattern: /writeToSupabase\(\s*supabase!\.from\('food_vendors'\)\.update\(v\)\.eq\('id',\s*v\.id\),\s*'updateVendor'\s*\);/g, replace: "writeToLocalAndSync('vendors', 'update', v);" },
  { pattern: /writeToSupabase\(\s*supabase!\.from\('food_vendors'\)\.delete\(\)\.eq\('id',\s*id\),\s*'deleteVendor'\s*\);/g, replace: "writeToLocalAndSync('vendors', 'delete', { id });" },

  // menu_items
  { pattern: /writeToSupabase\(\s*supabase!\.from\('menu_items'\)\.insert\(\[newItem\]\),\s*'addMenuItem'\s*\);/g, replace: "writeToLocalAndSync('menuItems', 'insert', newItem);" },
  { pattern: /writeToSupabase\(\s*supabase!\.from\('menu_items'\)\.update\(item\)\.eq\('id',\s*item\.id\),\s*'updateMenuItem'\s*\);/g, replace: "writeToLocalAndSync('menuItems', 'update', item);" },
  { pattern: /writeToSupabase\(\s*supabase!\.from\('menu_items'\)\.delete\(\)\.eq\('id',\s*id\),\s*'deleteMenuItem'\s*\);/g, replace: "writeToLocalAndSync('menuItems', 'delete', { id });" },

  // inventory
  { pattern: /writeToSupabase\(\s*supabase!\.from\('inventory'\)\.update\(\{\s*currentStock:\s*boundedStock\s*\}\)\.eq\('id',\s*id\),\s*'updateInventoryStock'\s*\);/g, replace: "writeToLocalAndSync('inventory', 'update', { id, currentStock: boundedStock });" },
  { pattern: /writeToSupabase\(\s*supabase!\.from\('inventory'\)\.insert\(\[newItem\]\),\s*'addInventoryItem'\s*\);/g, replace: "writeToLocalAndSync('inventory', 'insert', newItem);" },

  // food orders
  { pattern: /writeToSupabase\(\s*Promise\.all\(\[\s*supabase!\.from\('food_orders'\)\.insert\(\[newOrder\]\),\s*supabase!\.from\('payments'\)\.insert\(\[newPayment\]\)\s*\]\),\s*'submitFoodOrder'\s*\);/g, replace: "writeToLocalAndSync('orders', 'insert', newOrder);\n    writeToLocalAndSync('payments', 'insert', newPayment);" },
  { pattern: /writeToSupabase\(\s*supabase!\.from\('food_orders'\)\.update\(\{\s*status\s*\}\)\.eq\('id',\s*orderId\),\s*'updateOrderStatus'\s*\);/g, replace: "writeToLocalAndSync('orders', 'update', { id: orderId, status });" },
];

for (const { pattern, replace } of replacePatterns) {
  content = content.replace(pattern, replace);
}

// Update offline ID generation
content = content.replace(/const bookingId = \`bk-\${Math\.floor\(1000 \+ Math\.random\(\) \* 9000\)}\`;/g, "const bookingId = generateOfflineId('bk');");
content = content.replace(/const txId = \`tx-\${Math\.floor\(10000000 \+ Math\.random\(\) \* 90000000\)}\`;/g, "const txId = generateOfflineId('tx');");
content = content.replace(/const orderId = \`ord-\${Math\.floor\(5000 \+ Math\.random\(\) \* 5000\)}\`;/g, "const orderId = generateOfflineId('ord');");
content = content.replace(/id: \`cart-item-\${Date\.now\(\)}-\${Math\.floor\(Math\.random\(\)\*100\)}\`,/g, "id: generateOfflineId('cart-item'),");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated AppContext.tsx for Offline First architecture.');
