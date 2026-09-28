import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, 'config.json');

let config = {};
try {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.error('[backend] Failed to read config.json:', e);
}

const getSecret = (key, placeholder) => {
  return config[key] || process.env[key] || placeholder;
};

const app = express();
app.use(cors());

// Raw body needed for webhook signature verification
app.use('/api/razorpay/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const LIVE_KEY_ID = 'rzp_live_TYnsYBkCUZzRR3';
const LIVE_KEY_SECRET = 'o6uE9Rd6ucqEetOhsurGYWmF';

// Initialize razorpay instance dynamically
let razorpay = new Razorpay({
  key_id: getSecret('RAZORPAY_KEY_ID', LIVE_KEY_ID),
  key_secret: getSecret('RAZORPAY_KEY_SECRET', LIVE_KEY_SECRET),
});

// Idempotency store — prevents duplicate ticket generation for same Razorpay order
const processedOrders = new Set();

// ─── CREATE ORDER ─────────────────────────────────────────────────────────────
app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, bookingRef, applyServiceFee = true } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const baseAmount = Number(amount);
    // Razorpay standard service fee (2% gateway fee + 18% GST = 2.36%) collected from customer
    const serviceFee = applyServiceFee ? Math.round(baseAmount * 0.0236 * 100) / 100 : 0;
    const finalAmount = Math.round((baseAmount + serviceFee) * 100) / 100;
    const amountInPaise = Math.round(finalAmount * 100);

    const key_secret = getSecret('RAZORPAY_KEY_SECRET', LIVE_KEY_SECRET);
    const key_id = getSecret('RAZORPAY_KEY_ID', LIVE_KEY_ID);

    if (!key_secret || !key_id) {
      const mockOrder = {
        id: `order_mock_${Date.now()}`,
        entity: 'order',
        amount: amountInPaise,
        baseAmount,
        serviceFee,
        totalAmount: finalAmount,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        status: 'created',
        attempts: 0,
        notes: {
          bookingRef: bookingRef || '',
          baseAmount: String(baseAmount),
          serviceFee: String(serviceFee),
          source: 'deuce_adventure_park'
        },
        created_at: Math.floor(Date.now() / 1000)
      };
      return res.json(mockOrder);
    }

    const options = {
      amount: amountInPaise, // paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {
        bookingRef: bookingRef || '',
        baseAmount: String(baseAmount),
        serviceFee: String(serviceFee),
        source: 'deuce_adventure_park'
      }
    };

    const order = await razorpay.orders.create(options);
    if (!order) return res.status(500).json({ message: 'Could not create order' });

    res.json({
      ...order,
      baseAmount,
      serviceFee,
      totalAmount: finalAmount
    });
  } catch (error) {
    console.error('[create-order]', error);
    res.status(500).json({ message: 'Order creation failed', error: String(error) });
  }
});

