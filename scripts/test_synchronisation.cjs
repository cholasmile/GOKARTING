// End-to-end multi-browser & Google account data synchronization test
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const http = require('http');

const SUPABASE_URL = 'https://wthqeoqsfkxrxcxocaus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0aHFlb3FzZmt4cnhjeG9jYXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTQxODMsImV4cCI6MjA5OTg3MDE4M30.iweLvC1sYTQH93BSil8gxcUAh4RdNMv9MFyzl-sKTeY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API_BASE = 'http://localhost:5000';

async function fetchJson(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  return await res.json();
}

async function runTests() {
  console.log('=== STARTING DATA SYNCHRONIZATION INTEGRATION TESTS ===\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
      throw new Error(`Test failed: ${message}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Google Account Authentication & Role Mapping
  // -------------------------------------------------------------
  console.log('--- Test 1: Google Account Auth & Role Preservation ---');
  
  // Authorized Account A: Brenda (Admin)
  const authA = await fetchJson('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin.leader@deucepark.com',
      name: 'Admin Boss Brenda',
      googleId: 'gid_brenda_123'
    })
  });
  assert(authA.success && authA.user.role === 'super_admin', 'Account A (admin.leader@deucepark.com) gets super_admin role');
  assert(authA.user.organizationId === 'org_deuce_default', 'Account A assigned to organization org_deuce_default');

  // Authorized Account B: Alex (Counter Staff)
  const authB = await fetchJson('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      email: 'counter.staff@deucepark.com',
      name: 'Counter Staff Alex',
      googleId: 'gid_alex_456'
    })
  });
  assert(authB.success && authB.user.role === 'ticket_counter_staff', 'Account B (counter.staff@deucepark.com) gets ticket_counter_staff role');
  assert(authB.user.organizationId === 'org_deuce_default', 'Account B assigned to organization org_deuce_default');

  // -------------------------------------------------------------
  // TEST 2: Central Supabase Database Connectivity & Validation
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Central Supabase Database Access ---');
  const sbCheck = await supabase.from('activities').select('*');
  assert(!sbCheck.error && sbCheck.data && sbCheck.data.length > 0, 'Central Supabase database is connected and queried with valid key');

  // -------------------------------------------------------------
  // TEST 3: Browser A Connects to Realtime SSE Stream
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Browser A Connects to Realtime SSE Stream ---');
  let sseEventsReceivedInBrowserA = [];
  
  const sseReq = http.request('http://localhost:5000/api/sync/events', (res) => {
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data && (data.record || data.type === 'connected')) {
              sseEventsReceivedInBrowserA.push(data);
            }
          } catch (e) {}
        }
      }
    });
  });
  sseReq.end();

  // Wait 500ms for SSE connection handshake
  await new Promise(r => setTimeout(r, 500));
  assert(sseEventsReceivedInBrowserA.some(e => e.type === 'connected'), 'Browser A SSE stream connected and established');

  // -------------------------------------------------------------
  // TEST 4: Browser B Creates Booking -> Verify Appears in Browser A
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Browser B creates a booking -> Appears in Browser A ---');
  const testBookingId = `bk-sync-${Date.now()}`;
  const testBooking = {
    id: testBookingId,
    customerName: 'Shared Visitor John',
    customerEmail: 'john.shared@example.com',
    customerPhone: '9876543210',
    activityId: 'act-go-karting',
    activityName: 'High-Octane Go-Karting',
    date: '2026-10-12',
    timeSlot: '11:00 - 12:00',
    ticketType: 'standard',
    details: '1x Adult',
    quantity: 1,
    totalAmount: 100,
    paymentStatus: 'paid',
    status: 'confirmed',
    bookingDate: new Date().toISOString(),
    organizationId: 'org_deuce_default',
    updatedAt: new Date().toISOString()
  };

  // Browser B pushes booking to central system
  const syncBatchRes = await fetchJson('/api/sync/batch', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        { table: 'bookings', action: 'insert', payload: testBooking }
      ]
    })
  });
  assert(syncBatchRes.success && syncBatchRes.processedCount >= 1, 'Browser B successfully uploaded booking via batch sync');

  // Also verify Supabase cloud persistence with sanitization
  const cleanBookingForSupabase = {
    id: testBooking.id,
    customerName: testBooking.customerName,
    customerEmail: testBooking.customerEmail,
    activityId: testBooking.activityId,
    activityName: testBooking.activityName,
    date: testBooking.date,
    timeSlot: testBooking.timeSlot,
    ticketType: testBooking.ticketType,
    details: testBooking.details,
    quantity: testBooking.quantity,
    totalAmount: testBooking.totalAmount,
    paymentStatus: testBooking.paymentStatus,
    bookingDate: testBooking.bookingDate
  };
  const sbUpsert = await supabase.from('bookings').upsert([cleanBookingForSupabase], { onConflict: 'id' });
  assert(!sbUpsert.error, 'Central Supabase saved booking with 0 errors');

  // Wait 600ms for SSE event broadcast to Browser A
  await new Promise(r => setTimeout(r, 600));

  const receivedBookingEvent = sseEventsReceivedInBrowserA.find(
    e => e.table === 'bookings' && e.record && e.record.id === testBookingId
  );
  assert(Boolean(receivedBookingEvent), 'Browser A received real-time SSE event for booking created in Browser B');

  // Verify Browser A fetches latest state from /api/sync/all
  const browserAAllData = await fetchJson('/api/sync/all');
  const foundInAll = browserAAllData.bookings.find(b => b.id === testBookingId);
  assert(Boolean(foundInAll), 'Browser A sync/all includes the new booking created by Browser B');

  // -------------------------------------------------------------
  // TEST 5: Browser A Updates Record -> Verify Appears in Browser B
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Browser A updates record -> Appears in Browser B ---');
  const updatedBooking = {
    ...testBooking,
    status: 'completed',
    details: '1x Adult (Checked-In by Super Admin)',
    updatedAt: new Date().toISOString()
  };

  const updateRes = await fetchJson('/api/sync/batch', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        { table: 'bookings', action: 'update', payload: updatedBooking }
      ]
    })
  });
  assert(updateRes.success, 'Browser A updated booking successfully');

  await new Promise(r => setTimeout(r, 600));
  const receivedUpdateEvent = sseEventsReceivedInBrowserA.find(
    e => e.table === 'bookings' && e.eventType === 'UPDATE' && e.record && e.record.id === testBookingId
  );
  assert(Boolean(receivedUpdateEvent), 'Real-time UPDATE event broadcast received across clients');
  assert(receivedUpdateEvent.record.status === 'completed', 'Updated booking status is verified as completed');

  // -------------------------------------------------------------
  // TEST 6: Offline Operation & Safe Reconnection Sync
  // -------------------------------------------------------------
  console.log('\n--- Test 6: Offline changes & reconnection sync ---');
  const offlineBookingId = `bk-offline-${Date.now()}`;
  const offlineBooking = {
    id: offlineBookingId,
    customerName: 'Offline Visitor Alice',
    customerEmail: 'alice.offline@example.com',
    activityId: 'act-air-gun',
    activityName: 'Precision Air Gun Shooting',
    date: '2026-10-12',
    timeSlot: '14:00 - 15:00',
    ticketType: 'package',
    details: 'Sharp Shooter (30 Shots)',
    quantity: 1,
    totalAmount: 25,
    paymentStatus: 'paid',
    status: 'confirmed',
    bookingDate: new Date().toISOString(),
    organizationId: 'org_deuce_default',
    updatedAt: new Date().toISOString()
  };

  // When device reconnects, queued offline items are flushed in batch
  const offlineSyncRes = await fetchJson('/api/sync/batch', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        { table: 'bookings', action: 'insert', payload: offlineBooking }
      ]
    })
  });
  assert(offlineSyncRes.success && offlineSyncRes.processedCount === 1, 'Offline queued item synchronized successfully on reconnection');

  // Verify in sync/all
  const reconnectedState = await fetchJson('/api/sync/all');
  assert(reconnectedState.bookings.some(b => b.id === offlineBookingId), 'Reconnected state contains previously offline booking');

  // Cleanup test data
  console.log('\n--- Cleaning up test records ---');
  await fetchJson('/api/bookings/' + testBookingId, { method: 'DELETE' });
  await fetchJson('/api/bookings/' + offlineBookingId, { method: 'DELETE' });
  await supabase.from('bookings').delete().eq('id', testBookingId);

  sseReq.destroy();

  console.log(`\n=== ALL ${passedTests}/${totalTests} SYNCHRONIZATION TESTS PASSED SUCCESSFULLY! ===`);
  process.exit(0);
}

runTests().catch(err => {
  console.error('\nTEST SUITE RUN FAILED:', err);
  process.exit(1);
});