// ─── VERIFY PAYMENT (frontend callback) ──────────────────────────────────────
app.post('/api/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment parameters' });
    }

    // Idempotency: return success immediately for already-processed orders
    if (processedOrders.has(razorpay_order_id)) {
      return res.status(200).json({ message: 'Payment already verified', alreadyProcessed: true });
    }

    const secret = getSecret('RAZORPAY_KEY_SECRET', 'placeholder_secret');
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', secret === 'placeholder_secret' ? '' : secret)
      .update(sign)
      .digest('hex');

    if (secret !== 'placeholder_secret' && razorpay_signature === expectedSign) {
      processedOrders.add(razorpay_order_id);
      return res.status(200).json({
        message: 'Payment verified successfully',
        razorpay_order_id,
        razorpay_payment_id
      });
    } else {
      // Allow mock verification when secret is not configured (dev/demo mode)
      if (!secret || secret === 'placeholder_secret') {
        console.warn('[verify] Skipping strict verification – RAZORPAY_KEY_SECRET not configured');
        processedOrders.add(razorpay_order_id);
        return res.status(200).json({
          message: 'Payment verified (demo mode)',
          razorpay_order_id,
          razorpay_payment_id
        });
      }
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('[verify]', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// ─── WEBHOOK (Razorpay server-to-server events) ───────────────────────────────
app.post('/api/razorpay/webhook', (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const signature = req.headers['x-razorpay-signature'];

    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body) // raw buffer
        .digest('hex');

      if (signature !== expectedSig) {
        console.warn('[webhook] Signature mismatch – possible spoofed request');
        return res.status(400).json({ status: 'invalid_signature' });
      }
    }

    const event = JSON.parse(req.body.toString());
    console.log('[webhook] Event received:', event.event);

    switch (event.event) {
      case 'payment.captured': {
        const orderId = event.payload?.payment?.entity?.order_id;
        const paymentId = event.payload?.payment?.entity?.id;
        if (orderId) processedOrders.add(orderId);
        console.log(`[webhook] Payment captured – order: ${orderId}, payment: ${paymentId}`);
        break;
      }
      case 'payment.failed': {
        const orderId = event.payload?.payment?.entity?.order_id;
        console.log(`[webhook] Payment failed – order: ${orderId}`);
        break;
      }
      default:
        console.log(`[webhook] Unhandled event: ${event.event}`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[webhook]', error);
    res.status(500).json({ message: 'Webhook processing error' });
  }
});

// ─── COUNTER UPI ID (read dynamically from config/env, no secret exposed) ────
app.get('/api/config/upi-id', (req, res) => {
  res.json({
    upiId: getSecret('COUNTER_UPI_ID', ''),
    businessName: getSecret('BUSINESS_NAME', 'Deuce Park, Yelagiri'),
    currency: getSecret('CURRENCY', 'INR')
  });
});

// ─── SECURE GATEWAY & POS CONFIGURATION ──────────────────────────────────────
app.get('/api/config/payment', (req, res) => {
  const keyId = getSecret('RAZORPAY_KEY_ID', 'rzp_test_placeholder');
  const keySecret = getSecret('RAZORPAY_KEY_SECRET', 'placeholder_secret');
  const upiId = getSecret('COUNTER_UPI_ID', '');
  const businessName = getSecret('BUSINESS_NAME', 'Deuce Adventure Park');
  const posProvider = getSecret('POS_PROVIDER', 'mock_pos');
  const posTerminalName = getSecret('POS_TERMINAL_NAME', 'Deuce POS Terminal 1');
  const posTerminalId = getSecret('POS_TERMINAL_ID', 'POS-TERM-001');
  const enabledMethods = getSecret('ENABLED_METHODS', 'CASH,UPI,QR_CODE,CARD');

  res.json({
    razorpayKeyId: keyId,
    razorpayKeySecret: keySecret && keySecret !== 'placeholder_secret' ? '••••••••' : '',
    counterUpiId: upiId,
    businessName,
    posProvider,
    posTerminalName,
    posTerminalId,
    enabledMethods
  });
});

app.post('/api/config/payment', (req, res) => {
  try {
    const { 
      razorpayKeyId, 
      razorpayKeySecret, 
      counterUpiId, 
      businessName, 
      posProvider, 
      posTerminalName, 
      posTerminalId,
      enabledMethods 
    } = req.body;

    let currentConfig = {};
    if (fs.existsSync(configPath)) {
      currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    if (razorpayKeyId !== undefined) currentConfig.RAZORPAY_KEY_ID = razorpayKeyId;
    if (razorpayKeySecret !== undefined && razorpayKeySecret !== '••••••••' && razorpayKeySecret !== '') {
      currentConfig.RAZORPAY_KEY_SECRET = razorpayKeySecret;
    }
    if (counterUpiId !== undefined) currentConfig.COUNTER_UPI_ID = counterUpiId;
    if (businessName !== undefined) currentConfig.BUSINESS_NAME = businessName;
    if (posProvider !== undefined) currentConfig.POS_PROVIDER = posProvider;
    if (posTerminalName !== undefined) currentConfig.POS_TERMINAL_NAME = posTerminalName;
    if (posTerminalId !== undefined) currentConfig.POS_TERMINAL_ID = posTerminalId;
    if (enabledMethods !== undefined) currentConfig.ENABLED_METHODS = enabledMethods;

    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');
    config = currentConfig; // Update in-memory configuration cache

    // Re-initialize Razorpay instance dynamically
    const newKeyId = getSecret('RAZORPAY_KEY_ID', 'rzp_test_placeholder');
    const newKeySecret = getSecret('RAZORPAY_KEY_SECRET', 'placeholder_secret');

    razorpay = new Razorpay({
      key_id: newKeyId,
      key_secret: newKeySecret,
    });

    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('[config-update]', error);
    res.status(500).json({ message: 'Failed to update configuration', error: String(error) });
  }
});

// ─── PHYSICAL POS TERMINAL API ───────────────────────────────────────────────
app.get('/api/pos/status', async (req, res) => {
  const terminalId = getSecret('POS_TERMINAL_ID', '');
  const provider = getSecret('POS_PROVIDER', 'mock_pos');

  if (!terminalId) {
    return res.json({ status: 'Disconnected', message: 'No terminal configured' });
  }

  if (provider === 'mock_pos') {
    return res.json({ status: 'Connected', terminalId, providerName: 'Mock Terminal' });
  }

  if (provider === 'razorpay_pos') {
    try {
      // Mocking or invoking Razorpay POS endpoint if keys are active
      const secret = getSecret('RAZORPAY_KEY_SECRET', 'placeholder_secret');
      if (!secret || secret === 'placeholder_secret') {
        return res.json({ status: 'Connected', terminalId, providerName: 'Razorpay POS (Demo Mode)' });
      }
      // Actual Razorpay GET /v1/terminals/:id
      const terminal = await razorpay.terminals.fetch(terminalId);
      return res.json({
        status: terminal.status === 'active' ? 'Connected' : 'Disconnected',
        terminalId,
        providerName: 'Razorpay POS'
      });
    } catch (err) {
      return res.json({ status: 'Disconnected', error: String(err) });
    }
  }

  res.json({ status: 'Disconnected' });
});

app.post('/api/pos/charge', async (req, res) => {
  try {
    const { amount, referenceId, terminalId, paymentOption } = req.body;
    const provider = getSecret('POS_PROVIDER', 'mock_pos');

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid charge amount' });
    }

    if (provider === 'mock_pos') {
      // Simulate POS terminal processing delay (4s)
      await new Promise(r => setTimeout(r, 4000));

      // Mock a decline if the amount ends in .99
      const endsIn99 = amount.toFixed(2).endsWith('.99');
      if (endsIn99) {
        return res.status(400).json({
          status: 'Failed',
          failureReason: 'Card Declined: Insufficient Funds',
          transactionId: `txn_mock_${Date.now()}`
        });
      }

      return res.json({
        status: 'Paid',
        transactionId: `txn_mock_${Date.now()}`,
        paidAt: new Date().toISOString(),
        method: paymentOption || 'card'
      });
    }

    if (provider === 'razorpay_pos') {
      // In Demo Mode, simulate approval
      const secret = getSecret('RAZORPAY_KEY_SECRET', 'placeholder_secret');
      if (!secret || secret === 'placeholder_secret') {
        await new Promise(r => setTimeout(r, 3000));
        return res.json({
          status: 'Paid',
          transactionId: `txn_rzp_mock_${Date.now()}`,
          paidAt: new Date().toISOString(),
          method: paymentOption || 'card'
        });
      }

      // Live Razorpay POS Smart Collect
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: referenceId,
        payment_capture: 1,
        notes: { bookingRef: referenceId, terminal_id: terminalId }
      });

      return res.json({
        status: 'Pending',
        razorpayOrderId: order.id,
        referenceId: referenceId
      });
    }

    res.status(400).json({ message: 'Invalid POS configuration provider' });
  } catch (error) {
    console.error('[pos-charge]', error);
    res.status(500).json({ message: 'POS transaction failed', error: String(error) });
  }
});

app.get('/api/pos/check-payment/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;
    const provider = getSecret('POS_PROVIDER', 'mock_pos');

    if (provider === 'mock_pos') {
      return res.json({ status: 'Paid', transactionId: `txn_mock_${Date.now()}` });
    }

    if (provider === 'razorpay_pos') {
      const secret = getSecret('RAZORPAY_KEY_SECRET', 'placeholder_secret');
      if (!secret || secret === 'placeholder_secret') {
        return res.json({ status: 'Paid', transactionId: `txn_rzp_mock_${Date.now()}` });
      }

      // Query actual payments matching this reference ID
      const payments = await razorpay.payments.all({ count: 10 });
      const matched = payments.items.find(p => p.notes?.bookingRef === referenceId && p.status === 'captured');

      if (matched) {
        return res.json({
          status: 'Paid',
          transactionId: matched.id,
          razorpayPaymentId: matched.id,
          razorpayOrderId: matched.order_id
        });
      }

      return res.json({ status: 'Pending' });
    }

    res.status(400).json({ message: 'Invalid POS Provider' });
  } catch (error) {
    console.error('[pos-check]', error);
    res.status(500).json({ message: 'Verification lookup failed' });
  }
});

// ─── GATEWAY UPI / QR POLLING VERIFICATION ────────────────────────────────────
app.get('/api/razorpay/check-payment/:bookingRef', async (req, res) => {
  try {
    const { bookingRef } = req.params;
    const secret = getSecret('RAZORPAY_KEY_SECRET', 'placeholder_secret');
    const keyId = getSecret('RAZORPAY_KEY_ID', 'rzp_test_placeholder');

    // In demo/test mode, auto-approve polling (no real Razorpay keys configured)
    if (!secret || secret === 'placeholder_secret' || !keyId || keyId.includes('placeholder')) {
      return res.json({
        status: 'Paid',
        razorpayPaymentId: `pay_mock_${Date.now()}`,
        razorpayOrderId: `order_mock_${Date.now()}`,
        amount: 500,
        method: 'upi'
      });
    }

    // Search last 20 payments for notes containing the bookingRef
    const paymentsList = await razorpay.payments.all({ count: 20 });
    const matchedPayment = paymentsList?.items?.find(
      p => p.notes?.bookingRef === bookingRef && p.status === 'captured'
    );

    if (matchedPayment) {
      if (matchedPayment.order_id) {
        processedOrders.add(matchedPayment.order_id);
      }
      return res.json({
        status: 'Paid',
        razorpayPaymentId: matchedPayment.id,
        razorpayOrderId: matchedPayment.order_id,
        amount: matchedPayment.amount / 100,
        method: matchedPayment.method
      });
    }

    res.json({ status: 'Pending' });
  } catch (error) {
    console.error('[gateway-check]', error);
    res.status(500).json({ message: 'Lookup error', error: String(error) });
  }
});

// ─── RECONCILIATION API ──────────────────────────────────────────────────────
app.get('/api/razorpay/payments', async (req, res) => {
  try {
    const secret = getSecret('RAZORPAY_KEY_SECRET', 'placeholder_secret');
    if (!secret || secret === 'placeholder_secret') {
      // Return list of mock payments for reconciliation testing in sandbox/demo
      return res.json([
        { id: 'pay_mock_1', amount: 50000, currency: 'INR', status: 'captured', method: 'upi', created_at: Math.floor(Date.now()/1000) - 3600, notes: { bookingRef: 'bk-1009' } },
        { id: 'pay_mock_2', amount: 150000, currency: 'INR', status: 'captured', method: 'card', created_at: Math.floor(Date.now()/1000) - 7200, notes: { bookingRef: 'bk-1002' } },
        { id: 'pay_mock_3', amount: 9900, currency: 'INR', status: 'failed', method: 'card', created_at: Math.floor(Date.now()/1000) - 10800, notes: { bookingRef: 'bk-1005' } }
      ]);
    }

    const list = await razorpay.payments.all({ count: 50 });
    res.json(list.items || []);
  } catch (error) {
    console.error('[reconcile-gateway]', error);
    res.status(500).json({ message: 'Failed to fetch gateway transactions' });
  }
});

// ─── DOMAIN STORES PERSISTENCE ─────────────────────────────────────────
const createJsonStore = (filename, defaultVal = []) => {
  const filePath = path.join(__dirname, filename);
  const tmpPath = path.join('/tmp', filename);
  let memoryCache = null;
  return {
    get: () => {
      if (memoryCache && memoryCache.length > 0) return memoryCache;
      try {
        if (fs.existsSync(filePath)) {
          memoryCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return memoryCache;
        }
        if (fs.existsSync(tmpPath)) {
          memoryCache = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
          return memoryCache;
        }
      } catch (e) {
        console.error(`[backend] Failed reading ${filename}:`, e);
      }
      return defaultVal;
    },
    set: (data) => {
      if (!Array.isArray(data)) return false;
      memoryCache = data;
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      } catch (e) {}
      try {
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
      } catch (e) {}
      return true;
    }
  };
};

const menuItemsStore = createJsonStore('menu_items_store.json', []);
const vendorsStore = createJsonStore('vendors_store.json', []);
const inventoryStore = createJsonStore('inventory_store.json', []);
const usersStore = createJsonStore('users_store.json', []);
const bookingsStore = createJsonStore('bookings_store.json', []);
const ticketsStore = createJsonStore('tickets_store.json', []);
const paymentsStore = createJsonStore('payments_store.json', []);
const ordersStore = createJsonStore('orders_store.json', []);
const notificationsStore = createJsonStore('notifications_store.json', []);
const kartsStore = createJsonStore('karts_store.json', []);
const sessionsStore = createJsonStore('sessions_store.json', []);
const waiversStore = createJsonStore('waivers_store.json', []);

app.get('/api/menu-items', (req, res) => res.json(menuItemsStore.get()));
app.post('/api/menu-items', (req, res) => {
  if (menuItemsStore.set(req.body)) return res.json({ success: true });
  res.status(400).json({ success: false });
});

app.get('/api/vendors', (req, res) => res.json(vendorsStore.get()));
app.post('/api/vendors', (req, res) => {
  if (vendorsStore.set(req.body)) return res.json({ success: true });
  res.status(400).json({ success: false });
});

app.get('/api/inventory', (req, res) => res.json(inventoryStore.get()));
app.post('/api/inventory', (req, res) => {
  if (inventoryStore.set(req.body)) return res.json({ success: true });
  res.status(400).json({ success: false });
});

app.get('/api/users', (req, res) => res.json(usersStore.get()));
app.post('/api/users', (req, res) => {
  if (usersStore.set(req.body)) return res.json({ success: true });
  res.status(400).json({ success: false });
});

app.get('/api/bookings', (req, res) => res.json(bookingsStore.get()));
app.post('/api/bookings', (req, res) => {
  if (bookingsStore.set(req.body)) return res.json({ success: true });
  res.status(400).json({ success: false });
});

app.get('/api/tickets', (req, res) => res.json(ticketsStore.get()));
app.post('/api/tickets', (req, res) => {
  if (ticketsStore.set(req.body)) return res.json({ success: true });
  res.status(400).json({ success: false });
});

app.get('/api/park-payments', (req, res) => res.json(paymentsStore.get()));
app.post('/api/park-payments', (req, res) => {
  if (paymentsStore.set(req.body)) return res.json({ success: true });
  res.status(400).json({ success: false });
});

app.get('/api/orders', (req, res) => res.json(ordersStore.get()));
app.post('/api/orders', (req, res) => {
  if (ordersStore.set(req.body)) return res.json({ success: true });
  res.status(400).json({ success: false });
});

app.get('/api/notifications', (req, res) => res.json(notificationsStore.get()));
app.post('/api/notifications', (req, res) => {
  if (notificationsStore.set(req.body)) return res.json({ success: true });
  res.status(400).json({ success: false });
});

// ─── ACTIVITIES BACKEND PERSISTENCE ─────────────────────────────────────────
const persistentActivitiesFile = path.join(__dirname, 'activities_store.json');
const tmpActivitiesPath = path.join('/tmp', 'activities.json');
let inMemoryActivities = null;

const getActivitiesHelper = () => {
  try {
    let acts = inMemoryActivities;
    if (!acts && fs.existsSync(persistentActivitiesFile)) {
      acts = JSON.parse(fs.readFileSync(persistentActivitiesFile, 'utf8'));
    }
    if (!acts && fs.existsSync(tmpActivitiesPath)) {
      acts = JSON.parse(fs.readFileSync(tmpActivitiesPath, 'utf8'));
    }
    if (Array.isArray(acts) && acts.length > 0) {
      inMemoryActivities = acts;
      return acts;
    }
  } catch (e) {
    console.error('[backend] Failed to read activities file:', e);
  }
  return [];
};

app.get('/api/activities', (req, res) => {
  res.json(getActivitiesHelper());
});

app.post('/api/activities', (req, res) => {
  try {
    const activities = req.body;
    if (Array.isArray(activities) && activities.length > 0) {
      for (const act of activities) {
        if (Array.isArray(act.packages)) {
          for (const pkg of act.packages) {
            if (!pkg.name || typeof pkg.name !== 'string' || !pkg.name.trim()) {
              return res.status(400).json({ success: false, message: `Package name is required for activity ${act.name || act.id}` });
            }
            if (typeof pkg.price !== 'number' || !Number.isFinite(pkg.price) || pkg.price < 0) {
              return res.status(400).json({ success: false, message: `Invalid package price (${pkg.price}) for ${pkg.name}` });
            }
          }
        }
      }
      inMemoryActivities = activities;
      try {
        fs.writeFileSync(persistentActivitiesFile, JSON.stringify(activities, null, 2), 'utf8');
      } catch (err) {
        console.warn('[backend] Could not write persistent activities store:', err);
      }
      try {
        fs.writeFileSync(tmpActivitiesPath, JSON.stringify(activities, null, 2), 'utf8');
      } catch (err) {
        console.warn('[backend] Could not write activities to /tmp:', err);
      }
      return res.json({ success: true, count: activities.length });
    }
    res.status(400).json({ success: false, message: 'Expected array of activities' });
  } catch (e) {
    console.error('[backend] Failed to save activities:', e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

// ─── UNIFIED CLOUD & OFFLINE REALTIME SYNC API ──────────────────────────────
app.get('/api/sync/all', (req, res) => {
  res.json({
    bookings: bookingsStore.get(),
    tickets: ticketsStore.get(),
    payments: paymentsStore.get(),
    orders: ordersStore.get(),
    notifications: notificationsStore.get(),
    users: usersStore.get(),
    activities: getActivitiesHelper(),
    menuItems: menuItemsStore.get(),
    vendors: vendorsStore.get(),
    inventory: inventoryStore.get(),
    karts: kartsStore.get(),
    sessions: sessionsStore.get(),
    waivers: waiversStore.get(),
    serverTime: new Date().toISOString()
  });
});

app.post('/api/sync/batch', (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Expected items array' });
    }

    const storesMap = {
      'bookings': bookingsStore,
      'tickets': ticketsStore,
      'payments': paymentsStore,
      'food_orders': ordersStore,
      'orders': ordersStore,
      'notifications': notificationsStore,
      'users': usersStore,
      'karts': kartsStore,
      'sessions': sessionsStore,
      'waivers': waiversStore,
      'menu_items': menuItemsStore,
      'menuItems': menuItemsStore,
      'food_vendors': vendorsStore,
      'vendors': vendorsStore,
      'inventory': inventoryStore
    };

    let processedCount = 0;
    for (const item of items) {
      const { table, action, payload } = item;
      const targetStore = storesMap[table];
      if (!targetStore || !payload || !payload.id) continue;

      let currentList = targetStore.get();
      if (!Array.isArray(currentList)) currentList = [];

      if (action === 'insert') {
        const existingIdx = currentList.findIndex(x => x.id === payload.id);
        if (existingIdx >= 0) {
          currentList[existingIdx] = { ...currentList[existingIdx], ...payload };
        } else {
          currentList.unshift(payload);
        }
      } else if (action === 'update') {
        const existingIdx = currentList.findIndex(x => x.id === payload.id);
        if (existingIdx >= 0) {
          currentList[existingIdx] = { ...currentList[existingIdx], ...payload };
        } else {
          currentList.unshift(payload);
        }
      } else if (action === 'delete') {
        currentList = currentList.filter(x => x.id !== payload.id);
      }
      targetStore.set(currentList);
      processedCount++;
    }

    res.json({ success: true, processedCount, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error('[sync-batch error]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

if (fs.existsSync(distPath)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`[server] Listening on port ${PORT}`));
}

export default app;

